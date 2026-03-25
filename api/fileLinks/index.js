const { app } = require("@azure/functions");

app.http("fileLinks", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "files/link",
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
            UserId,
            Email
          FROM Users
          WHERE EntraUserId = @EntraUserId
        `);

      if (userResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "User not found" }
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

      const body = await request.json();

      const fileId = Number(body?.fileId);
      const linkedEntityType = body?.linkedEntityType;
      const linkedEntityId = Number(body?.linkedEntityId);

      if (!fileId || !linkedEntityType || !linkedEntityId) {
        return {
          status: 400,
          jsonBody: { error: "fileId, linkedEntityType, and linkedEntityId are required" }
        };
      }

      if (!["quote", "note"].includes(linkedEntityType)) {
        return {
          status: 400,
          jsonBody: { error: "linkedEntityType must be 'quote' or 'note'" }
        };
      }

      const fileResult = await pool.request()
        .input("FileId", sql.Int, fileId)
        .query(`
          SELECT
            FileId,
            FileName,
            UploadedByUserId
          FROM Files
          WHERE FileId = @FileId
        `);

      if (fileResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "File not found" }
        };
      }

      if (linkedEntityType === "note" && !isEmployee) {
        return {
          status: 403,
          jsonBody: { error: "Only employees/admins can link files to notes" }
        };
      }

      if (linkedEntityType === "quote") {
        if (isEmployee) {
          const quoteResult = await pool.request()
            .input("QuoteId", sql.Int, linkedEntityId)
            .query(`
              SELECT QuoteId
              FROM Quotes
              WHERE QuoteId = @QuoteId
            `);

          if (quoteResult.recordset.length === 0) {
            return {
              status: 404,
              jsonBody: { error: "Quote not found" }
            };
          }
        } else if (isCustomer) {
          const quoteResult = await pool.request()
            .input("QuoteId", sql.Int, linkedEntityId)
            .input("UserId", sql.Int, user.UserId)
            .query(`
              SELECT q.QuoteId
              FROM Quotes q
              JOIN CustomerAccountUsers cau
                ON cau.CustomerAccountId = q.CustomerAccountId
              WHERE q.QuoteId = @QuoteId
                AND cau.UserId = @UserId
            `);

          if (quoteResult.recordset.length === 0) {
            return {
              status: 403,
              jsonBody: { error: "You can only link files to your own quotes" }
            };
          }
        } else {
          return {
            status: 403,
            jsonBody: { error: "User has no valid file link role" }
          };
        }
      }

      if (linkedEntityType === "note") {
        const noteResult = await pool.request()
          .input("NoteId", sql.Int, linkedEntityId)
          .query(`
            SELECT NoteId
            FROM Notes
            WHERE NoteId = @NoteId
          `);

        if (noteResult.recordset.length === 0) {
          return {
            status: 404,
            jsonBody: { error: "Note not found" }
          };
        }
      }

      const existingLinkResult = await pool.request()
        .input("FileId", sql.Int, fileId)
        .input("LinkedEntityType", sql.NVarChar(100), linkedEntityType)
        .input("LinkedEntityId", sql.Int, linkedEntityId)
        .query(`
          SELECT TOP 1
            FileLinkId,
            FileId,
            LinkedEntityType,
            LinkedEntityId
          FROM FileLinks
          WHERE FileId = @FileId
            AND LinkedEntityType = @LinkedEntityType
            AND LinkedEntityId = @LinkedEntityId
        `);

      if (existingLinkResult.recordset.length > 0) {
        return {
          status: 200,
          jsonBody: existingLinkResult.recordset[0]
        };
      }

      const insertResult = await pool.request()
        .input("FileId", sql.Int, fileId)
        .input("LinkedEntityType", sql.NVarChar(100), linkedEntityType)
        .input("LinkedEntityId", sql.Int, linkedEntityId)
        .query(`
          INSERT INTO FileLinks (
            FileId,
            LinkedEntityType,
            LinkedEntityId
          )
          OUTPUT
            INSERTED.FileLinkId,
            INSERTED.FileId,
            INSERTED.LinkedEntityType,
            INSERTED.LinkedEntityId
          VALUES (
            @FileId,
            @LinkedEntityType,
            @LinkedEntityId
          )
        `);

      const createdLink = insertResult.recordset[0];

      await pool.request()
        .input("EntityType", sql.NVarChar(100), "FileLink")
        .input("EntityId", sql.Int, createdLink.FileLinkId)
        .input("ActionType", sql.NVarChar(100), "Create")
        .input("OldValueJson", sql.NVarChar(sql.MAX), null)
        .input("NewValueJson", sql.NVarChar(sql.MAX), JSON.stringify(createdLink))
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
        jsonBody: createdLink
      };
    } catch (err) {
      context.log("FILE LINK ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "File link failed",
          detail: err.message
        }
      };
    }
  }
});
