const { app } = require("@azure/functions");

app.http("me", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "me",
  handler: async (request, context) => {
    const principalHeader = request.headers.get("x-ms-client-principal");

    if (!principalHeader) {
      return {
        status: 401,
        jsonBody: {
          error: "Not authenticated"
        }
      };
    }

    let principal;

    try {
      const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
      principal = JSON.parse(decoded);
    } catch (err) {
      context.log("Failed to parse x-ms-client-principal", err);
      return {
        status: 400,
        jsonBody: {
          error: "Invalid principal header"
        }
      };
    }

    return {
      status: 200,
      jsonBody: {
        userId: principal.userId || null,
        userDetails: principal.userDetails || null,
        userRoles: principal.userRoles || []
      }
    };
  }
});