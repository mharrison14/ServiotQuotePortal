const { app } = require("@azure/functions");

app.http("notes", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "notes",
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

      if (!isEmployee) {
        return {
          status: 403,
          jsonBody: { error: "Notes access is restricted to employees/admins" }
        };
      }

      if (request.method === "GET") {
        const result = await pool.request().query(`
          SELECT
            NoteId,
            Title,
            ScopeType,
            ScopeValue,
            Body,
            CreatedByUserId,
            CreatedUtc
          FROM Notes
          ORDER BY CreatedUtc DESC, NoteId DESC
        `);

        return {
          status: 200,
          jsonBody: result.recordset
        };
      }

      if (request.method === "POST") {
        const body = await request.json();

        const title = body?.title;
        const scopeType = body?.scopeType ?? null;
        const scopeValue = body?.scopeValue ?? null;
        const noteBody = body?.body;

        if (!title || !noteBody) {
          return {
            status: 400,
            jsonBody: { error: "title and body are required" }
          };
        }

        const insertResult = await pool.request()
          .input("Title", sql.NVarChar(255), title)
          .input("ScopeType", sql.NVarChar(100), scopeType)
          .input("ScopeValue", sql.NVarChar(255), scopeValue)
          .input("Body", sql.NVarChar(sql.MAX), noteBody)
          .input("CreatedByUserId", sql.Int, user.UserId)
          .query(`
            INSERT INTO Notes (
              Title,
              ScopeType,
              ScopeValue,
              Body,
              CreatedByUserId
            )
            OUTPUT
              INSERTED.NoteId,
              INSERTED.Title,
              INSERTED.ScopeType,
              INSERTED.ScopeValue,
              INSERTED.Body,
              INSERTED.CreatedByUserId,
              INSERTED.CreatedUtc
            VALUES (
              @Title,
              @ScopeType,
              @ScopeValue,
              @Body,
              @CreatedByUserId
            )
          `);

        const createdNote = insertResult.recordset[0];

        await pool.request()
          .input("EntityType", sql.NVarChar(100), "Note")
          .input("EntityId", sql.Int, createdNote.NoteId)
          .input("ActionType", sql.NVarChar(100), "Create")
          .input("OldValueJson", sql.NVarChar(sql.MAX), null)
          .input("NewValueJson", sql.NVarChar(sql.MAX), JSON.stringify(createdNote))
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
          jsonBody: createdNote
        };
      }

      return {
        status: 405,
        jsonBody: { error: "Method not allowed" }
      };
    } catch (err) {
      context.log("NOTES API ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Notes API failed",
          detail: err.message
        }
      };
    }
  }
});
