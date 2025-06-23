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
import { insertInspectionReportSchema } from "@shared/schema";
import type { InspectionReport, ThicknessMeasurement, InspectionChecklist } from "@shared/schema";
import { useLocation } from "wouter";

const SERVICE_OPTIONS = [
  { value: "crude", label: "Crude Oil" },
  { value: "diesel", label: "Diesel" },
  { value: "gasoline", label: "Gasoline" },
  { value: "other", label: "Other" }
];

const DEFAULT_CHECKLIST_ITEMS = [
  { category: "external", item: "Foundation condition assessed", checked: false },
  { category: "external", item: "Shell external condition checked", checked: false },
  { category: "external", item: "Coating condition evaluated", checked: false },
  { category: "external", item: "Appurtenances inspected", checked: false },
  { category: "internal", item: "Bottom plate condition assessed", checked: false },
  { category: "internal", item: "Shell internal condition checked", checked: false },
  { category: "internal", item: "Roof structure inspected", checked: false },
  { category: "internal", item: "Internal appurtenances checked", checked: false }
];

export default function NewReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<ThicknessMeasurement[]>([]);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST_ITEMS);
  const [showPreview, setShowPreview] = useState(false);
  const [createdReport, setCreatedReport] = useState<InspectionReport | null>(null);

  const form = useForm({
    resolver: zodResolver(insertInspectionReportSchema),
    defaultValues: {
      reportNumber: '',
      tankId: '',
      service: '',
      diameter: '',
      height: '',
      inspector: '',
      inspectionDate: new Date().toISOString().split('T')[0],
      originalThickness: '',
      yearsSinceLastInspection: '',
      status: 'draft' as const
    }
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/reports', data);
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create report. Please try again.",
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
          currentThickness: measurement.currentThickness,
          corrosionRate: measurement.corrosionRate,
          remainingLife: measurement.remainingLife,
          status: measurement.status
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
      const report = await createReportMutation.mutateAsync(data);
      
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
      
      setLocation('/dashboard');
    } catch (error) {
      console.error('Failed to save report:', error);
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
      diameter: formData.diameter || null,
      height: formData.height || null,
      originalThickness: formData.originalThickness || null,
      yearsSinceLastInspection: formData.yearsSinceLastInspection ? parseInt(formData.yearsSinceLastInspection) : null,
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
  const originalThickness = parseFloat(watchedValues.originalThickness) || 0;
  const yearsSince = parseInt(watchedValues.yearsSinceLastInspection) || 0;

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
        onSubmit={form.handleSubmit(onSubmit)} 
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
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
                    <Label htmlFor="diameter">Diameter (ft)</Label>
                    <Input
                      id="diameter"
                      type="number"
                      placeholder="120"
                      tabIndex={4}
                      {...form.register('diameter')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (ft)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="48"
                      {...form.register('height')}
                    />
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
                    {...form.register('inspectionDate')}
                  />
                  {form.formState.errors.inspectionDate && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.inspectionDate.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="originalThickness">Original Plate Thickness (in)</Label>
                  <Input
                    id="originalThickness"
                    type="number"
                    step="0.001"
                    placeholder="0.500"
                    {...form.register('originalThickness')}
                  />
                </div>
                <div>
                  <Label htmlFor="yearsSinceLastInspection">Years Since Last Inspection</Label>
                  <Input
                    id="yearsSinceLastInspection"
                    type="number"
                    placeholder="10"
                    {...form.register('yearsSinceLastInspection')}
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
          originalThickness={originalThickness}
          yearsSinceLastInspection={yearsSince}
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
            onClick={() => form.setValue('status', 'draft')}
          >
            Save Draft
          </Button>
          <div className="space-x-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={handlePreviewReport}
              className="bg-slate-600 text-white hover:bg-slate-700"
            >
              Preview Report
            </Button>
            <Button 
              type="submit" 
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
