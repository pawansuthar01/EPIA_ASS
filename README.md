# EPIA Patient Follow-up API

A small Node.js/Express REST API with JSON-file storage and a Gemini follow-up draft workflow. Patient examples are fictional. The API never connects to WhatsApp or sends messages.

## Run

Requires Node.js 18 or newer.

Dependencies: Express and dotenv. No database or WhatsApp package is used.

```sh
npm install
npm start
```

The API starts at `http://localhost:3000`. Set `PORT` to change the port. Patient records are saved in `data/patients.json`.

For Gemini drafts, copy `.env.example` to `.env` and set `GEMINI_API_KEY` (or `GEMINI_KEY`) and `GEMINI_MODEL`. `/api/health` reports whether both settings exist. Drafts come from Gemini only; a missing or rejected key returns an error. Only the fictional patient's first name and consultation date are sent to Gemini.

PowerShell key setup without a `.env` file:

```powershell
$env:GEMINI_API_KEY = "your-key"
npm start
```

## Endpoints

All responses use JSON with `success`, `message`, and `data` on success. Errors use `success: false` and a clear `message`; validation errors also include `details` by field. Dates must use `YYYY-MM-DD`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health and AI setup status |
| `POST` | `/api/patients` | Add `{ "name", "phone", "consultationDate", "followUpDate" }` |
| `GET` | `/api/patients` | Get all patients |
| `GET` | `/api/patients/due-today` | Get pending follow-ups due today |
| `GET` | `/api/drafts/due-today` | Generate Gemini drafts for due patients |
| `PATCH` | `/api/patients/:id/approve-draft` | Record staff approval; optional body `{ "draft": "reviewed text" }` saves reviewed text |
| `PATCH` | `/api/patients/:id/complete` | Mark a follow-up completed |

| Status | Meaning |
| --- | --- |
| `200` | Request completed; response message says what happened or whether there was no due patient. |
| `201` | Patient created. |
| `400` | Invalid fields, malformed JSON, or invalid approval body; check `message` and `details`. |
| `404` | Route or patient ID does not exist. |
| `409` | Follow-up cannot be approved because it is already completed. |
| `413` | Request body exceeds the 1 MB limit. |
| `500` | Server or local storage error. |
| `502` | Gemini rejected the request or failed to generate a draft; response explains why. |
| `503` | Gemini API settings are missing. |

New patients need a 2–80 character name, a valid phone number, valid dates, and a follow-up date on or after the consultation date. Invalid input returns `400` with each invalid field listed under `details`.

Staff gets a draft from `GET /api/drafts/due-today`, reviews it, then calls the approval endpoint. The optional `draft` value stores the reviewed text. Approval does not send a WhatsApp message. No sending endpoint exists.

## Test

```sh
npm test
```

`npm test` uses a temporary patient file and checks every route, success/error statuses, validation, malformed and oversized bodies, and Gemini error reporting without sending a real Gemini request.

## Postman

Import [`postman/EPIA-Patient-Follow-Up.postman_collection.json`](postman/EPIA-Patient-Follow-Up.postman_collection.json) with **Import → File**. Run the requests in order; the collection sets today's date and saves the created patient ID automatically. The `.txt` file is only for copying cURL commands into a terminal.

## Submission files

- `SUBMISSION.md` includes the implementation note and a three-minute demo script.
- `postman/Postman-cURL-requests.txt` has example requests.
- `.env` and `node_modules` are excluded from the submission ZIP.
