import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, AlertTriangle, Eye, Edit, FileDown, MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
// ...existing auxiliary imports (KPIDashboard, QuickPDFPreview, export helpers) should be added here

interface InspectionReport {
  id: number;
  reportNumber: string;
  tankId: string | null;
  service: string | null;
  status: string | null;
  updatedAt: string | null;
  origin?: string | null;
  findings?: string | null;
  foundationSettlement?: string | null;
  inspectionScope?: string | null;
  settlementLocation?: string | null;
  surveyMethod?: string | null;
  recommendations?: string | null;
  inspectionDate?: string | null;
}

interface ReportStats { totalReports: number; inProgress: number; completed: number; requiresAction: number; }

const fetchReports = async (params: { origin?: string; limit?: number; offset?: number }): Promise<{ data: InspectionReport[]; total: number; }> => {
  const query: string[] = [];
  if (params.origin && params.origin !== 'all') query.push(`origin=${encodeURIComponent(params.origin)}`);
  if (params.limit) query.push(`limit=${params.limit}`);
  if (typeof params.offset === 'number' && params.offset > 0) query.push(`offset=${params.offset}`);
  const qs = query.length ? `?${query.join('&')}` : '';
  const res = await fetch(`/api/reports${qs}`);
  if(!res.ok) throw new Error('Failed to load reports');
  const data = await res.json();
  const totalRaw = res.headers.get('X-Total-Count');
  const total = totalRaw ? parseInt(totalRaw,10) : data.length;
  return { data, total };
};

const fetchStats = async (): Promise<ReportStats> => {
  const res = await fetch('/api/reports/stats');
  if(!res.ok) throw new Error('Failed to load stats');
  return res.json();
};

export default function DashboardPage() {
  const [originFilter, setOriginFilter] = React.useState<string>('all');
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [page, setPage] = React.useState<number>(0); // zero-based
  const { data: reportResult, isLoading: reportsLoading } = useQuery({ 
    queryKey:['reports', originFilter, pageSize, page], 
    queryFn: () => fetchReports({ origin: originFilter, limit: pageSize, offset: page * pageSize }) 
  });
  const reports = reportResult?.data || [];
  const totalReports = reportResult?.total || 0;
  const totalPages = Math.ceil(totalReports / pageSize) || 1;
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey:['report-stats'], queryFn: fetchStats });
  const [reportToDelete, setReportToDelete] = React.useState<InspectionReport | null>(null);

  const getStatusBadge = (statusInput: string | null | undefined) => {
    const status = (statusInput || '').toLowerCase();
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>;
      case 'action_required': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Action Required</Badge>;
      case 'draft': return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      default: return <Badge variant="secondary">{status || 'unknown'}</Badge>;
    }
  };

  const formatDate = (dateInput: string | null | undefined) => {
    if (!dateInput) return 'N/A';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  };

  const handleExportAllCSV = () => {
    try {
      console.log(`Exporting ${reports.length} reports to CSV`);
    } catch (e:any) {
      console.error('Failed to export reports', e);
    }
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
    <div className="p-4">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inspection Reports</h2>
          <p className="text-gray-600">Manage your API 653 tank inspection reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Origin:</label>
            <select
              value={originFilter}
              onChange={e => { setPage(0); setOriginFilter(e.target.value); }}
              className="text-sm border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="manual">Manual</option>
              <option value="import">Import</option>
              <option value="template">Template</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
              value={pageSize}
              onChange={e => { setPage(0); setPageSize(parseInt(e.target.value,10)); }}
              className="text-sm border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10,25,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card><CardContent className="p-6 flex items-center"><FileText className="h-8 w-8 text-blue-600" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">Total Reports</p><p className="text-2xl font-semibold text-gray-900">{stats?.totalReports || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center"><Clock className="h-8 w-8 text-yellow-500" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">In Progress</p><p className="text-2xl font-semibold text-gray-900">{stats?.inProgress || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center"><CheckCircle className="h-8 w-8 text-green-600" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">Completed</p><p className="text-2xl font-semibold text-gray-900">{stats?.completed || 0}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center"><AlertTriangle className="h-8 w-8 text-red-600" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">Requires Action</p><p className="text-2xl font-semibold text-gray-900">{stats?.requiresAction || 0}</p></div></CardContent></Card>
      </div>
      <Card>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
          {reports.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportAllCSV} className="text-gray-600 hover:text-gray-800">
              <FileDown className="mr-2 h-4 w-4" /> Export All as CSV
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tank ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NDE</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Settlement</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Checklist</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Appurtenances</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vents</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendations</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr><td colSpan={14} className="px-6 py-8 text-center text-gray-500">No inspection reports found.</td></tr>
              ) : (
                reports.map(report => {
                  const Dot = ({ present }: { present: boolean }) => <span className={`inline-block w-3 h-3 rounded-full ${present ? 'bg-green-500' : 'bg-red-500'}`}/>;
                  const hasNDE = !!report.findings?.trim();
                  const hasSettlement = !!report.foundationSettlement?.trim();
                  const hasChecklist = !!report.inspectionScope?.trim();
                  const hasAppurtenances = !!report.settlementLocation?.trim();
                  const hasVents = !!report.surveyMethod?.trim();
                  const hasRecommendations = !!report.recommendations?.trim();
                  const hasDates = !!report.inspectionDate?.trim();
                  return (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.reportNumber}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {report.origin && (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium tracking-wide uppercase ${report.origin === 'import' ? 'bg-blue-100 text-blue-700' : report.origin === 'manual' ? 'bg-gray-100 text-gray-700' : 'bg-purple-100 text-purple-700'}`}>{report.origin}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.tankId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{report.service}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(report.status || '')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(report.updatedAt || '')}</td>
                      <td className="px-2 py-4 text-center"><Dot present={hasNDE} /></td>
                      <td className="px-2 py-4 text-center"><Dot present={hasSettlement} /></td>
                      <td className="px-2 py-4 text-center"><Dot present={hasChecklist} /></td>
                      <td className="px-2 py-4 text-center"><Dot present={hasAppurtenances} /></td>
                      <td className="px-2 py-4 text-center"><Dot present={hasVents} /></td>
                      <td className="px-2 py-4 text-center"><Dot present={hasRecommendations} /></td>
                      <td className="px-2 py-4 text-center"><Dot present={hasDates} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <a href={`/report/${report.id}`}><Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700"><Eye className="h-4 w-4"/></Button></a>
                          <a href={`/edit-report/${report.id}`}><Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4"/></Button></a>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600"><MoreVertical className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem /* onClick={() => handleQuickPDFGeneration(report)} */>
                                <FileText className="mr-2 h-4 w-4"/> Export as PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {/* handleCSVExport(report) */}}>
                                <FileDown className="mr-2 h-4 w-4"/> Export as CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => setReportToDelete(report)}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-sm text-gray-600">Showing {reports.length ? (page * pageSize + 1) : 0} - {page * pageSize + reports.length} of {totalReports} reports</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</Button>
          <span className="text-sm text-gray-700">Page {page+1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
        </div>
      </div>
      <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete report {reportToDelete?.reportNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { /* deleteReportMutation.mutate(reportToDelete.id) */ setReportToDelete(null); }} className="bg-red-600 hover:bg-red-700 text-white">Delete Report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
