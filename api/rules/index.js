const { app } = require("@azure/functions");

app.http("rules", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "rules",
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

      if (request.method === "GET") {
        const includeInactive = request.query.get("includeInactive") === "true";

        let result;

        if (includeInactive) {
          result = await pool.request().query(`
            SELECT
              RuleId,
              RuleType,
              ScopeType,
              ScopeValue,
              RuleJson,
              IsActive,
              CreatedUtc
            FROM Rules
            ORDER BY CreatedUtc DESC, RuleId DESC
          `);
        } else {
          result = await pool.request().query(`
            SELECT
              RuleId,
              RuleType,
              ScopeType,
              ScopeValue,
              RuleJson,
              IsActive,
              CreatedUtc
            FROM Rules
            WHERE IsActive = 1
            ORDER BY CreatedUtc DESC, RuleId DESC
          `);
        }

        return {
          status: 200,
          jsonBody: result.recordset
        };
      }

      if (request.method === "POST") {
        const body = await request.json();

        const ruleType = body?.ruleType;
        const scopeType = body?.scopeType ?? null;
        const scopeValue = body?.scopeValue ?? null;
        const ruleJson = body?.ruleJson;
        const isActive = body?.isActive ?? true;

        if (!ruleType || !ruleJson) {
          return {
            status: 400,
            jsonBody: { error: "ruleType and ruleJson are required" }
          };
        }

        const insertResult = await pool.request()
          .input("RuleType", sql.NVarChar(100), ruleType)
          .input("ScopeType", sql.NVarChar(100), scopeType)
          .input("ScopeValue", sql.NVarChar(255), scopeValue)
          .input("RuleJson", sql.NVarChar(sql.MAX), typeof ruleJson === "string" ? ruleJson : JSON.stringify(ruleJson))
          .input("IsActive", sql.Bit, isActive ? 1 : 0)
          .query(`
            INSERT INTO Rules (
              RuleType,
              ScopeType,
              ScopeValue,
              RuleJson,
              IsActive
            )
            OUTPUT
              INSERTED.RuleId,
              INSERTED.RuleType,
              INSERTED.ScopeType,
              INSERTED.ScopeValue,
              INSERTED.RuleJson,
              INSERTED.IsActive,
              INSERTED.CreatedUtc
            VALUES (
              @RuleType,
              @ScopeType,
              @ScopeValue,
              @RuleJson,
              @IsActive
            )
          `);

        const createdRule = insertResult.recordset[0];

        await pool.request()
          .input("EntityType", sql.NVarChar(100), "Rule")
          .input("EntityId", sql.Int, createdRule.RuleId)
          .input("ActionType", sql.NVarChar(100), "Create")
          .input("OldValueJson", sql.NVarChar(sql.MAX), null)
          .input("NewValueJson", sql.NVarChar(sql.MAX), JSON.stringify(createdRule))
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
          jsonBody: createdRule
        };
      }

      return {
        status: 405,
        jsonBody: { error: "Method not allowed" }
      };
    } catch (err) {
      context.log("RULES API ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Rules API failed",
          detail: err.message
        }
      };
    }
  }
});
