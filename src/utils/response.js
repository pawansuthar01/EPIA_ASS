function success(response, status, message, data) {
  response.status(status).json({ success: true, message, data });
}

function failure(response, status, message, details) {
  response.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}

module.exports = { success, failure };
