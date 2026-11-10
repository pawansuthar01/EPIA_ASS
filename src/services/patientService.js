const { randomUUID } = require('node:crypto');
const patientRepository = require('../repositories/patientRepository');
const { isValidDate, getLocalDate } = require('../utils/date');

function validatePatient(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const errors = {};

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Name must be 2 to 80 characters.';
  }
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'Enter a valid phone number (7 to 20 characters).';
  }
  if (!isValidDate(body.consultationDate)) {
    errors.consultationDate = 'Use a valid date in YYYY-MM-DD format.';
  }
  if (!isValidDate(body.followUpDate)) {
    errors.followUpDate = 'Use a valid date in YYYY-MM-DD format.';
  }
  if (isValidDate(body.consultationDate) && isValidDate(body.followUpDate) && body.followUpDate < body.consultationDate) {
    errors.followUpDate = 'Follow-up date cannot be before the consultation date.';
  }

  return { errors, patientFields: { name, phone, consultationDate: body.consultationDate, followUpDate: body.followUpDate } };
}

function createPatient(input) {
  const { errors, patientFields } = validatePatient(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    patient: {
      id: randomUUID(),
      ...patientFields,
      followUpStatus: 'pending',
      createdAt: new Date().toISOString(),
    },
  };
}

function getAllPatients() {
  return patientRepository.getAll();
}

function getPatientsDueToday() {
  const today = getLocalDate();
  return getAllPatients().filter((patient) => patient.followUpDate === today && patient.followUpStatus === 'pending');
}

async function createAiDraft(patient) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new Error('Set GEMINI_API_KEY and GEMINI_MODEL in .env.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Write a brief, warm, non-clinical WhatsApp follow-up asking the patient to contact the clinic to arrange their follow-up. Do not give medical advice or mention symptoms. Return only the message.' }] },
      contents: [{ role: 'user', parts: [{ text: `Patient first name: ${patient.name.trim().split(/\s+/)[0]}. Consultation date: ${patient.consultationDate}.` }] }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Gemini returned ${response.status}`);
  const draft = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!draft) throw new Error('Gemini returned an empty draft.');
  return { draft, aiProvider: 'gemini' };
}

async function getDraftsDueToday() {
  const drafts = await Promise.all(getPatientsDueToday().map(async (patient) => ({
    patientId: patient.id,
    patientName: patient.name,
    phone: patient.phone,
    followUpDate: patient.followUpDate,
    ...(patient.draftApproval === 'approved' && patient.approvedDraft
      ? { draft: patient.approvedDraft, aiProvider: 'staff-reviewed' }
      : await createAiDraft(patient)),
    approvalStatus: patient.draftApproval || 'pending',
    requiresStaffApproval: true,
    sent: false,
  })));

  return {
    aiProvider: [...new Set(drafts.map((draft) => draft.aiProvider))].join(', ') || 'gemini',
    message: drafts.length
      ? 'Gemini drafts generated. Review and approve each before manually copying; no messages were sent.'
      : 'No follow-ups are due today, so Gemini drafts were not needed.',
    drafts,
  };
}

function completeFollowUp(patientId) {
  const patients = getAllPatients();
  const patient = patients.find((item) => item.id === patientId);
  if (!patient) return { statusCode: 404, message: 'Follow-up was not completed: patient not found.' };

  patient.followUpStatus = 'completed';
  patient.completedAt = new Date().toISOString();
  patientRepository.saveAll(patients);
  return { statusCode: 200, message: 'Follow-up marked completed.', data: patient };
}

function approveDraft(patientId, draft) {
  const patients = getAllPatients();
  const patient = patients.find((item) => item.id === patientId);
  if (!patient) return { statusCode: 404, message: 'Draft was not approved: patient not found.' };
  if (patient.followUpStatus === 'completed') {
    return { statusCode: 409, message: 'Draft was not approved: this follow-up is already completed.' };
  }
  if (draft !== undefined && (typeof draft !== 'string' || !draft.trim() || draft.length > 2000)) {
    return { statusCode: 400, message: 'Draft was not approved: reviewed draft must be 1 to 2000 characters.' };
  }

  patient.draftApproval = 'approved';
  if (typeof draft === 'string') patient.approvedDraft = draft.trim();
  patient.draftApprovedAt = new Date().toISOString();
  patientRepository.saveAll(patients);
  return {
    statusCode: 200,
    message: 'Draft approved by staff. No message was sent.',
    data: {
      patientId: patient.id,
      approvalStatus: patient.draftApproval,
      sent: false,
    },
  };
}

function savePatient(patient) {
  const patients = getAllPatients();
  patients.push(patient);
  patientRepository.saveAll(patients);
}

module.exports = { createPatient, getAllPatients, getPatientsDueToday, getDraftsDueToday, completeFollowUp, approveDraft, savePatient };
