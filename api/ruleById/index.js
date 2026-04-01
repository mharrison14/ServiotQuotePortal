const { app } = require("@azure/functions");

app.http("ruleById", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "rules/{id:int}",
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

      const ruleId = parseInt(request.params.id, 10);
      if (!ruleId) {
        return {
          status: 400,
          jsonBody: { error: "Invalid rule id" }
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

      if (!isEmployee) {
        return {
          status: 403,
          jsonBody: { error: "Rules access is restricted to employees/admins" }
        };
      }

      const existingResult = await pool.request()
        .input("RuleId", sql.Int, ruleId)
        .query(`
          SELECT
            RuleId,
            RuleType,
            ScopeType,
            ScopeValue,
            RuleJson,
            IsActive,
            CreatedUtc
          FROM Rules
          WHERE RuleId = @RuleId
        `);

      if (existingResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "Rule not found" }
        };
      }

      const existingRule = existingResult.recordset[0];
      const body = await request.json();

      const ruleType = body?.ruleType;
      const scopeType = body?.scopeType ?? null;
      const scopeValue = body?.scopeValue ?? null;
      const ruleJson = body?.ruleJson;
      const isActive = body?.isActive;

      if (!ruleType || !ruleJson || typeof isActive !== "boolean") {
        return {
          status: 400,
          jsonBody: { error: "ruleType, ruleJson, and isActive are required" }
        };
      }

      const updateResult = await pool.request()
        .input("RuleId", sql.Int, ruleId)
        .input("RuleType", sql.NVarChar(100), ruleType)
        .input("ScopeType", sql.NVarChar(100), scopeType)
        .input("ScopeValue", sql.NVarChar(255), scopeValue)
        .input("RuleJson", sql.NVarChar(sql.MAX), typeof ruleJson === "string" ? ruleJson : JSON.stringify(ruleJson))
        .input("IsActive", sql.Bit, isActive ? 1 : 0)
        .query(`
          UPDATE Rules
          SET
            RuleType = @RuleType,
            ScopeType = @ScopeType,
            ScopeValue = @ScopeValue,
            RuleJson = @RuleJson,
            IsActive = @IsActive
          OUTPUT
            INSERTED.RuleId,
            INSERTED.RuleType,
            INSERTED.ScopeType,
            INSERTED.ScopeValue,
            INSERTED.RuleJson,
            INSERTED.IsActive,
            INSERTED.CreatedUtc
          WHERE RuleId = @RuleId
        `);

      const updatedRule = updateResult.recordset[0];

      await pool.request()
        .input("EntityType", sql.NVarChar(100), "Rule")
        .input("EntityId", sql.Int, updatedRule.RuleId)
        .input("ActionType", sql.NVarChar(100), "Update")
        .input("OldValueJson", sql.NVarChar(sql.MAX), JSON.stringify(existingRule))
        .input("NewValueJson", sql.NVarChar(sql.MAX), JSON.stringify(updatedRule))
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
        status: 200,
        jsonBody: updatedRule
      };
    } catch (err) {
      context.log("RULE BY ID API ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Rule update API failed",
          detail: err.message
        }
      };
    }
  }
});
