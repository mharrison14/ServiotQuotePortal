const { app } = require("@azure/functions");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require("@azure/storage-blob");

function getStorageAccountInfoFromConnectionString(connectionString) {
  const parts = connectionString.split(";");
  const map = {};

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) {
      map[key] = value;
    }
  }

  return {
    accountName: map.AccountName,
    accountKey: map.AccountKey
  };
}

app.http("fileUpload", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "files/upload",
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
          SELECT TOP 1 UserId
          FROM Users
          WHERE EntraUserId = @EntraUserId
        `);

      if (userResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "User not found" }
        };
      }

      const userId = userResult.recordset[0].UserId;

      const body = await request.json();

      const fileName = body?.fileName;
      const fileContentBase64 = body?.fileContent;

      if (!fileName || !fileContentBase64) {
        return {
          status: 400,
          jsonBody: { error: "fileName and fileContent are required" }
        };
      }

      const buffer = Buffer.from(fileContentBase64, "base64");

      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.BLOB_CONNECTION_STRING
      );

      const containerName = process.env.BLOB_CONTAINER_DEFAULT;
      const containerClient = blobServiceClient.getContainerClient(containerName);

      const blobName = `${Date.now()}-${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(buffer);

      const blobPath = `${containerName}/${blobName}`;

      const insertResult = await pool.request()
        .input("FileName", sql.NVarChar(255), fileName)
        .input("BlobPath", sql.NVarChar(500), blobPath)
        .input("ContainerName", sql.NVarChar(100), containerName)
        .input("UploadedByUserId", sql.Int, userId)
        .query(`
          INSERT INTO Files (
            FileName,
            BlobPath,
            ContainerName,
            UploadedByUserId
          )
          OUTPUT
            INSERTED.FileId,
            INSERTED.FileName,
            INSERTED.BlobPath,
            INSERTED.ContainerName,
            INSERTED.UploadedByUserId,
            INSERTED.CreatedUtc
          VALUES (
            @FileName,
            @BlobPath,
            @ContainerName,
            @UploadedByUserId
          )
        `);

      const createdFile = insertResult.recordset[0];

      return {
        status: 201,
        jsonBody: createdFile
      };
    } catch (err) {
      context.log("FILE UPLOAD ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "File upload failed",
          detail: err.message
        }
      };
    }
  }
});

app.http("fileDownload", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "files/{id:int}/download",
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

      const fileId = parseInt(request.params.id, 10);
      if (!fileId) {
        return {
          status: 400,
          jsonBody: { error: "Invalid file id" }
        };
      }

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

      const fileResult = await pool.request()
        .input("FileId", sql.Int, fileId)
        .query(`
          SELECT
            f.FileId,
            f.FileName,
            f.BlobPath,
            f.ContainerName,
            f.CreatedUtc
          FROM Files f
          WHERE f.FileId = @FileId
        `);

      if (fileResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "File not found" }
        };
      }

      const file = fileResult.recordset[0];

      const linksResult = await pool.request()
        .input("FileId", sql.Int, fileId)
        .query(`
          SELECT
            fl.FileLinkId,
            fl.LinkedEntityType,
            fl.LinkedEntityId
          FROM FileLinks fl
          WHERE fl.FileId = @FileId
        `);

      const links = linksResult.recordset;

      if (links.length === 0) {
        if (!isEmployee) {
          return {
            status: 403,
            jsonBody: { error: "Only employees/admins can download unlinked files" }
          };
        }
      } else {
        let allowed = false;

        for (const link of links) {
          if (link.LinkedEntityType === "note") {
            if (isEmployee) {
              allowed = true;
              break;
            }
          }

          if (link.LinkedEntityType === "quote") {
            if (isEmployee) {
              allowed = true;
              break;
            }

            if (isCustomer) {
              const accessCheck = await pool.request()
                .input("QuoteId", sql.Int, link.LinkedEntityId)
                .input("UserId", sql.Int, user.UserId)
                .query(`
                  SELECT q.QuoteId
                  FROM Quotes q
                  JOIN CustomerAccountUsers cau
                    ON cau.CustomerAccountId = q.CustomerAccountId
                  WHERE q.QuoteId = @QuoteId
                    AND cau.UserId = @UserId
                `);

              if (accessCheck.recordset.length > 0) {
                allowed = true;
                break;
              }
            }
          }
        }

        if (!allowed) {
          return {
            status: 403,
            jsonBody: { error: "You do not have access to this file" }
          };
        }
      }

      const { accountName, accountKey } = getStorageAccountInfoFromConnectionString(
        process.env.BLOB_CONNECTION_STRING
      );

      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

      const expiryMinutes = parseInt(process.env.BLOB_SAS_EXPIRY_MINUTES || "15", 10);
      const startsOn = new Date(Date.now() - 5 * 60 * 1000);
      const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: file.ContainerName,
          blobName: file.BlobPath.replace(`${file.ContainerName}/`, ""),
          permissions: BlobSASPermissions.parse("r"),
          startsOn,
          expiresOn,
          contentDisposition: `attachment; filename="${file.FileName}"`
        },
        sharedKeyCredential
      ).toString();

      const downloadUrl = `https://${accountName}.blob.core.windows.net/${file.BlobPath}?${sasToken}`;

      return {
        status: 200,
        jsonBody: {
          fileId: file.FileId,
          fileName: file.FileName,
          downloadUrl
        }
      };
    } catch (err) {
      context.log("FILE DOWNLOAD ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "File download failed",
          detail: err.message
        }
      };
    }
  }
});
