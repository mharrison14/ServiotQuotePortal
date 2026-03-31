const { app } = require("@azure/functions");
const sql = require("mssql");

app.http("adminUserUpdate", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "admin-user-update",
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

      const targetUserResult = await pool.request()
        .input("TargetUserId", sql.Int, targetUserId)
        .query(`
          SELECT TOP 1
            UserId,
            Email,
            DisplayName,
            IsActive,
            CreatedUtc
          FROM Users
          WHERE UserId = @TargetUserId
        `);

      if (targetUserResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "Target user not found" }
        };
      }

      const existingRolesResult = await pool.request()
        .input("TargetUserId", sql.Int, targetUserId)
        .query(`
          SELECT r.RoleName
          FROM UserRoles ur
          JOIN Roles r ON r.RoleId = ur.RoleId
          WHERE ur.UserId = @TargetUserId
          ORDER BY r.RoleName
        `);

      const existingAccountsResult = await pool.request()
        .input("TargetUserId", sql.Int, targetUserId)
        .query(`
          SELECT ca.CustomerAccountId, ca.AccountName
          FROM CustomerAccountUsers cau
          JOIN CustomerAccounts ca ON ca.CustomerAccountId = cau.CustomerAccountId
          WHERE cau.UserId = @TargetUserId
          ORDER BY ca.CustomerAccountId
        `);

      const beforeSnapshot = {
        user: targetUserResult.recordset[0],
        roles: existingRolesResult.recordset.map(r => r.RoleName),
        customerAccounts: existingAccountsResult.recordset
      };

      const validRolesResult = await pool.request().query(`
        SELECT RoleName
        FROM Roles
      `);

      const validRoles = validRolesResult.recordset.map(r => r.RoleName);
      const invalidRoles = roles.filter(r => !validRoles.includes(r));

      if (invalidRoles.length > 0) {
        return {
          status: 400,
          jsonBody: { error: `Invalid roles: ${invalidRoles.join(", ")}` }
        };
      }

      if (customerAccountIds.some(id => !Number.isInteger(Number(id)))) {
        return {
          status: 400,
          jsonBody: { error: "customerAccountIds must all be numeric" }
        };
      }

      if (customerAccountIds.length > 0) {
        const accountCheckResult = await pool.request().query(`
          SELECT CustomerAccountId
          FROM CustomerAccounts
        `);

        const validAccountIds = accountCheckResult.recordset.map(a => a.CustomerAccountId);
        const invalidAccountIds = customerAccountIds.filter(id => !validAccountIds.includes(Number(id)));

        if (invalidAccountIds.length > 0) {
          return {
            status: 400,
            jsonBody: { error: `Invalid customerAccountIds: ${invalidAccountIds.join(", ")}` }
          };
        }
      }

      await pool.request()
        .input("TargetUserId", sql.Int, targetUserId)
        .query(`
          DELETE FROM UserRoles
          WHERE UserId = @TargetUserId
        `);

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

      await pool.request()
        .input("TargetUserId", sql.Int, targetUserId)
        .query(`
          DELETE FROM CustomerAccountUsers
          WHERE UserId = @TargetUserId
        `);

      for (const customerAccountId of customerAccountIds) {
        await pool.request()
          .input("TargetUserId", sql.Int, targetUserId)
          .input("CustomerAccountId", sql.Int, Number(customerAccountId))
          .query(`
            INSERT INTO CustomerAccountUsers (CustomerAccountId, UserId)
            VALUES (@CustomerAccountId, @TargetUserId)
          `);
      }

      const updatedRolesResult = await pool.request()
        .input("TargetUserId", sql.Int, targetUserId)
        .query(`
          SELECT r.RoleName
          FROM UserRoles ur
          JOIN Roles r ON r.RoleId = ur.RoleId
          WHERE ur.UserId = @TargetUserId
          ORDER BY r.RoleName
        `);

      const updatedAccountsResult = await pool.request()
        .input("TargetUserId", sql.Int, targetUserId)
        .query(`
          SELECT ca.CustomerAccountId, ca.AccountName
          FROM CustomerAccountUsers cau
          JOIN CustomerAccounts ca ON ca.CustomerAccountId = cau.CustomerAccountId
          WHERE cau.UserId = @TargetUserId
          ORDER BY ca.CustomerAccountId
        `);

      const afterSnapshot = {
        user: targetUserResult.recordset[0],
        roles: updatedRolesResult.recordset.map(r => r.RoleName),
        customerAccounts: updatedAccountsResult.recordset
      };

      await pool.request()
        .input("EntityType", sql.NVarChar(100), "UserAccess")
        .input("EntityId", sql.Int, targetUserId)
        .input("ActionType", sql.NVarChar(100), "Update")
        .input("OldValueJson", sql.NVarChar(sql.MAX), JSON.stringify(beforeSnapshot))
        .input("NewValueJson", sql.NVarChar(sql.MAX), JSON.stringify(afterSnapshot))
        .input("PerformedByUserId", sql.Int, currentUser.UserId)
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
        status: 200,
        jsonBody: afterSnapshot
      };
    } catch (err) {
      context.log("ADMIN USER UPDATE API ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Admin user update failed",
          detail: err.message
        }
      };
    }
  }
});
