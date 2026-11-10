const chat = require("../services/chatService");
const { getProviderLabel } = require("../services/aiService");
const { success, failure } = require("../utils/response");

async function send(request, response) {
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return failure(
      response,
      400,
      "Chat message was not sent. Request body must be a JSON object.",
    );
  }
  if (
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 4000
  ) {
    return failure(
      response,
      400,
      "Chat message must contain 1 to 4000 characters.",
    );
  }
  if (
    body.conversationId !== undefined &&
    (typeof body.conversationId !== "string" || !body.conversationId.trim())
  ) {
    return failure(response, 400, "conversationId must be a non-empty string.");
  }

  try {
    const result = await chat.sendMessage(body.message, body.conversationId);
    if (result.statusCode >= 400)
      return failure(response, result.statusCode, result.message);
    success(response, result.statusCode, result.message, result.data);
  } catch (error) {
    const provider = getProviderLabel();
    console.error(`${provider} chat failed:`, error.message);
    const timedOut =
      error.name === "TimeoutError" ||
      /aborted due to timeout/i.test(error.message);
    if (timedOut)
      return failure(
        response,
        504,
        `${provider} timed out after 60 seconds. Please retry.`,
      );
    failure(
      response,
      error.statusCode || 502,
      `${provider} chat failed: ${error.message}`,
    );
  }
}

module.exports = { send };
