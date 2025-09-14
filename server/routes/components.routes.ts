import type { Express } from 'express';
import { db } from '../db.ts';
import { eq } from 'drizzle-orm';
import { reportComponents, reportNozzles } from '../../shared/schema.ts';
import { validate, componentSchema, componentPatchSchema, nozzleSchema, nozzlePatchSchema } from '../validation-schemas.ts';

const parseId = (val: any) => { const n = Number(val); return Number.isFinite(n) ? n : undefined; };

export function registerComponentRoutes(app: Express) {
  app.get('/api/reports/:reportId/components', async (req, res) => {
    const reportId = parseId(req.params.reportId);
    if (!reportId) return res.status(400).json({ success:false, message:'Invalid reportId' });
    const limitRaw = req.query.limit as string | undefined;
    const offsetRaw = req.query.offset as string | undefined;
    let limit = 50; let offset = 0;
    if (limitRaw !== undefined) { const n = Number(limitRaw); if(Number.isFinite(n) && n > 0 && n <= 500) limit = Math.floor(n); }
    if (offsetRaw !== undefined) { const n = Number(offsetRaw); if(Number.isFinite(n) && n >= 0) offset = Math.floor(n); }
    const rows = await db.select().from(reportComponents).where(eq(reportComponents.reportId, reportId)).limit(limit).offset(offset);
    res.json({ success:true, data: rows, pagination:{ limit, offset } });
  });

  app.post('/api/reports/:reportId/components', validate(componentSchema), async (req, res) => {
    try {
      const reportId = parseId(req.params.reportId);
      if (!reportId) return res.status(400).json({ success:false, message:'Invalid reportId' });
      const body = req.body;
      const inserted = await db.insert(reportComponents).values({
        reportId,
        componentId: body.componentId,
        description: body.description || null,
        componentType: body.componentType || null,
        nominalThickness: body.nominalThickness || null,
        actualThickness: body.actualThickness || null,
        previousThickness: body.previousThickness || null,
        corrosionRate: body.corrosionRate || null,
        remainingLife: body.remainingLife || null,
        governing: body.governing || false,
        notes: body.notes || null,
        createdAt: new Date().toISOString()
      }).returning();
      const fallback = { reportId, componentId: body.componentId, description: body.description || null, componentType: body.componentType || null, nominalThickness: body.nominalThickness || null, actualThickness: body.actualThickness || null, previousThickness: body.previousThickness || null, corrosionRate: body.corrosionRate || null, remainingLife: body.remainingLife || null, governing: body.governing || false, notes: body.notes || null };
      res.json({ success:true, data: inserted[0] || fallback });
    } catch (e:any) { res.status(500).json({ success:false, message:e.message }); }
  });

  app.patch('/api/reports/:reportId/components/:id', validate(componentPatchSchema), async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success:false, message:'Invalid id'});
    const patch = { ...req.body };
    await db.update(reportComponents).set(patch).where(eq(reportComponents.id, id));
    res.json({ success:true });
  });

  app.delete('/api/reports/:reportId/components/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.delete(reportComponents).where(eq(reportComponents.id, id));
    res.json({ success:true });
  });
}

export function registerNozzleRoutes(app: Express) {
  app.get('/api/reports/:reportId/nozzles', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const limitRaw = req.query.limit as string | undefined;
    const offsetRaw = req.query.offset as string | undefined;
    let limit = 50; let offset = 0;
    if (limitRaw !== undefined) { const n = Number(limitRaw); if(Number.isFinite(n) && n > 0 && n <= 500) limit = Math.floor(n); }
    if (offsetRaw !== undefined) { const n = Number(offsetRaw); if(Number.isFinite(n) && n >= 0) offset = Math.floor(n); }
    const rows = await db.select().from(reportNozzles).where(eq(reportNozzles.reportId, reportId)).limit(limit).offset(offset);
    res.json({ success:true, data: rows, pagination:{ limit, offset } });
  });

  app.post('/api/reports/:reportId/nozzles', validate(nozzleSchema), async (req,res)=>{
    try {
      const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
      const body = req.body;
      const inserted = await db.insert(reportNozzles).values({
        reportId,
        nozzleTag: body.nozzleTag,
        size: body.size || null,
        service: body.service || null,
        elevation: body.elevation || null,
        orientation: body.orientation || null,
        nominalThickness: body.nominalThickness || null,
        actualThickness: body.actualThickness || null,
        previousThickness: body.previousThickness || null,
        corrosionRate: body.corrosionRate || null,
        remainingLife: body.remainingLife || null,
        tminPractical: body.tminPractical || null,
        tminUser: body.tminUser || null,
        status: body.status || null,
        governing: body.governing || false,
        notes: body.notes || null,
        createdAt: new Date().toISOString()
      }).returning();
      const fallback = { reportId, nozzleTag: body.nozzleTag, size: body.size || null, service: body.service || null, elevation: body.elevation || null, orientation: body.orientation || null, nominalThickness: body.nominalThickness || null, actualThickness: body.actualThickness || null, previousThickness: body.previousThickness || null, corrosionRate: body.corrosionRate || null, remainingLife: body.remainingLife || null, tminPractical: body.tminPractical || null, tminUser: body.tminUser || null, status: body.status || null, governing: body.governing || false, notes: body.notes || null };
      res.json({ success:true, data: inserted[0] || fallback });
    } catch(e:any) { res.status(500).json({ success:false, message:e.message }); }
  });

  app.patch('/api/reports/:reportId/nozzles/:id', validate(nozzlePatchSchema), async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    const patch = { ...req.body };
    await db.update(reportNozzles).set(patch).where(eq(reportNozzles.id, id));
    res.json({ success:true });
  });

  app.delete('/api/reports/:reportId/nozzles/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.delete(reportNozzles).where(eq(reportNozzles.id, id));
    res.json({ success:true });
  });
}
