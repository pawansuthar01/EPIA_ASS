const patients = require("../services/patientService");
const { success, failure } = require("../utils/response");

function fail(response, error, message, status = 500) {
  console.error(message, error.message);
  failure(response, status, message);
}

function getAll(request, response) {
  try {
    const data = patients.getAllPatients();
    success(response, 200, `Found ${data.length} patient(s).`, data);
  } catch (error) {
    fail(response, error, "Patient data could not be read.");
  }
}

function getDueToday(request, response) {
  try {
    const data = patients.getPatientsDueToday();
    success(response, 200, data.length ? `Found ${data.length} follow-up(s) due today.` : 'No follow-ups are due today.', data);
  } catch (error) {
    fail(response, error, "Patient data could not be read.");
  }
}

async function getDraftsDueToday(request, response) {
  try {
    const result = await patients.getDraftsDueToday();
    success(response, 200, result.message, result);
  } catch (error) {
    const status = error.message.startsWith('Set GEMINI_API_KEY') ? 503 : 502;
    fail(response, error, `Gemini could not generate drafts: ${error.message}`, status);
  }
}

function create(request, response) {
  const result = patients.createPatient(request.body);
  if (!result.ok)
    return failure(response, 400, 'Patient was not created. Correct the invalid fields and try again.', result.errors);
  try {
    patients.savePatient(result.patient);
    success(response, 201, 'Patient created successfully.', result.patient);
  } catch (error) {
    fail(response, error, "Patient could not be saved.");
  }
}

function complete(request, response) {
  try {
    const result = patients.completeFollowUp(request.params.id);
    if (result.statusCode >= 400) return failure(response, result.statusCode, result.message);
    success(response, result.statusCode, result.message, result.data);
  } catch (error) {
    fail(response, error, "Patient status could not be updated.");
  }
}

function approveDraft(request, response) {
  const body = request.body === undefined ? {} : request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return failure(response, 400, 'Draft was not approved. Request body must be a JSON object.');
  }
  try {
    const result = patients.approveDraft(request.params.id, body.draft);
    if (result.statusCode >= 400) return failure(response, result.statusCode, result.message);
    success(response, result.statusCode, result.message, result.data);
  } catch (error) {
    fail(response, error, "Draft approval could not be saved.");
  }
}

module.exports = {
  create,
  getAll,
  getDueToday,
  getDraftsDueToday,
  approveDraft,
  complete,
};
