const { app } = require("@azure/functions");

app.http("quotes", {
  methods: ["GET"],
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

    try {
      const sql = require("mssql");
      const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);

      const result = await pool.request().query(`
        SELECT TOP 10
          q.QuoteId,
          q.QuoteNumber,
          qs.StatusName
        FROM Quotes q
        JOIN QuoteStatuses qs ON qs.StatusId = q.StatusId
        ORDER BY q.CreatedUtc DESC
      `);

      return {
        status: 200,
        jsonBody: result.recordset
      };
    } catch (err) {
      context.log("SQL ERROR", err);
      return {
        status: 500,
        jsonBody: {
          error: "Database query failed",
          detail: err.message
        }
      };
    }
  }
});
