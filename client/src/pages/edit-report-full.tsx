import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ThicknessTable } from "@/components/thickness-table";
import { AppurtenanceInspection } from "@/components/appurtenance-inspection";
import { RepairRecommendations } from "@/components/repair-recommendations";
import { VentingSystemInspection } from "@/components/venting-system-inspection";
import { ReportAttachments } from "@/components/report-attachments";
import { SettlementSurvey } from "@/components/settlement-survey";
import { NDETestLocations } from "@/components/nde-test-locations";
import { SecondaryContainment, ContainmentSystem } from "@/components/secondary-containment";
import { VisualDocumentation } from "@/components/visual-documentation";
import { insertInspectionReportSchema, type InspectionReport, type InsertInspectionReport, 
         type ThicknessMeasurement, type InspectionChecklist, type AppurtenanceInspection as AppurtenanceInspectionType,
         type RepairRecommendation, type VentingSystemInspection as VentingSystemInspectionType,
         type ReportAttachment, type SettlementSurvey as SettlementSurveyType } from "@shared/schema";

interface SettlementData {
  referenceElevation: number;
  points: any[];
  maxDifferentialSettlement: number;
  analysisMethod: string;
  notes: string;
}

interface ContainmentSystem {
  systemType: 'earthen_dyke' | 'concrete_dyke' | 'synthetic_liner' | 'clay_liner' | 'composite';
  capacity: number;
  drainageSystem: boolean;
  monitoring: boolean;
  components: any[];
  overallCondition: 'satisfactory' | 'marginal' | 'unsatisfactory';
  complianceStatus: 'compliant' | 'non_compliant' | 'conditional';
  notes: string;
}



const DEFAULT_CHECKLIST_ITEMS = [
  { category: 'external', item: 'Shell condition - signs of corrosion, pitting, or damage', checked: false, notes: '' },
  { category: 'external', item: 'Foundation condition - cracks, settlement, erosion', checked: false, notes: '' },
  { category: 'external', item: 'Anchor bolts - corrosion, looseness, missing bolts', checked: false, notes: '' },
  { category: 'external', item: 'Grounding connections - secure and intact', checked: false, notes: '' },
  { category: 'external', item: 'External coatings - integrity and adhesion', checked: false, notes: '' },
  { category: 'external', item: 'Insulation condition (if applicable)', checked: false, notes: '' },
  { category: 'external', item: 'External piping and supports', checked: false, notes: '' },
  { category: 'external', item: 'Stairs, platforms, and handrails - structural integrity', checked: false, notes: '' },
  { category: 'external', item: 'Roof condition - distortion, ponding, drainage', checked: false, notes: '' },
  { category: 'external', item: 'Roof seals and gaskets', checked: false, notes: '' },
  { category: 'external', item: 'Vents and pressure relief devices', checked: false, notes: '' },
  { category: 'external', item: 'Nozzles and flanges - external condition', checked: false, notes: '' },
  { category: 'external', item: 'Tank nameplate and markings', checked: false, notes: '' },
  { category: 'external', item: 'Cathodic protection system (if applicable)', checked: false, notes: '' },
  { category: 'external', item: 'Secondary containment/dike condition', checked: false, notes: '' },
  { category: 'internal', item: 'Internal shell surfaces - corrosion, pitting, coating condition', checked: false, notes: '' },
  { category: 'internal', item: 'Bottom plate condition - corrosion, pitting, buckling', checked: false, notes: '' },
  { category: 'internal', item: 'Sump condition and cleanliness', checked: false, notes: '' },
  { category: 'internal', item: 'Internal floating roof (if applicable) - pontoons, seals, drainage', checked: false, notes: '' },
  { category: 'internal', item: 'Internal structural members - columns, rafters, wind girders', checked: false, notes: '' },
  { category: 'internal', item: 'Nozzles and manways - internal condition', checked: false, notes: '' },
  { category: 'internal', item: 'Internal piping and accessories', checked: false, notes: '' },
  { category: 'internal', item: 'Heating coils (if applicable)', checked: false, notes: '' },
  { category: 'internal', item: 'Mixer support structures (if applicable)', checked: false, notes: '' },
  { category: 'internal', item: 'Water draw-off sump and piping', checked: false, notes: '' },
  { category: 'internal', item: 'Internal ladders and attachments', checked: false, notes: '' },
  { category: 'internal', item: 'Evidence of product contamination or water', checked: false, notes: '' },
  { category: 'internal', item: 'Internal coating/lining condition', checked: false, notes: '' },
  { category: 'internal', item: 'Weld seams - evidence of cracking or corrosion', checked: false, notes: '' },
  { category: 'internal', item: 'Tank bottom/foundation interface', checked: false, notes: '' }
];

export function EditReportFull() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const reportId = parseInt(id || "0");

  // State for all sections
  const [measurements, setMeasurements] = useState<ThicknessMeasurement[]>([]);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST_ITEMS);
  const [appurtenanceInspections, setAppurtenanceInspections] = useState<AppurtenanceInspectionType[]>([]);
  const [repairRecommendations, setRepairRecommendations] = useState<RepairRecommendation[]>([]);
  const [ventingInspections, setVentingInspections] = useState<VentingSystemInspectionType[]>([]);
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [settlementData, setSettlementData] = useState<SettlementData>({
    referenceElevation: 0,
    points: [],
    maxDifferentialSettlement: 0,
    analysisMethod: 'circumferential',
    notes: ''
  });
  const [settlementSurveyData, setSettlementSurveyData] = useState({
    referenceElevation: 0,
    measurementDate: new Date().toISOString().split('T')[0],
    instrument: '',
    points: [] as any[],
    analysisNotes: ''
  });
  const [ndeResults, setNDEResults] = useState<any[]>([]);
  const [containmentData, setContainmentData] = useState<ContainmentSystem>({
    systemType: 'earthen_dyke' as const,
    capacity: 110,
    capacityUnit: 'gal' as const,
    drainageSystem: true,
    monitoring: false,
    components: [],
    overallCondition: 'satisfactory' as const,
    complianceStatus: 'compliant' as const,
    notes: ''
  });
  const [visualDocuments, setVisualDocuments] = useState<any[]>([]);

  // Load report data
  const { data: report, isLoading } = useQuery<InspectionReport>({
    queryKey: [`/api/reports/${reportId}`],
  });

  // Load related data
  const { data: existingMeasurements } = useQuery<ThicknessMeasurement[]>({
    queryKey: [`/api/reports/${reportId}/measurements`],
    enabled: !!report,
  });

  const { data: existingChecklists } = useQuery<InspectionChecklist[]>({
    queryKey: [`/api/reports/${reportId}/checklists`],
    enabled: !!report,
  });

  const { data: existingAppurtenances } = useQuery<AppurtenanceInspectionType[]>({
    queryKey: [`/api/reports/${reportId}/appurtenances`],
    enabled: !!report,
  });

  const { data: existingRepairs } = useQuery<RepairRecommendation[]>({
    queryKey: [`/api/reports/${reportId}/repairs`],
    enabled: !!report,
  });

  const { data: existingVenting } = useQuery<VentingSystemInspectionType[]>({
    queryKey: [`/api/reports/${reportId}/venting`],
    enabled: !!report,
  });

  const { data: existingAttachments } = useQuery<ReportAttachment[]>({
    queryKey: [`/api/reports/${reportId}/attachments`],
    enabled: !!report,
  });

  const form = useForm<InsertInspectionReport>({
    resolver: zodResolver(insertInspectionReportSchema),
    defaultValues: {
      yearsSinceLastInspection: 1,
      status: 'draft' as const
    }
  });

  // Update form when data loads
  useEffect(() => {
    if (report) {
      form.reset({
        reportNumber: report.reportNumber,
        tankId: report.tankId,
        service: report.service,
        inspector: report.inspector,
        inspectionDate: report.inspectionDate,
        diameter: report.diameter,
        height: report.height,
        originalThickness: report.originalThickness,
        yearsSinceLastInspection: report.yearsSinceLastInspection || 1,
        status: report.status
      });
    }
  }, [report, form]);

  // Load existing related data
  useEffect(() => {
    if (existingMeasurements) setMeasurements(existingMeasurements);
    if (existingChecklists) {
      const updatedChecklist = checklist.map(item => {
        const existing = existingChecklists.find(c => c.item === item.item);
        return existing ? { ...item, checked: existing.checked || false, notes: existing.notes || '' } : item;
      });
      setChecklist(updatedChecklist);
    }
    if (existingAppurtenances) setAppurtenanceInspections(existingAppurtenances);
    if (existingRepairs) setRepairRecommendations(existingRepairs);
    if (existingVenting) setVentingInspections(existingVenting);
    if (existingAttachments) setAttachments(existingAttachments);
  }, [existingMeasurements, existingChecklists, existingAppurtenances, existingRepairs, existingVenting, existingAttachments]);

  const updateReportMutation = useMutation({
    mutationFn: async (data: InsertInspectionReport) => {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update report');
      }
      return response.json();
    },
    onSuccess: async () => {
      // Update related data
      // Update thickness measurements
      for (const measurement of measurements) {
        const method = measurement.id ? 'PUT' : 'POST';
        const url = measurement.id 
          ? `/api/measurements/${measurement.id}`
          : `/api/reports/${reportId}/measurements`;
        
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...measurement, reportId }),
        });
      }

      // Update checklists
      for (const item of checklist) {
        const existing = existingChecklists?.find(c => c.item === item.item);
        const method = existing ? 'PUT' : 'POST';
        const url = existing
          ? `/api/checklists/${existing.id}`
          : `/api/reports/${reportId}/checklists`;
        
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, reportId }),
        });
      }

      toast({
        title: "Success",
        description: "Report updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      navigate(`/report/${reportId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update report",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: InsertInspectionReport) => {
    updateReportMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Report Not Found</h1>
          <p className="text-gray-600 mb-6">The inspection report you're trying to edit doesn't exist.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href={`/report/${reportId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Report
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Report</h1>
            <p className="text-gray-600">{report.reportNumber}</p>
          </div>
        </div>
        
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateReportMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateReportMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reportNumber">Report Number</Label>
                    <Input 
                      id="reportNumber"
                      {...form.register('reportNumber')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tankId">Tank ID</Label>
                    <Input 
                      id="tankId"
                      {...form.register('tankId')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="service">Service Type</Label>
                    <Select 
                      value={form.watch('service') || undefined} 
                      onValueChange={(value) => form.setValue('service', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crude_oil">Crude Oil</SelectItem>
                        <SelectItem value="gasoline">Gasoline</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="jet_fuel">Jet Fuel</SelectItem>
                        <SelectItem value="water">Water</SelectItem>
                        <SelectItem value="chemical">Chemical</SelectItem>
                        <SelectItem value="waste">Waste</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="inspector">Inspector</Label>
                    <Input 
                      id="inspector"
                      {...form.register('inspector')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inspectionDate">Inspection Date</Label>
                    <Input 
                      id="inspectionDate"
                      type="date"
                      {...form.register('inspectionDate')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="diameter">Diameter (ft)</Label>
                    <Input 
                      id="diameter"
                      type="number"
                      step="0.01"
                      {...form.register('diameter', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (ft)</Label>
                    <Input 
                      id="height"
                      type="number"
                      step="0.01"
                      {...form.register('height', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="originalThickness">Original Thickness (in)</Label>
                    <Input 
                      id="originalThickness"
                      type="number"
                      step="0.001"
                      {...form.register('originalThickness', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearsSinceLastInspection">Years Since Last Inspection</Label>
                    <Input 
                      id="yearsSinceLastInspection"
                      type="number"
                      {...form.register('yearsSinceLastInspection', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Report Status</Label>
                    <Select 
                      value={form.watch('status') || undefined} 
                      onValueChange={(value) => form.setValue('status', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="action_required">Action Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>


          </TabsContent>

          <TabsContent value="measurements" className="space-y-6 mt-6">
            <ThicknessTable
              measurements={measurements}
              onMeasurementsChange={setMeasurements}
              yearsSinceLastInspection={form.watch('yearsSinceLastInspection') || 1}
            />
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">External Inspection</h3>
                    <div className="space-y-2">
                      {checklist
                        .filter(item => item.category === 'external')
                        .map((item, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50">
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={(checked) => {
                                const newChecklist = [...checklist];
                                const itemIndex = checklist.findIndex(c => c.item === item.item);
                                newChecklist[itemIndex] = { ...item, checked: checked as boolean };
                                setChecklist(newChecklist);
                              }}
                            />
                            <div className="flex-1">
                              <Label className="text-sm font-normal cursor-pointer">
                                {item.item}
                              </Label>
                              <Input
                                placeholder="Add notes..."
                                className="mt-1 text-sm"
                                value={item.notes}
                                onChange={(e) => {
                                  const newChecklist = [...checklist];
                                  const itemIndex = checklist.findIndex(c => c.item === item.item);
                                  newChecklist[itemIndex] = { ...item, notes: e.target.value };
                                  setChecklist(newChecklist);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Internal Inspection</h3>
                    <div className="space-y-2">
                      {checklist
                        .filter(item => item.category === 'internal')
                        .map((item, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50">
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={(checked) => {
                                const newChecklist = [...checklist];
                                const itemIndex = checklist.findIndex(c => c.item === item.item);
                                newChecklist[itemIndex] = { ...item, checked: checked as boolean };
                                setChecklist(newChecklist);
                              }}
                            />
                            <div className="flex-1">
                              <Label className="text-sm font-normal cursor-pointer">
                                {item.item}
                              </Label>
                              <Input
                                placeholder="Add notes..."
                                className="mt-1 text-sm"
                                value={item.notes}
                                onChange={(e) => {
                                  const newChecklist = [...checklist];
                                  const itemIndex = checklist.findIndex(c => c.item === item.item);
                                  newChecklist[itemIndex] = { ...item, notes: e.target.value };
                                  setChecklist(newChecklist);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            <AppurtenanceInspection
              inspections={appurtenanceInspections}
              onInspectionsChange={setAppurtenanceInspections}
            />

            <RepairRecommendations
              recommendations={repairRecommendations}
              onRecommendationsChange={setRepairRecommendations}
            />

            <VentingSystemInspection
              inspections={ventingInspections}
              onInspectionsChange={setVentingInspections}
            />

            <SettlementSurvey
              reportId={reportId}
            />

            <NDETestLocations
              results={ndeResults}
              onResultsChange={setNDEResults}
            />

            <SecondaryContainment
              data={containmentData}
              onDataChange={setContainmentData}
            />
          </TabsContent>

          <TabsContent value="attachments" className="space-y-6 mt-6">
            <VisualDocumentation
              documents={visualDocuments}
              onDocumentsChange={setVisualDocuments}
            />

            <ReportAttachments
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-6">
          <Link href={`/report/${reportId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          
          <Button 
            type="submit"
            disabled={updateReportMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateReportMutation.isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}