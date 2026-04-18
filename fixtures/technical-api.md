# FileFlowOne API Reference

A comprehensive reference for the FileFlowOne REST conversion API. All endpoints accept JSON and return JSON unless otherwise noted.

## Authentication

All API requests must include a valid bearer token in the `Authorization` header.

```http
Authorization: Bearer <your_token>
```

Tokens are issued via the `/auth/token` endpoint and expire after 24 hours. Rotate tokens regularly to maintain security.

## Base URL

```
https://api.fileflowone.com/v1
```

All paths in this document are relative to this base URL.

---

## Endpoints

### POST /convert

Convert a file from one format to another.

**Request Body**

| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| fileBase64   | string | Yes      | Base64-encoded source file content       |
| fileName     | string | Yes      | Original filename including extension    |
| fromFormat   | string | Yes      | Source format code (e.g. `md`, `docx`)   |
| toFormat     | string | Yes      | Target format code (e.g. `html`, `pdf`)  |
| options      | object | No       | Format-specific conversion options       |

**Supported Format Pairs**

- `md` → `html`, `docx`, `pdf`, `txt`
- `html` → `md`, `docx`, `pdf`, `txt`
- `docx` → `md`, `html`, `pdf`, `txt`
- `pdf` → `md`, `html`, `txt`, `docx`

**Example Request**

```json
{
  "fileBase64": "IyBIZWxsbyBXb3JsZA==",
  "fileName": "document.md",
  "fromFormat": "md",
  "toFormat": "html",
  "options": {
    "mdHighlightCode": true
  }
}
```

**Success Response** `200 OK`

```json
{
  "success": true,
  "fileBase64": "PCFET0NUWVBFIGh0bWw+...",
  "fileName": "document.html",
  "mimeType": "text/html"
}
```

**Error Response** `400 Bad Request`

```json
{
  "success": false,
  "error": "Conversion from 'png' to 'docx' is not supported."
}
```

---

### POST /slm-score

Score semantic fidelity between two documents using the SFI algorithm.

**Request** — multipart/form-data

| Field          | Type | Required | Description              |
|----------------|------|----------|--------------------------|
| original_file  | file | Yes      | Source document          |
| converted_file | file | Yes      | Converted document       |

**Response**

```json
{
  "sfi_score": 0.847,
  "grade": "A",
  "breakdown": {
    "structural": { "score": 0.92, "weight": 0.35, "weighted": 0.322 },
    "semantic":   { "score": 0.81, "weight": 0.45, "weighted": 0.365 },
    "functional": { "score": 0.80, "weight": 0.20, "weighted": 0.160 }
  },
  "conversion_pair": { "source_format": "md", "target_format": "html" },
  "processing_time_ms": 412
}
```

**Grade Scale**

| Grade | SFI Range   | Meaning     |
|-------|-------------|-------------|
| A     | ≥ 0.85      | Excellent   |
| B     | 0.70 – 0.84 | Good        |
| C     | 0.55 – 0.69 | Fair        |
| D     | 0.40 – 0.54 | Poor        |
| F     | < 0.40      | Very Poor   |

---

### GET /health

Returns the health status of the backend service.

```json
{ "status": "ok" }
```

---

## Error Codes

| HTTP Status | Code                  | Description                                |
|-------------|-----------------------|--------------------------------------------|
| 400         | INVALID_FORMAT_PAIR   | Conversion pair not supported              |
| 400         | INVALID_REQUEST       | Malformed request body                     |
| 413         | FILE_TOO_LARGE        | Input file exceeds 50 MB limit             |
| 422         | EXTRACTION_FAILED     | Could not extract text from source file    |
| 503         | BACKEND_UNAVAILABLE   | Python scoring backend is not reachable    |

---

## Rate Limits

- Free tier: 100 conversions / hour
- Pro tier: 5,000 conversions / hour
- Enterprise: unlimited

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1712000000
```

## SDKs and Client Libraries

- [JavaScript/TypeScript SDK](https://github.com/fileflowone/sdk-js) — `npm install @fileflowone/sdk`
- [Python SDK](https://github.com/fileflowone/sdk-python) — `pip install fileflowone`
- [Go SDK](https://github.com/fileflowone/sdk-go) — `go get github.com/fileflowone/sdk-go`

## Changelog

### v1.2.0 — 2026-03-01
- Added PDF extraction via pdfminer.six for better text quality
- Improved DOCX heading detection for auto-generated documents
- SFI scoring now gives full structural score for lossy targets (PDF, TXT)

### v1.1.0 — 2026-01-15
- Round-trip chain scoring endpoint
- Batch conversion support (up to 20 files per request)

### v1.0.0 — 2025-12-01
- Initial public release
