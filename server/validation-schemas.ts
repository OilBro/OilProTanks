import { z } from 'zod';

// --- Domain Enums ---
export const componentTypeEnum = z.enum(['shell','floor','roof','nozzle','appurtenance','other']);
export const parentTypeEnum = z.enum(['component','nozzle']);
export const statusEnum = z.enum(['in_progress','complete','pending','review']);

// Component schema
export const componentSchema = z.object({
  componentId: z.string().min(1, 'componentId required'),
  componentType: componentTypeEnum,
  description: z.string().optional().nullable(),
  nominalThickness: z.number().optional().nullable(),
  actualThickness: z.number().optional().nullable(),
  previousThickness: z.number().optional().nullable(),
  corrosionRate: z.number().optional().nullable(),
  remainingLife: z.number().optional().nullable(),
  governing: z.boolean().optional(),
  notes: z.string().optional().nullable()
});
// Partial variant for PATCH
export const componentPatchSchema = componentSchema.partial();

export const nozzleSchema = z.object({
  nozzleTag: z.string().min(1, 'nozzleTag required'),
  size: z.string().optional().nullable(),
  service: z.string().optional().nullable(),
  elevation: z.number().optional().nullable(),
  orientation: z.string().optional().nullable(),
  nominalThickness: z.number().optional().nullable(),
  actualThickness: z.number().optional().nullable(),
  previousThickness: z.number().optional().nullable(),
  corrosionRate: z.number().optional().nullable(),
  remainingLife: z.number().optional().nullable(),
  tminPractical: z.number().optional().nullable(),
  tminUser: z.number().optional().nullable(),
  status: statusEnum.optional().nullable(),
  governing: z.boolean().optional(),
  notes: z.string().optional().nullable()
});
export const nozzlePatchSchema = nozzleSchema.partial();

export const cmlPointSchema = z.object({
  parentType: parentTypeEnum,
  parentId: z.number(),
  cmlNumber: z.string().min(1),
  point1: z.number().optional().nullable(),
  point2: z.number().optional().nullable(),
  point3: z.number().optional().nullable(),
  point4: z.number().optional().nullable(),
  point5: z.number().optional().nullable(),
  point6: z.number().optional().nullable(),
  governingPoint: z.number().optional().nullable(),
  notes: z.string().optional().nullable()
});
export const cmlPointPatchSchema = cmlPointSchema.partial();

export const cmlBulkSchema = z.object({
  parentType: parentTypeEnum,
  parentId: z.union([z.number(), z.string().transform(v => Number(v))]),
  points: z.array(z.object({
    cmlNumber: z.string().min(1),
    readings: z.array(z.number().nullable()).max(6).optional(),
    governingPoint: z.number().optional().nullable(),
    notes: z.string().optional().nullable()
  }))
});

export const shellCourseSchema = z.object({
  courseNumber: z.number(),
  courseHeight: z.number().optional().nullable(),
  nominalThickness: z.number().optional().nullable(),
  actualThickness: z.number().optional().nullable(),
  previousThickness: z.number().optional().nullable(),
  corrosionRate: z.number().optional().nullable(),
  remainingLife: z.number().optional().nullable(),
  jointEfficiency: z.number().optional().nullable(),
  stress: z.number().optional().nullable(),
  altStress: z.number().optional().nullable(),
  tminCalc: z.number().optional().nullable(),
  tminAlt: z.number().optional().nullable(),
  fillHeight: z.number().optional().nullable(),
  governing: z.boolean().optional(),
  notes: z.string().optional().nullable()
});

// Partial variant for patching an individual shell course
export const shellCoursePatchSchema = shellCourseSchema.partial();

export const shellCoursesPutSchema = z.object({
  courses: z.array(shellCourseSchema).min(1)
});

export const appendixSchema = z.object({
  subject: z.string().optional().nullable(),
  defaultText: z.string().optional().nullable(),
  userText: z.string().optional().nullable(),
  applicable: z.boolean().optional(),
  orderIndex: z.number().optional()
});

export const tminOverrideSchema = z.object({
  referenceType: z.string().min(1),
  referenceId: z.number(),
  defaultTmin: z.number().optional().nullable(),
  overrideTmin: z.number().optional().nullable(),
  reason: z.string().optional().nullable()
});

export const writeupPutSchema = z.object({
  executiveSummary: z.string().optional().nullable(),
  utResultsSummary: z.string().optional().nullable(),
  recommendationsSummary: z.string().optional().nullable(),
  nextInternalYears: z.number().optional().nullable(),
  nextExternalYears: z.number().optional().nullable(),
  governingComponent: z.string().optional().nullable()
});

export type ComponentInput = z.infer<typeof componentSchema>;
export type NozzleInput = z.infer<typeof nozzleSchema>;
export type CmlPointInput = z.infer<typeof cmlPointSchema>;
export type ShellCourseInput = z.infer<typeof shellCourseSchema>;
export type ShellCoursePatchInput = z.infer<typeof shellCoursePatchSchema>;

// --- Express validation middleware helper ---
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body ?? {});
    if(!parsed.success) {
      return res.status(400).json({ success:false, message: 'Validation failed', errors: parsed.error.flatten() });
    }
    req.body = parsed.data;
    next();
  };
}