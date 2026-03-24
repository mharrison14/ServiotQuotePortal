const { app } = require("@azure/functions");

app.http("quotes", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "quotes",
  handler: async (request, context) => {
    return {
      status: 200,
      jsonBody: [
        {
          QuoteId: 1,
          QuoteNumber: "TEST-0001",
          StatusName: "In Progress"
        }
      ]
    };
  }
});
