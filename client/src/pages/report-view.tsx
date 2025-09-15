import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Edit, FileText, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { generateEnhancedPDF } from "@/components/enhanced-pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { SettlementSurvey } from "@/components/settlement-survey";
import type { 
  InspectionReport, 
  ThicknessMeasurement, 
  InspectionChecklist,
  AppurtenanceInspection,
  RepairRecommendation,
  VentingSystemInspection,
  ReportAttachment
} from "@shared/schema";

export function ReportView() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Check if the id is a number (report ID) or string (report number)
  const isNumericId = !isNaN(parseInt(id || "0")) && parseInt(id || "0") > 0;
  const reportId = isNumericId ? parseInt(id || "0") : 0;
  const reportNumber = !isNumericId ? id : null;

  // Choose the appropriate API endpoint based on the parameter type
  const apiEndpoint = isNumericId ? `/api/reports/${reportId}` : `/api/reports/by-number/${reportNumber}`;

  const { data: reportWithRelations, isLoading: reportLoading } = useQuery<InspectionReport & {
    thicknessMeasurements: ThicknessMeasurement[];
    inspectionChecklists: InspectionChecklist[];
    appurtenanceInspections: AppurtenanceInspection[];
    repairRecommendations: RepairRecommendation[];
    ventingInspections: VentingSystemInspection[];
    attachments: ReportAttachment[];
  }>({
    queryKey: [apiEndpoint],
  });

  // Extract data from the combined response
  const report = reportWithRelations;
  const measurements = reportWithRelations?.thicknessMeasurements || [];
  const checklists = reportWithRelations?.inspectionChecklists || [];
  const appurtenanceInspections = reportWithRelations?.appurtenanceInspections || [];
  const repairRecommendations = reportWithRelations?.repairRecommendations || [];
  const ventingInspections = reportWithRelations?.ventingInspections || [];
  const attachments = reportWithRelations?.attachments || [];

  if (reportLoading) {
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
          <p className="text-gray-600 mb-6">The inspection report you're looking for doesn't exist.</p>
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

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      console.log('Starting PDF generation process...');
      console.log('Report data:', report);
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
      
      console.log('Loaded comprehensive data:');
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
      
      // Generate the PDF
      generateEnhancedPDF(reportData);
      
      // Show success message
      toast({
        title: "PDF Generated",
        description: `Report ${report.reportNumber} has been downloaded successfully.`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "PDF Generation Failed",
        description: `Error: ${errorMessage}. Please check the console for details.`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
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

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{report.reportNumber}</h1>
            <p className="text-gray-600">Tank ID: {report.tankId}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {getStatusBadge(report.status)}
          <Link href={`/edit-report/${report.id}`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Report
            </Button>
          </Link>
          <Button 
            onClick={handleGeneratePDF} 
            disabled={isGeneratingPDF}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Report Number</label>
                  <p className="text-sm text-gray-900">{report.reportNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tank ID</label>
                  <p className="text-sm text-gray-900">{report.tankId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Service</label>
                  <p className="text-sm text-gray-900 capitalize">{report.service || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div>{getStatusBadge(report.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Inspector</label>
                  <p className="text-sm text-gray-900">{report.inspector}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Inspection Date</label>
                  <p className="text-sm text-gray-900">{formatDate(report.inspectionDate)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {report.diameter && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Diameter</label>
                    <p className="text-sm text-gray-900">{report.diameter} ft</p>
                  </div>
                )}
                {report.height && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Height</label>
                    <p className="text-sm text-gray-900">{report.height} ft</p>
                  </div>
                )}
                {report.originalThickness && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Original Thickness</label>
                    <p className="text-sm text-gray-900">{report.originalThickness} in</p>
                  </div>
                )}
                {report.yearsSinceLastInspection && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Years Since Last Inspection</label>
                    <p className="text-sm text-gray-900">{report.yearsSinceLastInspection}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Thickness Measurements Summary */}
          {measurements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Thickness Measurements ({measurements.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-sm font-medium text-gray-500">Component</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-500">Location</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-500">Current</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.slice(0, 5).map((measurement) => (
                        <tr key={measurement.id} className="border-b">
                          <td className="py-2 text-sm text-gray-900">{measurement.component}</td>
                          <td className="py-2 text-sm text-gray-900">{measurement.location}</td>
                          <td className="py-2 text-sm text-gray-900">{measurement.currentThickness}"</td>
                          <td className="py-2">
                            <Badge 
                              variant={measurement.status === 'acceptable' ? 'default' : 
                                      measurement.status === 'monitor' ? 'secondary' : 'destructive'}
                            >
                              {measurement.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {measurements.length > 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{measurements.length - 5} more measurements...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inspection Checklists Summary */}
          {checklists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Inspection Checklists ({checklists.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklists.slice(0, 3).map((checklist) => (
                    <div key={checklist.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{checklist.category}</span>
                        <span className="text-sm text-gray-600 ml-2">- {checklist.item}</span>
                      </div>
                      <Badge 
                        variant={checklist.checked ? 'default' : 'secondary'}
                      >
                        {checklist.checked ? 'Checked' : 'Unchecked'}
                      </Badge>
                    </div>
                  ))}
                  {checklists.length > 3 && (
                    <p className="text-sm text-gray-500">
                      +{checklists.length - 3} more checklist items...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settlement Survey Analysis */}
          {report && (
            <SettlementSurvey reportId={report.id} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Current Status</label>
                <div className="mt-1">
                  {getStatusBadge(report.status)}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">{formatDate(report.createdAt)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">{formatDate(report.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/edit-report/${report.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Report
                </Button>
              </Link>
              
              <Button variant="outline" size="sm" className="w-full" onClick={handleGeneratePDF}>
                <FileText className="h-4 w-4 mr-2" />
                View Full Report
              </Button>
              
              <Button variant="outline" size="sm" className="w-full" onClick={handleGeneratePDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!report?.id) return;
                  window.location.href = `/api/reports/${report.id}/export.csv`;
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Flat CSV
              </Button>

              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!report?.id) return;
                  window.location.href = `/api/reports/${report.id}/packet.zip`;
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Whole Packet (ZIP)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}