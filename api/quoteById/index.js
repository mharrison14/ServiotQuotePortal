const { app } = require("@azure/functions");

app.http("quoteById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "quotes/{id:int}",
  handler: async (request, context) => {
    const principalHeader = request.headers.get("x-ms-client-principal");

    if (!principalHeader) {
      return {
        status: 401,
        jsonBody: { error: "Not authenticated" }
      };
    }

    let principal;
    try {
      const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
      principal = JSON.parse(decoded);
    } catch (err) {
      return {
        status: 400,
        jsonBody: { error: "Invalid principal header" }
      };
    }

    try {
      const sql = require("mssql");
      const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);

      const quoteId = parseInt(request.params.id, 10);
      if (!quoteId) {
        return {
          status: 400,
          jsonBody: { error: "Invalid quote id" }
        };
      }

      const entraUserId = principal.userId;

      const userResult = await pool.request()
        .input("EntraUserId", sql.NVarChar(200), entraUserId)
        .query(`
          SELECT TOP 1
            u.UserId,
            u.Email,
            u.DisplayName
          FROM Users u
          WHERE u.EntraUserId = @EntraUserId
        `);

      if (userResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "User not found in app database" }
        };
      }

      const user = userResult.recordset[0];

      const rolesResult = await pool.request()
        .input("UserId", sql.Int, user.UserId)
        .query(`
          SELECT r.RoleName
          FROM UserRoles ur
          JOIN Roles r ON r.RoleId = ur.RoleId
          WHERE ur.UserId = @UserId
        `);

      const roleNames = rolesResult.recordset.map(r => r.RoleName);
      const isEmployee = roleNames.includes("admin") || roleNames.includes("employee");
      const isCustomer = roleNames.includes("customer");

      let quoteResult;

      if (isEmployee) {
        quoteResult = await pool.request()
          .input("QuoteId", sql.Int, quoteId)
          .query(`
            SELECT
              q.QuoteId,
              q.QuoteNumber,
              q.CustomerAccountId,
              ca.AccountName,
              q.CreatedByUserId,
              q.AssignedToUserId,
              q.StatusId,
              qs.StatusName,
              q.CreatedUtc,
              q.ModifiedUtc
            FROM Quotes q
            LEFT JOIN CustomerAccounts ca
              ON ca.CustomerAccountId = q.CustomerAccountId
            JOIN QuoteStatuses qs
              ON qs.StatusId = q.StatusId
            WHERE q.QuoteId = @QuoteId
          `);
      } else if (isCustomer) {
        quoteResult = await pool.request()
          .input("QuoteId", sql.Int, quoteId)
          .input("UserId", sql.Int, user.UserId)
          .query(`
            SELECT
              q.QuoteId,
              q.QuoteNumber,
              q.CustomerAccountId,
              ca.AccountName,
              q.CreatedByUserId,
              q.AssignedToUserId,
              q.StatusId,
              qs.StatusName,
              q.CreatedUtc,
              q.ModifiedUtc
            FROM Quotes q
            LEFT JOIN CustomerAccounts ca
              ON ca.CustomerAccountId = q.CustomerAccountId
            JOIN QuoteStatuses qs
              ON qs.StatusId = q.StatusId
            JOIN CustomerAccountUsers cau
              ON cau.CustomerAccountId = q.CustomerAccountId
            WHERE q.QuoteId = @QuoteId
              AND cau.UserId = @UserId
          `);
      } else {
        return {
          status: 403,
          jsonBody: { error: "User has no valid quote access role" }
        };
      }

      if (quoteResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "Quote not found" }
        };
      }

      const quote = quoteResult.recordset[0];

      const itemsResult = await pool.request()
        .input("QuoteId", sql.Int, quoteId)
        .query(`
          SELECT
            QuoteItemId,
            QuoteId,
            PartNumber,
            Description,
            Qty,
            UnitPrice,
            SortOrder
          FROM QuoteItems
          WHERE QuoteId = @QuoteId
          ORDER BY SortOrder, QuoteItemId
        `);

      return {
        status: 200,
        jsonBody: {
          quote,
          items: itemsResult.recordset
        }
      };
    } catch (err) {
      context.log("QUOTE BY ID API ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Quote by id API failed",
          detail: err.message
        }
      };
    }
  }
});
