# OilProTanks API Reference

Version: Draft (Generated automatically)

## General

- Base URL: `/api`
- Content-Type: `application/json`
- Error Format:

{
  "success": false,
  "message": "human readable message",
  "errors": { ...optional zod flatten() structure }
}

{
  "success": false,
  "message": "`human readable`",
  "errors": { ...optional zod flatten() structure }
}

```
{
  "success": false,
  "message": "<human readable>",
  "errors": { ...optional zod flatten() structure }
}
```

- Success Format (list):

{
  "success": false,
  "message": "<human readable>",
  "errors": { ...optional zod flatten() structure }
}

```
{ "success": true, "data": [ ... ] }
```

- Success Format (object):

```
{ "success": true, "data": { ... } }
```

## Health

### GET /api/health

Returns service health.

Response 200:

{
  "success": false,
  "message": "<human readable>",
  "errors": { ...optional zod flatten() structure }
}

```
{ ok: true }
```

## Reports

### POST /api/reports

Create a new inspection report (simplified creation used in tests/import).

Request Body (example minimal):

```
{ "tankId": "TST-1", "service": "crude", "diameter": "100", "height": "40" }
```

Response 201: `{ id: number, reportNumber: string, status: "in_progress", ... }`

### GET /api/reports/:reportId/status

Aggregated completion/status of report sections.
Response 200:

{
  "success": false,
  "message": "<human readable>",
  "errors": { ...optional zod flatten() structure }
}

```
{ success: true, data: { components: {...}, nozzles: {...}, cml: {...}, shellCourses: {...}, appendices: {...}, writeup: {...}, tminOverrides: {...} } }
```

## Components

### GET /api/reports/:reportId/components

List components.

### POST /api/reports/:reportId/components

Create component.
Validation Schema:

```
componentId: string (required)
componentType: enum(shell|floor|roof|nozzle|appurtenance|other)
description?: string|null
nominalThickness?: number|null
actualThickness?: number|null
previousThickness?: number|null
corrosionRate?: number|null
remainingLife?: number|null
governing?: boolean
notes?: string|null
```

Response 200:

```
{ success: true, data: { id?, reportId, componentId, componentType, ... } }
```

Errors: 400 invalid payload.

### PATCH /api/reports/:reportId/components/:id

Partial update (no validation middleware applied; free-form fields accepted).

### DELETE /api/reports/:reportId/components/:id

Delete component.

## Nozzles

### GET /api/reports/:reportId/nozzles

List nozzles.

### POST /api/reports/:reportId/nozzles

Create nozzle.

```
nozzleTag: string required
size?: string|null
service?: string|null
elevation?: number|null
orientation?: string|null
nominalThickness/actualThickness/previousThickness?: number|null
corrosionRate?: number|null
remainingLife?: number|null
tminPractical?: number|null
tminUser?: number|null
status?: enum(in_progress|complete|pending|review)|null
notes?: string|null
governing?: boolean
```

### PATCH /api/reports/:reportId/nozzles/:id

Partial update.

### DELETE /api/reports/:reportId/nozzles/:id

Delete nozzle.

## CML Points

### GET /api/reports/:reportId/cml-points`[?parentType=&parentId=&limit=&offset=]`

List CML points for a report. Optionally filter by parent component/nozzle and paginate.

Query Parameters:

```
parentType (optional): component | nozzle
parentId   (optional): number (must be used with parentType)
limit      (optional): number >0 <=500 (default 50) [future enhancement]
offset     (optional): number >=0 (default 0)        [future enhancement]
```

Examples:

```
GET /api/reports/12/cml-points
GET /api/reports/12/cml-points?parentType=component&parentId=34
GET /api/reports/12/cml-points?parentType=nozzle&parentId=7&limit=25&offset=50
```

Successful Response (filtered list):

```
{
  "success": true,
  "data": [
    {
      "id": 101,
      "reportId": 12,
      "parentType": "component",
      "parentId": 34,
      "cmlNumber": "C-12-01",
      "point1": 0.375,
      "point2": 0.372,
      "governingPoint": 0.372,
      "notes": null,
      "createdAt": "2025-09-14T03:12:55.123Z"
    }
  ],
  "pagination": { "limit": 50, "offset": 0 }
}
```

Error Responses:

```
400 { success:false, message:"Invalid parentId" }
400 { success:false, message:"parentType required when parentId provided" }
```

### POST /api/reports/:reportId/cml-points

Single CML point create.

```
parentType: enum(component|nozzle)
parentId: number
cmlNumber: string
point1..point6?: number|null
governingPoint?: number|null
notes?: string|null
```

### PUT /api/reports/:reportId/cml-points/bulk

Replace all CML points for a given parent.

```
parentType: enum(component|nozzle)
parentId: number|string (coerced)
points: [
  { cmlNumber: string, readings?: (number|null)[] (max 6), governingPoint?: number|null, notes?: string|null }
]
```

### DELETE /api/reports/:reportId/cml-points/:id

Delete point.

## Shell Courses

### GET /api/reports/:reportId/shell-courses

List shell courses.

### PUT /api/reports/:reportId/shell-courses

Replace all shell courses.

```
courses: [
  {
    courseNumber: number,
    courseHeight?: number|null,
    nominalThickness?: number|null,
    actualThickness?: number|null,
    previousThickness?: number|null,
    corrosionRate?: number|null,
    remainingLife?: number|null,
    jointEfficiency?: number|null,
    stress?: number|null,
    altStress?: number|null,
    tminCalc?: number|null,
    tminAlt?: number|null,
    fillHeight?: number|null,
    governing?: boolean,
    notes?: string|null
  }
] (must be non-empty)
```

### PATCH /api/reports/:reportId/shell-courses/:id

Partial update.

### DELETE /api/reports/:reportId/shell-courses/:id

Delete course.

## Appendices

### GET /api/reports/:reportId/appendices

List all appendices.

### GET /api/reports/:reportId/appendices/:code

Fetch single appendix by code (letter).

### PUT /api/reports/:reportId/appendices/:code

Create or update appendix (code uppercased).

```
subject?: string|null
defaultText?: string|null
userText?: string|null
applicable?: boolean
orderIndex?: number
```

## Writeup

### GET /api/reports/:reportId/writeup

Get the writeup record (or null).

### PUT /api/reports/:reportId/writeup

Create/update writeup.

```
executiveSummary?: string|null
utResultsSummary?: string|null
recommendationsSummary?: string|null
nextInternalYears?: number|null
nextExternalYears?: number|null
governingComponent?: string|null
```

### POST /api/reports/:reportId/writeup/freeze-narrative

Set `frozenNarrative=true`.

## Tmin Overrides

### GET /api/reports/:reportId/tmin-overrides

List overrides.

### POST /api/reports/:reportId/tmin-overrides

Create override.

```
referenceType: string
referenceId: number
defaultTmin?: number|null
overrideTmin?: number|null
reason?: string|null
```

### PATCH /api/reports/:reportId/tmin-overrides/:id

Partial update.

### DELETE /api/reports/:reportId/tmin-overrides/:id

Delete override.

## Validation Behavior

All create/replace endpoints above use the `validate(schema)` middleware. On failure a 400 response is returned with Zod's `flatten()` error structure. PATCH endpoints currently accept free-form bodies (future enhancement: field-level schemas).

## Enums

- componentType: `shell|floor|roof|nozzle|appurtenance|other`
- parentType: `component|nozzle`
- status: `in_progress|complete|pending|review`

## Notes / Future Enhancements

- Add auth & multi-tenant scoping.
- Field-level validation for PATCH routes.
- Pagination & filtering for large datasets (components, CML points).
- Consolidate status aggregator schema in docs.
- Add OpenAPI/Swagger generation based on Zod schemas.

## Environment Variables (Client Feature Flags)

The frontend (Vite) conditionally exposes feature UI based on `VITE_` prefixed environment variables.

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_AI_ANALYSIS_UI` | (unset/false) | When `true`, shows AI analysis confidence / success banner on the Import Reports page. When absent or not `true`, import proceeds silently without the banner. |
| `VITE_MAINTENANCE_UTILS_UI` | (unset/false) | When `true`, exposes maintenance utilities (orphan cleanup) section in the Import Reports page for operational diagnostics. Keep disabled in production unless required. |

Usage:
1. Copy `.env.example` to `.env`.
2. Set `VITE_AI_ANALYSIS_UI=true` to enable indicators.
3. Restart dev server (`vite`) for changes to take effect.

Security: Only `VITE_` variables are shipped to the browser; never store secrets in them.

## Feature Flags Endpoint

### GET /api/feature-flags

Returns non-sensitive UI feature flags so the client can reflect server-configured toggles.

Response 200:
```
{ "success": true, "flags": { "aiAnalysisUI": true, "maintenanceUtilsUI": false } }
```

Notes:
- Flags mirror corresponding `VITE_` environment variables set on the server build environment.
- Only expose boolean UI toggles (no secrets, tokens, or dynamic config with sensitive values).

----
Generated on 2025-09-13.
