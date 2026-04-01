const sql = require("mssql");
const { DefaultAzureCredential } = require("@azure/identity");

let poolPromise;

async function getSqlConfig() {
  const server = process.env.SQL_SERVER_NAME;
  const database = process.env.SQL_DATABASE_NAME;

  if (!server || !database) {
    throw new Error("SQL_SERVER_NAME and SQL_DATABASE_NAME are required for managed identity SQL auth");
  }

  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://database.windows.net/.default");

  if (!tokenResponse?.token) {
    throw new Error("Failed to acquire Azure SQL access token");
  }

  return {
    server,
    database,
    options: {
      encrypt: true,
      trustServerCertificate: false
    },
    authentication: {
      type: "azure-active-directory-access-token",
      options: {
        token: tokenResponse.token
      }
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = getSqlConfig().then(config => new sql.ConnectionPool(config).connect());
  }
  return poolPromise;
}

module.exports = {
  sql,
  getPool
};
