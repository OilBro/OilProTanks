import { writeFileSync } from 'fs';
import { z } from 'zod';
import {
  componentSchema,
  componentPatchSchema,
  nozzleSchema,
  nozzlePatchSchema,
  cmlPointSchema,
  cmlPointPatchSchema,
  cmlBulkSchema,
  shellCourseSchema,
  shellCoursePatchSchema,
  shellCoursesPutSchema,
  appendixSchema,
  writeupPutSchema,
  tminOverrideSchema
} from '../validation-schemas.ts';

// --- Schema Conversion Helpers ------------------------------------------------
function unwrap(schema: any): any {
  while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodEffects) {
    const def: any = schema._def;
    schema = def.innerType || def.schema || def.type || def.unwrap?.() || def.inner || schema;
    if (schema.unwrap) { try { schema = schema.unwrap(); } catch { /* ignore */ } }
  }
  return schema;
}

function convert(schema: any): any {
  const base = unwrap(schema);
  if (base instanceof z.ZodString) return { type: 'string' };
  if (base instanceof z.ZodNumber) return { type: 'number' };
  if (base instanceof z.ZodBoolean) return { type: 'boolean' };
  if (base instanceof z.ZodEnum) return { type: 'string', enum: (base as any).options };
  if (base instanceof z.ZodArray) return { type: 'array', items: convert(base._def.type) };
  if (base instanceof z.ZodUnion) return { oneOf: base._def.options.map((o: any) => convert(o)) };
  if (base instanceof z.ZodObject) {
    const shape = base._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const key of Object.keys(shape)) {
      properties[key] = convert(shape[key]);
      if (!shape[key].isOptional()) required.push(key);
    }
    return { type: 'object', properties, required: required.length ? required : undefined };
  }
  return { description: 'Unsupported schema kind' };
}

// --- Build Component Schemas ---------------------------------------------------
const namedSchemas: Record<string, z.ZodTypeAny> = {
  Component: componentSchema,
  ComponentPatch: componentPatchSchema,
  Nozzle: nozzleSchema,
  NozzlePatch: nozzlePatchSchema,
  CmlPoint: cmlPointSchema,
  CmlPointPatch: cmlPointPatchSchema,
  CmlBulkRequest: cmlBulkSchema,
  ShellCourse: shellCourseSchema,
  ShellCoursePatch: shellCoursePatchSchema,
  ShellCoursesPut: shellCoursesPutSchema,
  Appendix: appendixSchema,
  WriteupPut: writeupPutSchema,
  TminOverride: tminOverrideSchema
};

const schemaDefinitions: Record<string, any> = {};
for (const [name, schema] of Object.entries(namedSchemas)) {
  schemaDefinitions[name] = convert(schema);
}

// --- Reusable Snippets ---------------------------------------------------------
const successBool = { success: { type: 'boolean' } };
const paged = {
  pagination: {
    type: 'object',
    properties: {
      limit: { type: 'integer' },
      offset: { type: 'integer' },
      total: { type: 'integer' }
    }
  }
};

const errorResponse = {
  description: 'Error',
  content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, error: { type: 'string' } } } } }
};

function okJson(schema: any) {
  return { description: 'OK', content: { 'application/json': { schema } } };
}

function envelope(dataSchema: any, extra: Record<string, any> = {}) {
  return {
    type: 'object',
    properties: { ...successBool, data: dataSchema, ...extra }
  };
}

function arrayOf(ref: string) { return { type: 'array', items: { $ref: ref } }; }

// Parameter helpers
const pathId = (name: string) => ({ name, in: 'path', required: true, schema: { type: 'integer' } });

// --- Paths ---------------------------------------------------------------------
const paths: Record<string, any> = {};

// Components
paths['/api/reports/{reportId}/components'] = {
  get: {
    summary: 'List components',
    parameters: [pathId('reportId'),
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
      { name: 'offset', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } }
    ],
    responses: {
      200: okJson(envelope(arrayOf('#/components/schemas/Component'), { pagination: paged.pagination })),
      400: errorResponse
    }
  },
  post: {
    summary: 'Create component',
    parameters: [pathId('reportId')],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Component' } } } },
    responses: { 200: okJson(envelope({ $ref: '#/components/schemas/Component' })), 400: errorResponse }
  }
};
paths['/api/reports/{reportId}/components/{id}'] = {
  patch: {
    summary: 'Update component (partial)',
    parameters: [pathId('reportId'), pathId('id')],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ComponentPatch' } } } },
    responses: { 200: okJson(envelope({})), 400: errorResponse }
  },
  delete: { summary: 'Delete component', parameters: [pathId('reportId'), pathId('id')], responses: { 200: okJson(envelope({})), 400: errorResponse } }
};

// Nozzles
paths['/api/reports/{reportId}/nozzles'] = {
  get: {
    summary: 'List nozzles',
    parameters: [pathId('reportId'),
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
      { name: 'offset', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } }
    ],
    responses: { 200: okJson(envelope(arrayOf('#/components/schemas/Nozzle'), { pagination: paged.pagination })), 400: errorResponse }
  },
  post: {
    summary: 'Create nozzle', parameters: [pathId('reportId')],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Nozzle' } } } },
    responses: { 200: okJson(envelope({ $ref: '#/components/schemas/Nozzle' })), 400: errorResponse }
  }
};
paths['/api/reports/{reportId}/nozzles/{id}'] = {
  patch: {
    summary: 'Update nozzle (partial)', parameters: [pathId('reportId'), pathId('id')],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NozzlePatch' } } } },
    responses: { 200: okJson(envelope({})), 400: errorResponse }
  },
  delete: { summary: 'Delete nozzle', parameters: [pathId('reportId'), pathId('id')], responses: { 200: okJson(envelope({})), 400: errorResponse } }
};

// CML Points
paths['/api/reports/{reportId}/cml-points'] = {
  get: {
    summary: 'List CML points',
    parameters: [pathId('reportId'),
      { name: 'parentType', in: 'query', required: false, schema: { type: 'string', enum: ['component', 'nozzle'] } },
      { name: 'parentId', in: 'query', required: false, schema: { type: 'integer' } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 } },
      { name: 'offset', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } }
    ],
    responses: { 200: okJson(envelope(arrayOf('#/components/schemas/CmlPoint'), { pagination: paged.pagination })), 400: errorResponse }
  },
  post: {
    summary: 'Create CML point', parameters: [pathId('reportId')],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CmlPoint' } } } },
    responses: { 200: okJson(envelope({ $ref: '#/components/schemas/CmlPoint' })), 400: errorResponse }
  }
};
paths['/api/reports/{reportId}/cml-points/bulk'] = {
  put: {
    summary: 'Bulk replace CML points for parent', parameters: [pathId('reportId')],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CmlBulkRequest' } } } },
    responses: { 200: okJson(envelope(arrayOf('#/components/schemas/CmlPoint'))), 400: errorResponse }
  }
};
paths['/api/reports/{reportId}/cml-points/{id}'] = {
  delete: { summary: 'Delete CML point', parameters: [pathId('reportId'), pathId('id')], responses: { 200: okJson(envelope({})), 400: errorResponse } }
};

// Shell Courses
paths['/api/reports/{reportId}/shell-courses'] = {
  get: { summary: 'List shell courses', parameters: [pathId('reportId')], responses: { 200: okJson(envelope(arrayOf('#/components/schemas/ShellCourse'))), 400: errorResponse } },
  put: { summary: 'Replace shell courses', parameters: [pathId('reportId')], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ShellCoursesPut' } } } }, responses: { 200: okJson(envelope(arrayOf('#/components/schemas/ShellCourse'))), 400: errorResponse } }
};
paths['/api/reports/{reportId}/shell-courses/{id}'] = {
  patch: { summary: 'Update shell course (partial)', parameters: [pathId('reportId'), pathId('id')], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ShellCoursePatch' } } } }, responses: { 200: okJson(envelope({})), 400: errorResponse } },
  delete: { summary: 'Delete shell course', parameters: [pathId('reportId'), pathId('id')], responses: { 200: okJson(envelope({})), 400: errorResponse } }
};

// Appendices
paths['/api/reports/{reportId}/appendices'] = {
  get: { summary: 'List appendices', parameters: [pathId('reportId')], responses: { 200: okJson(envelope(arrayOf('#/components/schemas/Appendix'))), 400: errorResponse } }
};
paths['/api/reports/{reportId}/appendices/{code}'] = {
  get: { summary: 'Get appendix by code', parameters: [pathId('reportId'), { name: 'code', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: okJson(envelope({ $ref: '#/components/schemas/Appendix' })), 400: errorResponse, 404: errorResponse } },
  put: { summary: 'Put appendix (create/update)', parameters: [pathId('reportId'), { name: 'code', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Appendix' } } } }, responses: { 200: okJson(envelope({ $ref: '#/components/schemas/Appendix' })), 400: errorResponse } }
};

// Writeup
paths['/api/reports/{reportId}/writeup'] = {
  get: { summary: 'Get report writeup', parameters: [pathId('reportId')], responses: { 200: okJson(envelope({ $ref: '#/components/schemas/WriteupPut' })), 400: errorResponse } },
  put: { summary: 'Put report writeup', parameters: [pathId('reportId')], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WriteupPut' } } } }, responses: { 200: okJson(envelope({ $ref: '#/components/schemas/WriteupPut' })), 400: errorResponse } }
};
paths['/api/reports/{reportId}/writeup/freeze-narrative'] = {
  post: { summary: 'Freeze writeup narrative', parameters: [pathId('reportId')], responses: { 200: okJson(envelope({})), 400: errorResponse, 404: errorResponse } }
};

// Tmin Overrides
paths['/api/reports/{reportId}/tmin-overrides'] = {
  get: { summary: 'List Tmin overrides', parameters: [pathId('reportId')], responses: { 200: okJson(envelope(arrayOf('#/components/schemas/TminOverride'))), 400: errorResponse } },
  post: { summary: 'Create Tmin override', parameters: [pathId('reportId')], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TminOverride' } } } }, responses: { 200: okJson(envelope({ $ref: '#/components/schemas/TminOverride' })), 400: errorResponse } }
};
paths['/api/reports/{reportId}/tmin-overrides/{id}'] = {
  patch: { summary: 'Patch Tmin override', parameters: [pathId('reportId'), pathId('id')], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TminOverride' } } } }, responses: { 200: okJson(envelope({})), 400: errorResponse } },
  delete: { summary: 'Delete Tmin override', parameters: [pathId('reportId'), pathId('id')], responses: { 200: okJson(envelope({})), 400: errorResponse } }
};

// --- Final Document ------------------------------------------------------------
const doc = {
  openapi: '3.0.3',
  info: { title: 'OilProTanks API', version: '0.3.0' },
  paths,
  components: { schemas: schemaDefinitions }
};

writeFileSync('openapi.json', JSON.stringify(doc, null, 2));
console.log('openapi.json generated (reconstructed)');

