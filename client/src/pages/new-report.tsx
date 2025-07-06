import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ThicknessTable } from "@/components/thickness-table";
import { ReportPreviewModal } from "@/components/report-preview-modal";
import { AppurtenanceInspection } from "@/components/appurtenance-inspection";
import { RepairRecommendations } from "@/components/repair-recommendations";
import { VentingSystemInspection } from "@/components/venting-system-inspection";
import { ReportAttachments } from "@/components/report-attachments";
import { SettlementDataEntry } from "@/components/settlement-data-entry";
import { SettlementSurvey } from "@/components/settlement-survey";
import { NDETestLocations } from "@/components/nde-test-locations";
import { SecondaryContainment } from "@/components/secondary-containment";
import { VisualDocumentation } from "@/components/visual-documentation";
import { HelpTooltip } from "@/components/help-tooltip";
import { insertInspectionReportSchema } from "@shared/schema";
import { z } from "zod";
import type { 
  InspectionReport, 
  ThicknessMeasurement, 
  InspectionChecklist,
  AppurtenanceInspection as AppurtenanceInspectionType,
  RepairRecommendation,
  VentingSystemInspection as VentingSystemInspectionType,
  ReportAttachment
} from "@shared/schema";

// CORRECTED: Proper unit definitions and types
interface UnitValue {
  value: number;
  unit: string;
}

interface DimensionValue extends UnitValue {
  unit: 'ft' | 'in' | 'm' | 'mm';
}

interface VolumeValue extends UnitValue {
  unit: 'gal' | 'bbl' | 'L' | 'm3' | 'ft3';
}

interface ThicknessValue extends UnitValue {
  unit: 'in' | 'mm' | 'mils';
}

interface PressureValue extends UnitValue {
  unit: 'psi' | 'bar' | 'kPa' | 'MPa';
}

// CORRECTED: Utility functions for unit conversions
const UnitConverter = {
  // Length conversions to feet
  toFeet: (value: number, fromUnit: string): number => {
    const conversions: Record<string, number> = {
      'ft': 1,
      'in': 1/12,
      'm': 3.28084,
      'mm': 0.00328084
    };
    return value * (conversions[fromUnit] || 1);
  },
  
  // Volume conversions to gallons
  toGallons: (value: number, fromUnit: string): number => {
    const conversions: Record<string, number> = {
      'gal': 1,
      'bbl': 42,
      'L': 0.264172,
      'm3': 264.172,
      'ft3': 7.48052
    };
    return value * (conversions[fromUnit] || 1);
  },
  
  // Thickness conversions to inches
  toInches: (value: number, fromUnit: string): number => {
    const conversions: Record<string, number> = {
      'in': 1,
      'mm': 0.0393701,
      'mils': 0.001
    };
    return value * (conversions[fromUnit] || 1);
  },
  
  // Pressure conversions to PSI
  toPSI: (value: number, fromUnit: string): number => {
    const conversions: Record<string, number> = {
      'psi': 1,
      'bar': 14.5038,
      'kPa': 0.145038,
      'MPa': 145.038
    };
    return value * (conversions[fromUnit] || 1);
  }
};

// Additional interfaces for new components
interface SettlementPoint {
  point: number;
  angle: number;
  elevation: number;
  distance: number;
  elevationUnit: 'ft' | 'in' | 'm' | 'mm';
  distanceUnit: 'ft' | 'in' | 'm' | 'mm';
}

interface SettlementData {
  referenceElevation: number;
  referenceElevationUnit: 'ft' | 'in' | 'm' | 'mm';
  points: SettlementPoint[];
  maxDifferentialSettlement: number;
  maxDifferentialSettlementUnit: 'ft' | 'in' | 'm' | 'mm';
  analysisMethod: 'circumferential' | 'differential';
  notes: string;
}

interface NDEResult {
  id: number;
  testType: 'UT' | 'MT' | 'PT' | 'VT' | 'RT' | 'ET';
  location: string;
  component: string;
  gridReference?: string;
  testMethod: string;
  acceptance: 'pass' | 'fail' | 'conditional';
  discontinuityType?: string;
  discontinuitySize?: number;
  discontinuitySizeUnit?: 'in' | 'mm';
  discontinuityDepth?: number;
  discontinuityDepthUnit?: 'in' | 'mm' | '%';
  repairRequired: boolean;
  testDate: string;
  technician: string;
  equipment: string;
  findings: string;
}

interface ContainmentComponent {
  id: number;
  componentType: 'dyke' | 'liner' | 'drain' | 'sump' | 'valve' | 'piping' | 'foundation';
  location: string;
  material: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  findings: string;
  dimensions?: number;
  dimensionsUnit?: 'ft' | 'in' | 'm' | 'mm';
  capacity?: number;
  capacityUnit?: 'gal' | 'bbl' | 'L' | 'm3' | 'ft3';
  repairRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ContainmentSystem {
  systemType: 'earthen_dyke' | 'concrete_dyke' | 'synthetic_liner' | 'clay_liner' | 'composite';
  capacity: number;
  capacityUnit: 'gal' | 'bbl' | 'L' | 'm3' | 'ft3';
  drainageSystem: boolean;
  monitoring: boolean;
  components: ContainmentComponent[];
  overallCondition: 'satisfactory' | 'marginal' | 'unsatisfactory';
  complianceStatus: 'compliant' | 'non_compliant' | 'conditional';
  notes: string;
}
import { useLocation } from "wouter";

// CORRECTED: Enhanced service options with proper categorization
const SERVICE_OPTIONS = [
  { value: "crude_oil", label: "Crude Oil", category: "petroleum" },
  { value: "diesel", label: "Diesel Fuel", category: "petroleum" },
  { value: "gasoline", label: "Gasoline", category: "petroleum" },
  { value: "jet_fuel", label: "Jet Fuel", category: "petroleum" },
  { value: "heating_oil", label: "Heating Oil", category: "petroleum" },
  { value: "lubricating_oil", label: "Lubricating Oil", category: "petroleum" },
  { value: "water", label: "Water", category: "utility" },
  { value: "wastewater", label: "Wastewater", category: "utility" },
  { value: "chemical", label: "Chemical Product", category: "chemical" },
  { value: "other", label: "Other (Specify)", category: "other" }
];

// CORRECTED: Tank construction standards with proper API references
const CONSTRUCTION_STANDARDS = [
  { value: "api_650", label: "API 650 - Welded Steel Tanks" },
  { value: "api_12c", label: "API RP 12C - Bolted Tanks" },
  { value: "api_12d", label: "API RP 12D - Field Welded Tanks" },
  { value: "api_12f", label: "API RP 12F - Shop Welded Tanks" },
  { value: "awwa_d100", label: "AWWA D100 - Water Storage Tanks" },
  { value: "ul_142", label: "UL 142 - Steel Aboveground Tanks" },
  { value: "asme_viii", label: "ASME Section VIII - Pressure Vessels" },
  { value: "other", label: "Other Standard" }
];

// CORRECTED: Material specifications with proper grades
const SHELL_MATERIALS = [
  { value: "carbon_steel_a36", label: "Carbon Steel - ASTM A36" },
  { value: "carbon_steel_a283c", label: "Carbon Steel - ASTM A283 Grade C" },
  { value: "carbon_steel_a285c", label: "Carbon Steel - ASTM A285 Grade C" },
  { value: "carbon_steel_a516_70", label: "Carbon Steel - ASTM A516 Grade 70" },
  { value: "stainless_304", label: "Stainless Steel - 304" },
  { value: "stainless_316", label: "Stainless Steel - 316" },
  { value: "aluminum", label: "Aluminum Alloy" },
  { value: "other", label: "Other Material" }
];

// CORRECTED: Roof types with proper API 653 classifications
const ROOF_TYPES = [
  { value: "fixed_cone", label: "Fixed Cone Roof" },
  { value: "fixed_dome", label: "Fixed Dome Roof" },
  { value: "external_floating", label: "External Floating Roof" },
  { value: "internal_floating", label: "Internal Floating Roof" },
  { value: "umbrella", label: "Umbrella Roof" },
  { value: "geodesic", label: "Geodesic Dome" },
  { value: "other", label: "Other Type" }
];

// CORRECTED: Foundation types with engineering classifications
const FOUNDATION_TYPES = [
  { value: "concrete_pad", label: "Concrete Pad" },
  { value: "concrete_ring_wall", label: "Concrete Ring Wall" },
  { value: "compacted_earth", label: "Compacted Earth" },
  { value: "gravel_pad", label: "Gravel Pad" },
  { value: "asphalt", label: "Asphalt" },
  { value: "other", label: "Other Foundation" }
];

// CORRECTED: Enhanced checklist with proper API 653 requirements
const DEFAULT_CHECKLIST_ITEMS = [
  // External Inspection Items (API 653 Section 6.3)
  { category: "external", item: "Foundation condition and settlement assessment", checked: false, required: true },
  { category: "external", item: "Shell external visual examination", checked: false, required: true },
  { category: "external", item: "Coating and corrosion protection evaluation", checked: false, required: true },
  { category: "external", item: "Appurtenances and attachments inspection", checked: false, required: true },
  { category: "external", item: "Roof structure and condition assessment", checked: false, required: true },
  { category: "external", item: "Venting system inspection", checked: false, required: false },
  { category: "external", item: "Secondary containment evaluation", checked: false, required: false },
  
  // Internal Inspection Items (API 653 Section 6.4)
  { category: "internal", item: "Bottom plate condition assessment", checked: false, required: true },
  { category: "internal", item: "Shell internal visual examination", checked: false, required: true },
  { category: "internal", item: "Roof structure internal inspection", checked: false, required: true },
  { category: "internal", item: "Internal appurtenances and fittings check", checked: false, required: true },
  { category: "internal", item: "Weld joint examination", checked: false, required: true },
  { category: "internal", item: "Corrosion and pitting assessment", checked: false, required: true },
  
  // Thickness Testing (API 653 Section 6.5)
  { category: "thickness", item: "Shell course thickness measurements", checked: false, required: true },
  { category: "thickness", item: "Bottom plate thickness measurements", checked: false, required: true },
  { category: "thickness", item: "Roof plate thickness measurements", checked: false, required: false },
  { category: "thickness", item: "Nozzle and attachment thickness check", checked: false, required: true }
];

export default function NewReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<ThicknessMeasurement[]>([]);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST_ITEMS);
  const [appurtenanceInspections, setAppurtenanceInspections] = useState<AppurtenanceInspectionType[]>([]);
  const [repairRecommendations, setRepairRecommendations] = useState<RepairRecommendation[]>([]);
  const [ventingInspections, setVentingInspections] = useState<VentingSystemInspectionType[]>([]);
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [settlementData, setSettlementData] = useState<SettlementData>({
    referenceElevation: null,
    referenceElevationUnit: 'ft',
    points: [],
    maxDifferentialSettlement: null,
    maxDifferentialSettlementUnit: 'in',
    analysisMethod: '',
    notes: ''
  });
  
  const [settlementSurveyData, setSettlementSurveyData] = useState({
    referenceElevation: null,
    measurementDate: '',
    instrument: '',
    points: [] as any[],
    analysisNotes: ''
  });
  const [ndeResults, setNDEResults] = useState<any[]>([]);
  const [containmentData, setContainmentData] = useState<ContainmentSystem>({
    systemType: '',
    capacity: null,
    capacityUnit: 'gal',
    drainageSystem: false,
    monitoring: false,
    components: [],
    overallCondition: '',
    complianceStatus: '',
    notes: ''
  });

  const [visualDocuments, setVisualDocuments] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [createdReport, setCreatedReport] = useState<InspectionReport | null>(null);

  // CORRECTED: Enhanced form with proper unit handling
  const form = useForm({
    // Disable strict validation to prevent auto-focus issues
    resolver: undefined,
    defaultValues: {
      reportNumber: '',
      tankId: '',
      service: '',
      diameter: null,
      diameterUnit: 'ft',
      height: null,
      heightUnit: 'ft',
      capacity: null,
      capacityUnit: 'gal',
      inspector: '',
      inspectionDate: '',
      originalThickness: null,
      originalThicknessUnit: 'in',
      yearsSinceLastInspection: null,
      constructionStandard: '',
      shellMaterial: '',
      roofType: '',
      foundationType: '',
      designPressure: null,
      designPressureUnit: 'psi',
      operatingPressure: null,
      operatingPressureUnit: 'psi',
      designTemperature: null,
      operatingTemperature: null,
      specificGravity: null,
      corrosionAllowance: null,
      corrosionAllowanceUnit: 'in',
      status: ''
    },
    mode: 'onSubmit',
    shouldFocusError: false,
    shouldUseNativeValidation: false
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/reports', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create report');
      }
      return response.json();
    },
    onSuccess: (report: InspectionReport) => {
      setCreatedReport(report);
      toast({
        title: "Report Created",
        description: "Your inspection report has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create report. Please try again.",
        variant: "destructive",
      });
    }
  });

  const saveMeasurementsMutation = useMutation({
    mutationFn: async ({ reportId, measurements }: { reportId: number; measurements: ThicknessMeasurement[] }) => {
      const promises = measurements.map(measurement =>
        apiRequest('POST', `/api/reports/${reportId}/measurements`, {
          component: measurement.component,
          location: measurement.location,
          measurementType: measurement.measurementType || 'shell',
          currentThickness: measurement.currentThickness ? (typeof measurement.currentThickness === 'string' ? parseFloat(measurement.currentThickness) : measurement.currentThickness) : 0,
          originalThickness: measurement.originalThickness || null,
          corrosionRate: typeof measurement.corrosionRate === 'string' ? parseFloat(measurement.corrosionRate) : measurement.corrosionRate,
          remainingLife: typeof measurement.remainingLife === 'string' ? parseFloat(measurement.remainingLife) : measurement.remainingLife,
          status: measurement.status,
          elevation: measurement.elevation || null,
          createdAt: new Date().toISOString()
        })
      );
      return Promise.all(promises);
    }
  });

  const saveChecklistMutation = useMutation({
    mutationFn: async ({ reportId, checklist }: { reportId: number; checklist: typeof DEFAULT_CHECKLIST_ITEMS }) => {
      const promises = checklist.map(item =>
        apiRequest('POST', `/api/reports/${reportId}/checklists`, {
          category: item.category,
          item: item.item,
          checked: item.checked
        })
      );
      return Promise.all(promises);
    }
  });

  const onSubmit = async (data: any) => {
    try {
      console.log('Form data before validation:', data);
      
      // Validate required fields manually (without causing focus issues)
      if (!data.reportNumber || !data.tankId) {
        toast({
          title: "Missing Required Fields",
          description: "Please fill in at least Report Number and Tank ID.",
          variant: "destructive",
        });
        return;
      }

      // Process data with unit conversions - NO DEFAULTS per user requirement
      const processedData = {
        reportNumber: data.reportNumber || null,
        tankId: data.tankId || null,
        service: data.service || null,
        // Convert all dimensions to standard units for storage (as strings for decimal columns)
        diameter: data.diameter ? UnitConverter.toFeet(data.diameter, data.diameterUnit || 'ft').toString() : null,
        height: data.height ? UnitConverter.toFeet(data.height, data.heightUnit || 'ft').toString() : null,
        capacity: data.capacity ? UnitConverter.toGallons(data.capacity, data.capacityUnit || 'gal').toString() : null,
        inspector: data.inspector || null,
        inspectionDate: data.inspectionDate || null,
        originalThickness: data.originalThickness ? UnitConverter.toInches(data.originalThickness, data.originalThicknessUnit || 'in').toString() : null,
        yearsSinceLastInspection: data.yearsSinceLastInspection ? parseInt(data.yearsSinceLastInspection) : null,
        constructionStandard: data.constructionStandard || null,
        shellMaterial: data.shellMaterial || null,
        roofType: data.roofType || null,
        foundationType: data.foundationType || null,
        designPressure: data.designPressure ? UnitConverter.toPSI(data.designPressure, data.designPressureUnit || 'psi') : null,
        operatingPressure: data.operatingPressure ? UnitConverter.toPSI(data.operatingPressure, data.operatingPressureUnit || 'psi') : null,
        designTemperature: data.designTemperature || null,
        operatingTemperature: data.operatingTemperature || null,
        specificGravity: data.specificGravity || null,
        corrosionAllowance: data.corrosionAllowance ? UnitConverter.toInches(data.corrosionAllowance, data.corrosionAllowanceUnit || 'in') : null,
        status: data.status || null
      };

      console.log('Processed data to send:', processedData);

      const report = await createReportMutation.mutateAsync(processedData);
      
      if (measurements.length > 0) {
        await saveMeasurementsMutation.mutateAsync({ 
          reportId: report.id, 
          measurements 
        });
      }
      
      await saveChecklistMutation.mutateAsync({ 
        reportId: report.id, 
        checklist 
      });
      
      toast({
        title: "Report Created Successfully",
        description: `Report ${data.reportNumber} has been saved.`,
      });
      
      setLocation('/');
    } catch (error: any) {
      console.error('Failed to save report - Full error:', error);
      console.error('Error response:', error?.response);
      console.error('Error message:', error?.message);
      
      const errorMessage = error?.response?.data?.message || error?.message || "Unable to save the report. Please try again.";
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePreviewReport = () => {
    const formData = form.getValues();
    if (!formData.reportNumber || !formData.tankId) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least the report number and tank ID to preview.",
        variant: "destructive",
      });
      return;
    }
    
    // Create a temporary report object for preview
    const previewReport: InspectionReport = {
      id: 0,
      ...formData,
      diameter: formData.diameter ? formData.diameter.toString() : null,
      height: formData.height ? formData.height.toString() : null,
      originalThickness: formData.originalThickness ? formData.originalThickness.toString() : null,
      yearsSinceLastInspection: formData.yearsSinceLastInspection || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setCreatedReport(previewReport);
    setShowPreview(true);
  };

  const updateChecklistItem = (index: number, checked: boolean) => {
    const updated = [...checklist];
    updated[index].checked = checked;
    setChecklist(updated);
  };

  const watchedValues = form.watch();
  const originalThickness = watchedValues.originalThickness || 0;
  const yearsSince = watchedValues.yearsSinceLastInspection || 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">New Inspection Report</h2>
        <p className="text-gray-600">Create a new API 653 tank inspection report</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center text-blue-600">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white text-sm font-semibold">1</div>
              <span className="ml-2 text-sm font-medium">Basic Info</span>
            </div>
          </div>
          <div className="flex-1 mx-4 h-1 bg-gray-200 rounded">
            <div className="h-1 bg-blue-600 rounded" style={{ width: "33%" }}></div>
          </div>
          <div className="flex items-center text-gray-400">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-gray-600 text-sm font-semibold">2</div>
            <span className="ml-2 text-sm font-medium">Measurements</span>
          </div>
          <div className="flex-1 mx-4 h-1 bg-gray-200 rounded"></div>
          <div className="flex items-center text-gray-400">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-gray-600 text-sm font-semibold">3</div>
            <span className="ml-2 text-sm font-medium">Review</span>
          </div>
        </div>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }}
        className="space-y-8"
      >
        {/* Form Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tank Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tank Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportNumber">Report Number</Label>
                  <Input
                    id="reportNumber"
                    placeholder="RPT-2024-XXX"
                    tabIndex={1}
                    {...form.register('reportNumber')}
                  />
                  {form.formState.errors.reportNumber && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.reportNumber.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="tankId">Tank ID</Label>
                  <Input
                    id="tankId"
                    placeholder="TANK-101A"
                    tabIndex={2}
                    {...form.register('tankId')}
                  />
                  {form.formState.errors.tankId && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.tankId.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="service">Service</Label>
                  <Select value={watchedValues.service} onValueChange={(value) => form.setValue('service', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.service && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.service.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="diameter">Diameter</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="diameter"
                        type="number"
                        step="0.1"
                        placeholder="120"
                        tabIndex={4}
                        {...form.register('diameter', { valueAsNumber: true })}
                        className="flex-1"
                      />
                      <Select value={watchedValues.diameterUnit} onValueChange={(value) => form.setValue('diameterUnit', value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ft">ft</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="height">Height</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="height"
                        type="number"
                        step="0.1"
                        placeholder="48"
                        {...form.register('height', { valueAsNumber: true })}
                        className="flex-1"
                      />
                      <Select value={watchedValues.heightUnit} onValueChange={(value) => form.setValue('heightUnit', value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ft">ft</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspection Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="inspector">Inspector</Label>
                  <Input
                    id="inspector"
                    placeholder="John Smith"
                    tabIndex={6}
                    {...form.register('inspector')}
                  />
                  {form.formState.errors.inspector && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.inspector.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="inspectionDate">Inspection Date</Label>
                  <Input
                    id="inspectionDate"
                    type="date"
                    tabIndex={7}
                    {...form.register('inspectionDate')}
                  />
                  {form.formState.errors.inspectionDate && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.inspectionDate.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="originalThickness">Original Plate Thickness</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="originalThickness"
                      type="number"
                      step="0.001"
                      placeholder="0.500"
                      tabIndex={8}
                      {...form.register('originalThickness', { valueAsNumber: true })}
                      className="flex-1"
                    />
                    <Select value={watchedValues.originalThicknessUnit} onValueChange={(value) => form.setValue('originalThicknessUnit', value)}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">in</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="mils">mils</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <Label htmlFor="yearsSinceLastInspection">Years Since Last Inspection</Label>
                    <HelpTooltip content="Time elapsed since the previous API 653 inspection. Used for corrosion rate calculations." />
                  </div>
                  <Input
                    id="yearsSinceLastInspection"
                    type="number"
                    placeholder="10"
                    tabIndex={9}
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}

                    {...form.register('yearsSinceLastInspection', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Thickness Measurements Section */}
        <ThicknessTable
          measurements={measurements}
          onMeasurementsChange={setMeasurements}
          yearsSinceLastInspection={Number(watchedValues.yearsSinceLastInspection) || 1}
        />

        {/* Appurtenance Inspection Section */}
        <AppurtenanceInspection
          inspections={appurtenanceInspections}
          onInspectionsChange={setAppurtenanceInspections}
        />

        {/* Venting System Inspection Section */}
        <VentingSystemInspection
          inspections={ventingInspections}
          onInspectionsChange={setVentingInspections}
        />

        {/* Repair Recommendations Section */}
        <RepairRecommendations
          recommendations={repairRecommendations}
          onRecommendationsChange={setRepairRecommendations}
        />

        {/* Settlement Survey Section */}
        <SettlementSurvey
          data={settlementSurveyData as any}
          onDataChange={(data: any) => setSettlementSurveyData(data)}
        />

        {/* NDE Test Locations Section */}
        <NDETestLocations
          results={ndeResults as any}
          onResultsChange={(results: any) => setNDEResults(results)}
        />

        {/* Secondary Containment Section */}
        <SecondaryContainment
          data={containmentData}
          onDataChange={(data) => setContainmentData(data)}
        />

        {/* Visual Documentation Section */}
        <VisualDocumentation
          documents={visualDocuments}
          onDocumentsChange={setVisualDocuments}
        />

        {/* Supporting Documents Section */}
        <ReportAttachments
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />

        {/* Inspection Checklist */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">External Inspection</h4>
                <div className="space-y-2">
                  {checklist.filter(item => item.category === 'external').map((item, index) => {
                    const originalIndex = checklist.findIndex(original => original === item);
                    return (
                      <div key={originalIndex} className="flex items-center space-x-2">
                        <Checkbox
                          id={`external-${originalIndex}`}
                          checked={item.checked}
                          onCheckedChange={(checked) => updateChecklistItem(originalIndex, checked as boolean)}
                        />
                        <Label htmlFor={`external-${originalIndex}`} className="text-sm text-gray-700">
                          {item.item}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Internal Inspection</h4>
                <div className="space-y-2">
                  {checklist.filter(item => item.category === 'internal').map((item, index) => {
                    const originalIndex = checklist.findIndex(original => original === item);
                    return (
                      <div key={originalIndex} className="flex items-center space-x-2">
                        <Checkbox
                          id={`internal-${originalIndex}`}
                          checked={item.checked}
                          onCheckedChange={(checked) => updateChecklistItem(originalIndex, checked as boolean)}
                        />
                        <Label htmlFor={`internal-${originalIndex}`} className="text-sm text-gray-700">
                          {item.item}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Remove focus from any input fields
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
              
              setTimeout(() => {
                form.setValue('status', 'draft');
                form.handleSubmit(onSubmit)();
              }, 100);
            }}
          >
            Save Draft
          </Button>
          <div className="space-x-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove focus from any input fields
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                
                setTimeout(() => {
                  handlePreviewReport();
                }, 100);
              }}
              className="bg-slate-600 text-white hover:bg-slate-700"
            >
              Preview Report
            </Button>
            <Button 
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove focus from any input fields
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                
                // Add small delay to ensure focus is cleared
                setTimeout(() => {
                  form.handleSubmit(onSubmit)();
                }, 100);
              }}
              disabled={createReportMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createReportMutation.isPending ? 'Creating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </form>

      {/* Report Preview Modal */}
      <ReportPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        report={createdReport}
        measurements={measurements}
        checklists={checklist.map((item, index) => ({
          id: index,
          reportId: 0,
          category: item.category,
          item: item.item,
          checked: item.checked,
          notes: null
        }))}
      />
    </div>
  );
}
