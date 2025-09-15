import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { generateEnhancedPDF } from "@/components/enhanced-pdf-generator";
import { useToast } from "@/hooks/use-toast";
import type { InspectionReport, ThicknessMeasurement, InspectionChecklist } from "@shared/schema";

interface QuickPDFPreviewProps {
  report: InspectionReport;
  measurements?: ThicknessMeasurement[];
  checklists?: InspectionChecklist[];
  trigger?: React.ReactNode;
}

export function QuickPDFPreview({ report, measurements = [], checklists = [], trigger }: QuickPDFPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      console.log('Quick PDF Preview: Starting generation...');
      console.log('Report:', report);
      console.log('Loading comprehensive report data...');
      
      // Load all related data from API endpoints
      const [
        measurementsResponse,
        checklistsResponse,
        appurtenancesResponse,
        repairsResponse,
        ventingResponse,
        attachmentsResponse,
        settlementResponse
      ] = await Promise.all([
        fetch(`/api/reports/${report.id}/measurements`),
        fetch(`/api/reports/${report.id}/checklists`),
        fetch(`/api/reports/${report.id}/appurtenances`),
        fetch(`/api/reports/${report.id}/repairs`),
        fetch(`/api/reports/${report.id}/venting`),
        fetch(`/api/reports/${report.id}/attachments`),
        fetch(`/api/reports/${report.id}/settlement-surveys`)
      ]);
      
      const [
        loadedMeasurements,
        loadedChecklists,
        loadedAppurtenances,
        loadedRepairs,
        loadedVenting,
        loadedAttachments,
        loadedSettlementSurveys
      ] = await Promise.all([
        measurementsResponse.json(),
        checklistsResponse.json(),
        appurtenancesResponse.json(),
        repairsResponse.json(),
        ventingResponse.json(),
        attachmentsResponse.json(),
        settlementResponse.json()
      ]);
      
      console.log('Loaded data summary:');
      console.log('- Measurements:', loadedMeasurements?.length || 0);
      console.log('- Checklists:', loadedChecklists?.length || 0);
      console.log('- Appurtenances:', loadedAppurtenances?.length || 0);
      console.log('- Repairs:', loadedRepairs?.length || 0);
      console.log('- Venting:', loadedVenting?.length || 0);
      console.log('- Attachments:', loadedAttachments?.length || 0);
      console.log('- Settlement Surveys:', loadedSettlementSurveys?.length || 0);
      
      // Process settlement data if available
      let settlementSurvey = null;
      if (loadedSettlementSurveys && loadedSettlementSurveys.length > 0) {
        const latestSettlement = loadedSettlementSurveys[0];
        if (latestSettlement && latestSettlement.id) {
          try {
            const measurementResponse = await fetch(`/api/settlement-surveys/${latestSettlement.id}/measurements`);
            const settlementMeasurements = await measurementResponse.json();
            
            settlementSurvey = {
              measurements: settlementMeasurements.map((m: any) => ({
                point: m.pointNumber || 0,
                angle: parseFloat(m.angle) || 0,
                elevation: parseFloat(m.measuredElevation) || 0,
                cosineFit: parseFloat(m.cosineFitElevation) || undefined
              })),
              amplitude: parseFloat(latestSettlement.cosineAmplitude) || 0,
              phase: parseFloat(latestSettlement.cosinePhase) || 0,
              rSquared: parseFloat(latestSettlement.rSquared) || 0,
              maxSettlement: parseFloat(latestSettlement.maxOutOfPlane) || 0,
              allowableSettlement: parseFloat(latestSettlement.allowableSettlement) || 0.5,
              acceptance: latestSettlement.settlementAcceptance || 'PENDING'
            };
            console.log('Settlement data processed:', settlementSurvey);
          } catch (error) {
            console.error('Failed to fetch settlement measurements:', error);
            // Use basic settlement data without measurements
            settlementSurvey = {
              measurements: [],
              amplitude: parseFloat(latestSettlement.cosineAmplitude) || 0,
              phase: parseFloat(latestSettlement.cosinePhase) || 0,
              rSquared: parseFloat(latestSettlement.rSquared) || 0,
              maxSettlement: parseFloat(latestSettlement.maxOutOfPlane) || 0,
              allowableSettlement: parseFloat(latestSettlement.allowableSettlement) || 0.5,
              acceptance: latestSettlement.settlementAcceptance || 'PENDING'
            };
          }
        }
      }
      
      const reportData = {
        report,
        measurements: loadedMeasurements || [],
        checklists: loadedChecklists || [],
        appurtenanceInspections: loadedAppurtenances || [],
        repairRecommendations: loadedRepairs || [],
        ventingInspections: loadedVenting || [],
        attachments: loadedAttachments || [],
        settlementSurvey
      };

      generateEnhancedPDF(reportData);
      
      toast({
        title: "PDF Generated",
        description: `Report ${report.reportNumber} has been generated and downloaded.`,
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Quick PDF Preview error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "PDF Generation Failed",
        description: `Error: ${errorMessage}. Please check the console for details.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (statusInput: string | null | undefined) => {
    const status = (statusInput || '').toLowerCase();
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status || 'unknown'}</Badge>;
    }
  };

  const formatDate = (dateInput: string | null | undefined) => {
    if (!dateInput) return 'N/A';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="h-4 w-4 mr-2" />
      Quick Preview
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Preview - {report.reportNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{report.reportNumber}</CardTitle>
                  <p className="text-sm text-gray-600">Tank ID: {report.tankId}</p>
                </div>
                {getStatusBadge(report.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Service:</span>
                  <p className="text-gray-900 capitalize">{report.service || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Inspector:</span>
                  <p className="text-gray-900">{report.inspector}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Inspection Date:</span>
                  <p className="text-gray-900">{formatDate(report.inspectionDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Tank Diameter:</span>
                  <p className="text-gray-900">{report.diameter ? `${report.diameter} ft` : 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Tank Height:</span>
                  <p className="text-gray-900">{report.height ? `${report.height} ft` : 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Years Since Last:</span>
                  <p className="text-gray-900">{report.yearsSinceLastInspection || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Measurements Summary */}
          {measurements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thickness Measurements ({measurements.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {measurements.slice(0, 5).map((measurement) => (
                    <div key={measurement.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{measurement.component}</span>
                        <span className="text-gray-500 ml-2">- {measurement.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{measurement.currentThickness}"</span>
                        <Badge 
                          variant={measurement.status === 'acceptable' ? 'default' : 
                                  measurement.status === 'monitor' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {measurement.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {measurements.length > 5 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      +{measurements.length - 5} more measurements in full report...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklists Summary */}
          {checklists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inspection Checklists ({checklists.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklists.slice(0, 4).map((checklist) => (
                    <div key={checklist.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{checklist.item}</span>
                      <Badge 
                        variant={checklist.checked ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {checklist.checked ? 'Checked' : 'Not Checked'}
                      </Badge>
                    </div>
                  ))}
                  {checklists.length > 4 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      +{checklists.length - 4} more checklist items in full report...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate PDF Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              This is a quick preview. Full report includes detailed calculations, appendices, and all data.
            </p>
            <Button 
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Full PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}