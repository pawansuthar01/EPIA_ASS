# EPIA Patient Follow-up API

A small Node.js/Express REST API with JSON-file storage and switchable AWS Bedrock or Gemini follow-up drafts. Patient examples are fictional. The API never connects to WhatsApp or sends messages.

## Run

Requires Node.js 18 or newer.

Dependencies: Express and dotenv. No database or WhatsApp package is used.

```sh
npm install
npm start
```

The local API starts at `http://localhost:3000`. The deployed API is at `https://epai-submit.deskgo.in`. Set `PORT` to change the local port. Patient records are saved in `data/patients.json`.

Choose the provider in `.env` with `AI_PROVIDER=AWS_BEDROCK` or `AI_PROVIDER=GEMINI`. Bedrock uses `AWS_BEDROCK_KEY`, `AWS_BEDROCK_REGION`, and `AWS_BEDROCK_MODEL`; Gemini uses `GEMINI_API_KEY` and `GEMINI_MODEL`. Bedrock is the default. `/api/health` reports the selected provider and whether its key is configured; the connection is checked when AI content is requested. Drafts and chat use only the selected provider, with no fallback. Only fictional patient name and consultation date are sent for patient drafts.

PowerShell key setup without a `.env` file:

```powershell
# Choose AWS Bedrock
$env:AI_PROVIDER = "AWS_BEDROCK"
$env:AWS_BEDROCK_KEY = "your-bedrock-key"

# Or choose Gemini
$env:AI_PROVIDER = "GEMINI" # or AWS_BEDROCK
$env:GEMINI_API_KEY = "your-key"
npm start
```

## Endpoints

All responses use JSON with `success`, `message`, and `data` on success. Errors use `success: false` and a clear `message`; validation errors also include `details` by field. Dates must use `YYYY-MM-DD`.

| Method  | Endpoint                          | Purpose                                                                                       |
| ------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET`   | `/`                               | Show API status and the full endpoint list                                                    |
| `GET`   | `/api/health`                     | Health and AI setup status                                                                    |
| `POST`  | `/api/patients`                   | Add `{ "name", "phone", "consultationDate", "followUpDate" }`                                 |
| `GET`   | `/api/patients`                   | Get all patients                                                                              |
| `GET`   | `/api/patients/due-today`         | Get pending follow-ups due today                                                              |
| `GET`   | `/api/drafts/due-today`           | Generate AI drafts with the selected provider                                                 |
| `POST`  | `/api/ai/chat`                    | Start a chat by sending `{ "message": "..." }`                                                |
| `POST`  | `/api/ai/chat`                    | Continue that chat by sending its `conversationId` with the next message                         |
| `PATCH` | `/api/patients/:id/approve-draft` | Record staff approval; optional body `{ "draft": "reviewed text" }` saves reviewed text       |
| `PATCH` | `/api/patients/:id/complete`      | Mark a follow-up completed                                                                    |

| Status | Meaning                                                                                     |
| ------ | ------------------------------------------------------------------------------------------- |
| `200`  | Request completed; response message says what happened or whether there was no due patient. |
| `201`  | Patient created.                                                                            |
| `400`  | Invalid fields, malformed JSON, or invalid approval body; check `message` and `details`.    |
| `404`  | Route, patient ID, or conversation ID does not exist.                                       |
| `413`  | Request body exceeds the 1 MB limit.                                                        |
| `500`  | Server or local storage error.                                                              |
| `502`  | The selected provider rejected the request or failed to generate a response.                |
| `503`  | `AI_PROVIDER` is invalid or its API key is missing.                                         |
| `504`  | The selected provider did not respond within 60 seconds; retry the request.                 |

New patients need a 2–80 character name, a valid phone number, valid dates, and a follow-up date on or after the consultation date. Invalid input returns `400` with each invalid field listed under `details`.

Staff gets a draft from `GET /api/drafts/due-today`, reviews it, then calls the approval endpoint. The optional `draft` value stores the reviewed text. Approval does not send a WhatsApp message. A completed follow-up stays completed if staff later records draft approval. No sending endpoint exists.

To chat with the AI, send `{ "message": "..." }` to `/api/ai/chat`. The response includes a `conversationId`; send that ID with later messages to restore the saved context. Conversations are stored in `data/conversations.json` and survive server restarts.

## Test

```sh
npm test
```

There are currently no automated test files in the repository, so `npm test` discovers zero tests. Use the Postman collection or cURL examples below to check the API endpoints.

## Postman

Choose the collection for the API you want to use, then import it in Postman with **Import → File**:

- Local: [`postman/EPIA-Patient-Follow-Up.postman_collection.json`](postman/EPIA-Patient-Follow-Up.postman_collection.json) uses `http://localhost:3000`.
- Deployed: [`postman/EPIA-Patient-Follow-Up-Production.postman_collection.json`](postman/EPIA-Patient-Follow-Up-Production.postman_collection.json) uses `https://epai-submit.deskgo.in`.

Run the requests in order. Each collection sets today's date and saves the created patient and chat IDs automatically. The production collection creates fictional records on the hosted API. `postman/Postman-cURL-requests.txt` is for copying cURL commands into a terminal; it is not an importable Postman collection.

## Submission files

- `postman/Postman-cURL-requests.txt` has example requests.
