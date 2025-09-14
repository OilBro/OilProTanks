import assert from 'assert';
import fs from 'fs';
import path from 'path';

// This test validates that the generated openapi.json contains key schemas and paths
// It does not spin up the server (artifact-level contract test).

describe('OpenAPI Spec Artifact', () => {
  const specPath = path.join(process.cwd(), 'openapi.json');
  let spec: any;

  before(() => {
    assert.ok(fs.existsSync(specPath), 'openapi.json missing – run generator first');
    const raw = fs.readFileSync(specPath, 'utf-8');
    spec = JSON.parse(raw);
  });

  it('has basic info', () => {
    assert.equal(spec.openapi, '3.0.3');
    assert.equal(spec.info?.title, 'OilProTanks API');
  });

  it('includes core schemas', () => {
    const schemas = spec.components?.schemas || {};
    for (const key of ['Component','ComponentPatch','Nozzle','NozzlePatch','CmlPoint','CmlBulkRequest','ShellCourse','ShellCoursePatch','Appendix','WriteupPut','TminOverride']) {
      assert.ok(schemas[key], `Missing schema: ${key}`);
    }
  });

  it('components list path has pagination shape', () => {
    const p = spec.paths?.['/api/reports/{reportId}/components'];
    assert.ok(p, 'Missing components path');
    const get = p.get;
    assert.ok(get, 'Missing GET for components');
    const resp200 = get.responses?.['200'];
    assert.ok(resp200?.content?.['application/json']?.schema, 'Missing 200 schema');
    const obj = resp200.content['application/json'].schema;
    assert.equal(obj.type, 'object');
    assert.ok(obj.properties?.pagination, 'Expected pagination property');
    assert.equal(obj.properties.pagination.type, 'object');
  });

  it('nozzles path present', () => {
    assert.ok(spec.paths?.['/api/reports/{reportId}/nozzles'], 'Missing nozzles path');
  });
});
