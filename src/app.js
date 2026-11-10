require("dotenv").config();

const express = require("express");
const patients = require("./controllers/patientController");
const chat = require("./controllers/chatController");
const { success, failure } = require("./utils/response");
const { getProvider, getProviderLabel } = require("./services/aiService");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/", (request, response) =>
  success(response, 200, "API is running.", {
    name: "EPIA Patient Follow-up API",
    endpoints: [
      "GET /",
      "GET /api/health",
      "POST /api/patients",
      "GET /api/patients",
      "GET /api/patients/due-today",
      "GET /api/drafts/due-today",
      "POST /api/ai/chat (start conversation)",
      "POST /api/ai/chat (continue with conversationId)",
      "PATCH /api/patients/:id/approve-draft",
      "PATCH /api/patients/:id/complete",
    ],
  }),
);

app.get("/api/health", (request, response) =>
  success(response, 200, "API is healthy.", {
    status: "ok",
    storage: "JSON file",
    ai: (() => {
      try {
        const provider = getProvider();
        const key =
          provider === "GEMINI"
            ? process.env.GEMINI_API_KEY || process.env.GEMINI_KEY
            : process.env.AWS_BEDROCK_KEY;
        return key
          ? `${getProviderLabel()} configured; connection checked when generating content`
          : `${getProviderLabel()} key missing`;
      } catch (error) {
        return error.message;
      }
    })(),
  }),
);
app.post("/api/patients", patients.create);
app.get("/api/patients", patients.getAll);
app.get("/api/patients/due-today", patients.getDueToday);
app.get("/api/drafts/due-today", patients.getDraftsDueToday);
app.post("/api/ai/chat", chat.send);
app.patch("/api/patients/:id/approve-draft", patients.approveDraft);
app.patch("/api/patients/:id/complete", patients.complete);

app.use((request, response) =>
  failure(
    response,
    404,
    `No endpoint for ${request.method} ${request.originalUrl}.`,
  ),
);
app.use((error, request, response, next) => {
  if (error.type === "entity.parse.failed")
    return failure(response, 400, "Request body must be valid JSON.");
  if (error.type === "entity.too.large")
    return failure(
      response,
      413,
      "Request body is too large. Maximum size is 1 MB.",
    );
  console.error("Request failed:", error.message);
  failure(
    response,
    500,
    "Unexpected server error. Please retry or contact support.",
  );
});

module.exports = app;
