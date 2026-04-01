const { app } = require("@azure/functions");

function generateQuoteNumber() {
  const digits = Math.floor(100000000 + Math.random() * 900000000);
  return `SRVQ${digits}`;
}

app.http("quotes", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "quotes",
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
      const { sql, getPool } = require("../shared/sql");
      const pool = await getPool();

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

      if (request.method === "GET") {
        let result;

        if (isEmployee) {
          result = await pool.request().query(`
            SELECT TOP 50
              q.QuoteId,
              q.QuoteNumber,
              q.CustomerAccountId,
              qs.StatusName,
              q.CreatedUtc
            FROM Quotes q
            JOIN QuoteStatuses qs ON qs.StatusId = q.StatusId
            ORDER BY q.CreatedUtc DESC
          `);
        } else if (isCustomer) {
          result = await pool.request()
            .input("UserId", sql.Int, user.UserId)
            .query(`
              SELECT TOP 50
                q.QuoteId,
                q.QuoteNumber,
                q.CustomerAccountId,
                qs.StatusName,
                q.CreatedUtc
              FROM Quotes q
              JOIN QuoteStatuses qs ON qs.StatusId = q.StatusId
              JOIN CustomerAccountUsers cau
                ON cau.CustomerAccountId = q.CustomerAccountId
              WHERE cau.UserId = @UserId
              ORDER BY q.CreatedUtc DESC
            `);
        } else {
          return {
            status: 403,
            jsonBody: { error: "User has no valid quote access role" }
          };
        }

        return {
          status: 200,
          jsonBody: result.recordset
        };
      }

      if (request.method === "POST") {
        const accountResult = await pool.request()
          .input("UserId", sql.Int, user.UserId)
          .query(`
            SELECT TOP 1
              ca.CustomerAccountId,
              ca.AccountName
            FROM CustomerAccountUsers cau
            JOIN CustomerAccounts ca
              ON ca.CustomerAccountId = cau.CustomerAccountId
            WHERE cau.UserId = @UserId
            ORDER BY ca.CustomerAccountId
          `);

        if (accountResult.recordset.length === 0) {
          return {
            status: 404,
            jsonBody: { error: "No customer account mapping found for user" }
          };
        }

        const account = accountResult.recordset[0];
        const quoteNumber = generateQuoteNumber();

        const insertResult = await pool.request()
          .input("QuoteNumber", sql.NVarChar(50), quoteNumber)
          .input("CustomerAccountId", sql.Int, account.CustomerAccountId)
          .input("CreatedByUserId", sql.Int, user.UserId)
          .input("AssignedToUserId", sql.Int, user.UserId)
          .query(`
            DECLARE @StatusId INT;
            SELECT @StatusId = StatusId
            FROM QuoteStatuses
            WHERE StatusName = 'In Progress';

            INSERT INTO Quotes (
              QuoteNumber,
              CustomerAccountId,
              CreatedByUserId,
              AssignedToUserId,
              StatusId
            )
            OUTPUT
              INSERTED.QuoteId,
              INSERTED.QuoteNumber,
              INSERTED.CustomerAccountId,
              INSERTED.CreatedByUserId,
              INSERTED.AssignedToUserId,
              INSERTED.StatusId,
              INSERTED.CreatedUtc,
              INSERTED.ModifiedUtc
            VALUES (
              @QuoteNumber,
              @CustomerAccountId,
              @CreatedByUserId,
              @AssignedToUserId,
              @StatusId
            );
          `);

        const createdQuote = insertResult.recordset[0];

        await pool.request()
          .input("EntityType", sql.NVarChar(100), "Quote")
          .input("EntityId", sql.Int, createdQuote.QuoteId)
          .input("ActionType", sql.NVarChar(100), "Create")
          .input("OldValueJson", sql.NVarChar(sql.MAX), null)
          .input("NewValueJson", sql.NVarChar(sql.MAX), JSON.stringify(createdQuote))
          .input("PerformedByUserId", sql.Int, user.UserId)
          .query(`
            INSERT INTO AuditEvents (
              EntityType,
              EntityId,
              ActionType,
              OldValueJson,
              NewValueJson,
              PerformedByUserId
            )
            VALUES (
              @EntityType,
              @EntityId,
              @ActionType,
              @OldValueJson,
              @NewValueJson,
              @PerformedByUserId
            )
          `);

        return {
          status: 201,
          jsonBody: createdQuote
        };
      }

      return {
        status: 405,
        jsonBody: { error: "Method not allowed" }
      };
    } catch (err) {
      context.log("QUOTES API ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Quotes API failed",
          detail: err.message
        }
      };
    }
  }
});
