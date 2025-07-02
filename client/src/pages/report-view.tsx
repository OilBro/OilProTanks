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
  const reportId = parseInt(id || "0");
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data: report, isLoading: reportLoading } = useQuery<InspectionReport>({
    queryKey: [`/api/reports/${reportId}`],
  });

  const { data: measurements = [] } = useQuery<ThicknessMeasurement[]>({
    queryKey: [`/api/reports/${reportId}/measurements`],
  });

  const { data: checklists = [] } = useQuery<InspectionChecklist[]>({
    queryKey: [`/api/reports/${reportId}/checklists`],
  });

  const { data: appurtenanceInspections = [] } = useQuery<AppurtenanceInspection[]>({
    queryKey: [`/api/reports/${reportId}/appurtenances`],
  });

  const { data: repairRecommendations = [] } = useQuery<RepairRecommendation[]>({
    queryKey: [`/api/reports/${reportId}/repairs`],
  });

  const { data: ventingInspections = [] } = useQuery<VentingSystemInspection[]>({
    queryKey: [`/api/reports/${reportId}/venting`],
  });

  const { data: attachments = [] } = useQuery<ReportAttachment[]>({
    queryKey: [`/api/reports/${reportId}/attachments`],
  });

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
      const reportData = {
        report,
        measurements,
        checklists,
        appurtenanceInspections,
        repairRecommendations,
        ventingInspections,
        attachments
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
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate the PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}