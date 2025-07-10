import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle, AlertTriangle, Eye, Edit, Download, TrendingUp, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { generateEnhancedPDF } from "@/components/enhanced-pdf-generator";
import { QuickPDFPreview } from "@/components/quick-pdf-preview";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { InspectionReport, ThicknessMeasurement, InspectionChecklist } from "@shared/schema";

interface DashboardStats {
  totalReports: number;
  inProgress: number;
  completed: number;
  requiresAction: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [reportToDelete, setReportToDelete] = useState<InspectionReport | null>(null);
  
  const { data: reports = [], isLoading: reportsLoading } = useQuery<InspectionReport[]>({
    queryKey: ["/api/reports"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/reports/stats"],
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Deleted",
        description: "The inspection report has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      setReportToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete report",
        variant: "destructive",
      });
    }
  });

  const handleQuickPDFGeneration = async (report: InspectionReport) => {
    try {
      toast({
        title: "Generating PDF Report",
        description: "Please wait while we compile your comprehensive inspection data...",
      });

      console.log('Dashboard PDF: Loading comprehensive data for report', report.id);

      // Load all related data from API endpoints  
      const [
        measurementsResponse,
        checklistsResponse,
        appurtenancesResponse,
        repairsResponse,
        ventingResponse,
        attachmentsResponse
      ] = await Promise.all([
        fetch(`/api/reports/${report.id}/measurements`),
        fetch(`/api/reports/${report.id}/checklists`),
        fetch(`/api/reports/${report.id}/appurtenances`),
        fetch(`/api/reports/${report.id}/repairs`),
        fetch(`/api/reports/${report.id}/venting`),
        fetch(`/api/reports/${report.id}/attachments`)
      ]);

      const [
        measurements,
        checklists,
        appurtenances,
        repairs,
        venting,
        attachments
      ] = await Promise.all([
        measurementsResponse.json(),
        checklistsResponse.json(),
        appurtenancesResponse.json(),
        repairsResponse.json(),
        ventingResponse.json(),
        attachmentsResponse.json()
      ]);

      console.log('Dashboard PDF: Loaded comprehensive data:');
      console.log('- Measurements:', measurements?.length || 0);
      console.log('- Checklists:', checklists?.length || 0);
      console.log('- Appurtenances:', appurtenances?.length || 0);
      console.log('- Repairs:', repairs?.length || 0);
      console.log('- Venting:', venting?.length || 0);
      console.log('- Attachments:', attachments?.length || 0);

      const reportData = {
        report,
        measurements: measurements || [],
        checklists: checklists || [],
        appurtenanceInspections: appurtenances || [],
        repairRecommendations: repairs || [],
        ventingInspections: venting || [],
        attachments: attachments || []
      };

      generateEnhancedPDF(reportData);
      
      toast({
        title: "PDF Generated",
        description: `Complete API 653 inspection report ${report.reportNumber} has been generated and downloaded.`,
      });
    } catch (error) {
      console.error('Dashboard PDF generation failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>;
      case 'action_required':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Action Required</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (reportsLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Inspection Reports</h2>
        <p className="text-gray-600">Manage your API 653 tank inspection reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Reports</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalReports || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.inProgress || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Requires Action</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.requiresAction || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
        </div>
        <div className="overflow-x-auto">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
              <p className="text-gray-500 mb-4">Create your first inspection report to get started.</p>
              <Link href="/new-report">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Create Report
                </Button>
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tank ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.reportNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.tankId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {report.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <Link href={`/report/${report.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" title="View Report Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <QuickPDFPreview 
                          report={report}
                          trigger={
                            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" title="Quick PDF Preview">
                              <FileText className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Link href={`/edit-report/${report.id}`}>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600" title="Edit Report">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 hover:text-gray-600" 
                          title="Download PDF Report"
                          onClick={() => handleQuickPDFGeneration(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-400 hover:text-red-600"
                          onClick={() => setReportToDelete(report)}
                          title="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete report {reportToDelete?.reportNumber}? 
              This action cannot be undone and will permanently delete all associated data including thickness measurements, checklists, and attachments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && deleteReportMutation.mutate(reportToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
