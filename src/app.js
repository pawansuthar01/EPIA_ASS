require('dotenv').config();

const express = require('express');
const patients = require('./controllers/patientController');
const { success, failure } = require('./utils/response');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/', (request, response) => success(response, 200, 'API is running.', {
  name: 'EPIA Patient Follow-up API',
  endpoints: [
    'GET /api/health',
    'POST /api/patients',
    'GET /api/patients',
    'GET /api/patients/due-today',
    'GET /api/drafts/due-today',
    'PATCH /api/patients/:id/approve-draft',
    'PATCH /api/patients/:id/complete',
  ],
}));

app.get('/api/health', (request, response) => success(response, 200, 'API is healthy.', {
  status: 'ok',
  storage: 'JSON file',
  ai: (process.env.GEMINI_API_KEY || process.env.GEMINI_KEY) && process.env.GEMINI_MODEL ? 'configured; connection checked when generating drafts' : 'not configured',
}));
app.post('/api/patients', patients.create);
app.get('/api/patients', patients.getAll);
app.get('/api/patients/due-today', patients.getDueToday);
app.get('/api/drafts/due-today', patients.getDraftsDueToday);
app.patch('/api/patients/:id/approve-draft', patients.approveDraft);
app.patch('/api/patients/:id/complete', patients.complete);

app.use((request, response) => failure(response, 404, `No endpoint for ${request.method} ${request.originalUrl}.`));
app.use((error, request, response, next) => {
  if (error.type === 'entity.parse.failed') return failure(response, 400, 'Request body must be valid JSON.');
  if (error.type === 'entity.too.large') return failure(response, 413, 'Request body is too large. Maximum size is 1 MB.');
  console.error('Request failed:', error.message);
  failure(response, 500, 'Unexpected server error. Please retry or contact support.');
});

module.exports = app;
