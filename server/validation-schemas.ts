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

// --- Checklist validation schemas ---
export const checklistItemSchema = z.object({
  reportId: z.number(),
  item: z.string().min(1),
  status: z.enum(['ok', 'deficient', 'not_applicable']),
  notes: z.string().optional().nullable(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().nullable(),
  requiresFollowUp: z.boolean().optional()
});
export const checklistItemPatchSchema = checklistItemSchema.partial().omit({ reportId: true });

// --- Appurtenances validation schemas ---
export const appurtenanceSchema = z.object({
  reportId: z.number(),
  appurtenanceType: z.string().min(1),
  appurtenanceId: z.string().min(1),
  location: z.string().optional().nullable(),
  condition: z.enum(['good', 'fair', 'poor', 'defective']),
  findings: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  priority: z.enum(['urgent', 'high', 'medium', 'routine']).optional().nullable(),
  photosAttached: z.boolean().optional()
});
export const appurtenancePatchSchema = appurtenanceSchema.partial().omit({ reportId: true });

// --- Repair Recommendations validation schemas ---
export const recommendationSchema = z.object({
  reportId: z.number(),
  type: z.enum(['corrosion', 'structural', 'coating', 'foundation', 'other']),
  description: z.string().min(1),
  priority: z.enum(['urgent', 'high', 'medium', 'routine']),
  estimatedCost: z.number().optional().nullable(),
  timeframe: z.string().optional().nullable(),
  api653Reference: z.string().optional().nullable(),
  affectedComponent: z.string().optional().nullable()
});
export const recommendationPatchSchema = recommendationSchema.partial().omit({ reportId: true });

// --- Venting System validation schemas ---
export const ventingSystemSchema = z.object({
  reportId: z.number(),
  ventType: z.string().min(1),
  ventId: z.string().optional().nullable(), // Added ventId to match database schema
  ventSize: z.string().optional().nullable(),
  ventCount: z.number().optional().nullable(),
  condition: z.enum(['good', 'fair', 'poor', 'defective']),
  obstructions: z.boolean().optional(),
  findings: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  compliesWithAPI: z.boolean().optional()
});
export const ventingSystemPatchSchema = ventingSystemSchema.partial().omit({ reportId: true });

// --- Settlement Survey validation schemas ---
export const settlementSurveySchema = z.object({
  reportId: z.number(),
  surveyDate: z.string(),
  surveyMethod: z.string().optional().nullable(),
  maxSettlement: z.number().optional().nullable(),
  settlementLocation: z.string().optional().nullable(),
  uniform: z.boolean().optional(),
  differential: z.boolean().optional(),
  compliesWithAPI653: z.boolean().optional(),
  measurements: z.array(z.object({
    pointNumber: z.number(),
    angle: z.number(),
    elevation: z.number(),
    settlementValue: z.number().optional().nullable()
  })).optional()
});
export const settlementSurveyPatchSchema = settlementSurveySchema.partial().omit({ reportId: true });

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