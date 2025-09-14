import { writeFileSync } from 'fs';
import { z } from 'zod';
import { componentSchema, componentPatchSchema, nozzleSchema, nozzlePatchSchema, cmlPointSchema, cmlPointPatchSchema, cmlBulkSchema, shellCoursesPutSchema, appendixSchema, writeupPutSchema, tminOverrideSchema } from '../validation-schemas.ts';

type Z = typeof z;

function unwrap(schema: any): any {
  while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodEffects) {
    const def: any = schema._def;
    schema = def.innerType || def.schema || def.type || def.unwrap?.() || def.inner || schema;
    if (schema.unwrap) try { schema = schema.unwrap(); } catch { /* ignore */ }
  }
  return schema;
}

function convert(schema: any): any {
  const base = unwrap(schema);
  if (base instanceof z.ZodString) return { type: 'string' };
  if (base instanceof z.ZodNumber) return { type: 'number' };
  if (base instanceof z.ZodBoolean) return { type: 'boolean' };
  if (base instanceof z.ZodEnum) return { type: 'string', enum: base.options };
  if (base instanceof z.ZodArray) return { type: 'array', items: convert(base._def.type) };
  if (base instanceof z.ZodUnion) {
    return { oneOf: base._def.options.map((o: any)=>convert(o)) };
  }
  if (base instanceof z.ZodObject) {
    const shape = base._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const key of Object.keys(shape)) {
      properties[key] = convert(shape[key]);
      if (!shape[key].isOptional()) required.push(key);
    }
    return { type: 'object', properties, required: required.length?required:undefined };
  }
  return { description: 'Unsupported schema kind' };
}

const namedSchemas: Record<string, any> = {
  Component: componentSchema,
  ComponentPatch: componentPatchSchema,
  Nozzle: nozzleSchema,
  NozzlePatch: nozzlePatchSchema,
  CmlPoint: cmlPointSchema,
  CmlPointPatch: cmlPointPatchSchema,
  CmlBulkRequest: cmlBulkSchema,
  ShellCoursesPut: shellCoursesPutSchema,
  Appendix: appendixSchema,
  WriteupPut: writeupPutSchema,
  TminOverride: tminOverrideSchema
};

const components: Record<string, any> = {};
for (const [name, schema] of Object.entries(namedSchemas)) {
  components[name] = convert(schema);
}

const errorResponse = {
  description: 'Error',
  content: { 'application/json': { schema: { type: 'object', properties: { message: { type:'string' }, error:{ type:'string' }}}}}
};

const doc = {
  openapi: '3.0.3',
  info: { title: 'OilProTanks API', version: '0.2.0' },
  paths: {
    '/api/reports/{reportId}/components': {
      get: {
        summary: 'List components',
        parameters: [
          { name:'reportId', in:'path', required:true, schema:{ type:'integer' } },
          { name:'limit', in:'query', required:false, schema:{ type:'integer', minimum:1, maximum:500, default:50 } },
          { name:'offset', in:'query', required:false, schema:{ type:'integer', minimum:0, default:0 } }
        ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema: { type:'object', properties:{ success:{ type:'boolean' }, data:{ type:'array', items:{ $ref:'#/components/schemas/Component'} }, pagination:{ type:'object', properties:{ limit:{ type:'integer'}, offset:{ type:'integer'} }}}}}}}, '400': errorResponse }
      },
      post: {
        summary: 'Create component',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer' } } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/Component' }}}},
        responses: { '200': { description:'Created', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean' }, data:{ $ref:'#/components/schemas/Component'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/components/{id}': {
      patch: {
        summary: 'Update component (partial)',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/Component' }}}},
        responses: { '200': { description:'Updated', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      },
      delete: {
        summary: 'Delete component',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'Deleted', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/nozzles': {
      get: {
        summary: 'List nozzles',
        parameters: [
          { name:'reportId', in:'path', required:true, schema:{ type:'integer' } },
          { name:'limit', in:'query', required:false, schema:{ type:'integer', minimum:1, maximum:500, default:50 } },
          { name:'offset', in:'query', required:false, schema:{ type:'integer', minimum:0, default:0 } }
        ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema: { type:'object', properties:{ success:{ type:'boolean' }, data:{ type:'array', items:{ $ref:'#/components/schemas/Nozzle'} }, pagination:{ type:'object', properties:{ limit:{ type:'integer'}, offset:{ type:'integer'} }}}}}}}, '400': errorResponse }
      },
      post: {
        summary: 'Create nozzle',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/Nozzle' }}}},
        responses: { '200': { description:'Created', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean' }, data:{ $ref:'#/components/schemas/Nozzle'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/nozzles/{id}': {
      patch: {
        summary: 'Update nozzle (partial)',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/Nozzle' }}}},
        responses: { '200': { description:'Updated', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      },
      delete: {
        summary: 'Delete nozzle',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'Deleted', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/cml-points': {
      get: {
        summary: 'List CML points',
        parameters: [
          { name:'reportId', in:'path', required:true, schema:{ type:'integer'} },
          { name:'parentType', in:'query', required:false, schema:{ type:'string', enum:['component','nozzle'] } },
          { name:'parentId', in:'query', required:false, schema:{ type:'integer'} },
          { name:'limit', in:'query', required:false, schema:{ type:'integer', minimum:1, maximum:500, default:50 } },
          { name:'offset', in:'query', required:false, schema:{ type:'integer', minimum:0, default:0 } }
        ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean' }, data:{ type:'array', items:{ $ref:'#/components/schemas/CmlPoint'} }, pagination:{ type:'object', properties:{ limit:{ type:'integer'}, offset:{ type:'integer'}, total:{ type:'integer'} }}}}}}}, '400': errorResponse }
      },
      post: {
        summary: 'Create CML point',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/CmlPoint' }}}},
        responses: { '200': { description:'Created', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ $ref:'#/components/schemas/CmlPoint'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/cml-points/bulk': {
      put: {
        summary: 'Bulk replace CML points for parent',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/CmlBulkRequest' }}}},
        responses: { '200': { description:'Replaced', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ type:'array', items:{ $ref:'#/components/schemas/CmlPoint'} }}}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/cml-points/{id}': {
      delete: {
        summary: 'Delete CML point',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'Deleted', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/shell-courses': {
      get: {
        summary: 'List shell courses',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ type:'array', items:{ type:'object' }}}}}}}, '400': errorResponse }
      },
      put: {
        summary: 'Replace shell courses',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/ShellCoursesPut' }}}},
        responses: { '200': { description:'Replaced', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ type:'array', items:{ type:'object'} }}}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/shell-courses/{id}': {
      patch: {
        summary: 'Update shell course (partial)',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ type:'object' }}}},
        responses: { '200': { description:'Updated', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      },
      delete: {
        summary: 'Delete shell course',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'Deleted', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/appendices': {
      get: {
        summary: 'List appendices',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ type:'array', items:{ $ref:'#/components/schemas/Appendix'} }}}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/appendices/{code}': {
      get: {
        summary: 'Get appendix by code',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'code', in:'path', required:true, schema:{ type:'string'} } ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ $ref:'#/components/schemas/Appendix'} }}}}}, '400': errorResponse, '404': errorResponse }
      },
      put: {
        summary: 'Put appendix (create/update)',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} }, { name:'code', in:'path', required:true, schema:{ type:'string'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/Appendix'} } }},
        responses: { '200': { description:'Upserted', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ $ref:'#/components/schemas/Appendix'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/writeup': {
      get: {
        summary: 'Get report writeup',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ $ref:'#/components/schemas/WriteupPut'} }}}}}, '400': errorResponse }
      },
      put: {
        summary: 'Put report writeup',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/WriteupPut'} } }},
        responses: { '200': { description:'Upserted', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ $ref:'#/components/schemas/WriteupPut'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/writeup/freeze-narrative': {
      post: {
        summary: 'Freeze writeup narrative',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'Frozen', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse, '404': errorResponse }
      }
    },
    '/api/reports/{reportId}/tmin-overrides': {
      get: {
        summary: 'List Tmin overrides',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'OK', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ type:'array', items:{ $ref:'#/components/schemas/TminOverride'} }}}}}}, '400': errorResponse }
      },
      post: {
        summary: 'Create Tmin override',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/TminOverride'} } }},
        responses: { '200': { description:'Created', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'}, data:{ $ref:'#/components/schemas/TminOverride'} }}}}}, '400': errorResponse }
      }
    },
    '/api/reports/{reportId}/tmin-overrides/{id}': {
      patch: {
        summary: 'Patch Tmin override',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} },{ name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        requestBody: { required:true, content:{ 'application/json': { schema:{ $ref:'#/components/schemas/TminOverride'} } }},
        responses: { '200': { description:'Updated', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      },
      delete: {
        summary: 'Delete Tmin override',
        parameters: [ { name:'reportId', in:'path', required:true, schema:{ type:'integer'} },{ name:'id', in:'path', required:true, schema:{ type:'integer'} } ],
        responses: { '200': { description:'Deleted', content:{ 'application/json': { schema:{ type:'object', properties:{ success:{ type:'boolean'} }}}}}, '400': errorResponse }
      }
    }
  },
  components: { schemas: components }
};

writeFileSync('openapi.json', JSON.stringify(doc, null, 2));
console.log('openapi.json generated with paths');
