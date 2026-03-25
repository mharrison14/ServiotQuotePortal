const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

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
      const sql = require("mssql");
      const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);

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
