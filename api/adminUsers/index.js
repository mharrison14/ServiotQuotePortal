const { app } = require("@azure/functions");
const sql = require("mssql");

app.http("adminUsers", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin-users",
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
      const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);

      const currentUserResult = await pool.request()
        .input("EntraUserId", sql.NVarChar(200), principal.userId)
        .query(`
          SELECT TOP 1
            u.UserId,
            u.Email,
            u.DisplayName
          FROM Users u
          WHERE u.EntraUserId = @EntraUserId
        `);

      if (currentUserResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "User not found in app database" }
        };
      }

      const currentUser = currentUserResult.recordset[0];

      const currentRolesResult = await pool.request()
        .input("UserId", sql.Int, currentUser.UserId)
        .query(`
          SELECT r.RoleName
          FROM UserRoles ur
          JOIN Roles r ON r.RoleId = ur.RoleId
          WHERE ur.UserId = @UserId
        `);

      const currentRoleNames = currentRolesResult.recordset.map(r => r.RoleName);
      const isAdmin = currentRoleNames.includes("admin");

      if (!isAdmin) {
        return {
          status: 403,
          jsonBody: { error: "Admin access required" }
        };
      }

      const usersResult = await pool.request().query(`
        SELECT
          u.UserId,
          u.Email,
          u.DisplayName,
          u.IsActive,
          u.CreatedUtc,
          r.RoleName,
          ca.CustomerAccountId,
          ca.AccountName
        FROM Users u
        LEFT JOIN UserRoles ur ON ur.UserId = u.UserId
        LEFT JOIN Roles r ON r.RoleId = ur.RoleId
        LEFT JOIN CustomerAccountUsers cau ON cau.UserId = u.UserId
        LEFT JOIN CustomerAccounts ca ON ca.CustomerAccountId = cau.CustomerAccountId
        ORDER BY u.UserId, r.RoleName, ca.AccountName
      `);

      const rows = usersResult.recordset;
      const usersMap = new Map();

      for (const row of rows) {
        if (!usersMap.has(row.UserId)) {
          usersMap.set(row.UserId, {
            userId: row.UserId,
            email: row.Email,
            displayName: row.DisplayName,
            isActive: row.IsActive,
            createdUtc: row.CreatedUtc,
            roles: [],
            customerAccounts: []
          });
        }

        const user = usersMap.get(row.UserId);

        if (row.RoleName && !user.roles.includes(row.RoleName)) {
          user.roles.push(row.RoleName);
        }

        if (
          row.CustomerAccountId &&
          !user.customerAccounts.some(a => a.customerAccountId === row.CustomerAccountId)
        ) {
          user.customerAccounts.push({
            customerAccountId: row.CustomerAccountId,
            accountName: row.AccountName
          });
        }
      }

      return {
        status: 200,
        jsonBody: Array.from(usersMap.values())
      };
    } catch (err) {
      context.log("ADMIN USERS API ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Admin users API failed",
          detail: err.message
        }
      };
    }
  }
});
