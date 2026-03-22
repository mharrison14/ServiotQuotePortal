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
        jsonBody: { error: "Not authenticated" }
      };
    }

    const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
    const principal = JSON.parse(decoded);

    return {
      status: 200,
      jsonBody: {
        userId: principal.userId,
        userDetails: principal.userDetails,
        userRoles: principal.userRoles
      }
    };
  }
});
