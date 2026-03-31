const { app } = require("@azure/functions");
const sql = require("mssql");

app.http("me", {
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  route: "me",
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

    const wantsAdminUsers = request.query.get("adminUsers") === "true";
    const wantsAdminUpdateUser = request.query.get("adminUpdateUser") === "true";

    // =====================
    // Default /api/me
    // =====================
    if (!wantsAdminUsers && !wantsAdminUpdateUser) {
      return {
        status: 200,
        jsonBody: {
          userId: principal.userId,
          userDetails: principal.userDetails,
          userRoles: principal.userRoles
        }
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

      // =====================
      // GET ADMIN USERS
      // =====================
      if (wantsAdminUsers && request.method === "GET") {
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
      }

      // =====================
      // UPDATE USER ACCESS
      // =====================
      if (wantsAdminUpdateUser && request.method === "PUT") {
        const body = await request.json();

        const targetUserId = Number(body?.userId);
        const roles = Array.isArray(body?.roles) ? body.roles : null;
        const customerAccountIds = Array.isArray(body?.customerAccountIds) ? body.customerAccountIds : null;

        if (!targetUserId || !roles || !customerAccountIds) {
          return {
            status: 400,
            jsonBody: { error: "userId, roles, and customerAccountIds are required" }
          };
        }

        // Clear roles
        await pool.request()
          .input("TargetUserId", sql.Int, targetUserId)
          .query(`DELETE FROM UserRoles WHERE UserId = @TargetUserId`);

        // Insert roles
        for (const roleName of roles) {
          await pool.request()
            .input("TargetUserId", sql.Int, targetUserId)
            .input("RoleName", sql.NVarChar(50), roleName)
            .query(`
              INSERT INTO UserRoles (UserId, RoleId)
              SELECT @TargetUserId, r.RoleId
              FROM Roles r
              WHERE r.RoleName = @RoleName
            `);
        }

        // Clear accounts
        await pool.request()
          .input("TargetUserId", sql.Int, targetUserId)
          .query(`DELETE FROM CustomerAccountUsers WHERE UserId = @TargetUserId`);

        // Insert accounts
        for (const customerAccountId of customerAccountIds) {
          await pool.request()
            .input("TargetUserId", sql.Int, targetUserId)
            .input("CustomerAccountId", sql.Int, Number(customerAccountId))
            .query(`
              INSERT INTO CustomerAccountUsers (CustomerAccountId, UserId)
              VALUES (@CustomerAccountId, @TargetUserId)
            `);
        }

        return {
          status: 200,
          jsonBody: {
            message: "User updated successfully"
          }
        };
      }

      return {
        status: 405,
        jsonBody: { error: "Method not allowed" }
      };

    } catch (err) {
      context.log("ME ADMIN ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Admin operation failed",
          detail: err.message
        }
      };
    }
  }
});
