import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, User, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface ReportOverviewProps {
  reportNumber?: string;
  tankId?: string;
  inspector?: string;
  inspectionDate?: string;
  baseDataComplete?: boolean;
  shellCalcComplete?: boolean;
  settlementComplete?: boolean;
  cmlDataComplete?: boolean;
  status?: 'draft' | 'in_progress' | 'completed' | 'action_required';
}

export function ReportOverview({
  reportNumber = '',
  tankId = '',
  inspector = '',
  inspectionDate = '',
  baseDataComplete = false,
  shellCalcComplete = false,
  settlementComplete = false,
  cmlDataComplete = false,
  status = 'draft'
}: ReportOverviewProps) {
  // Calculate overall completion percentage
  const completionItems = [
    baseDataComplete,
    shellCalcComplete,
    settlementComplete,
    cmlDataComplete
  ];
  const completionPercentage = (completionItems.filter(Boolean).length / completionItems.length) * 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case 'action_required':
        return <Badge className="bg-orange-500 text-white">Action Required</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Draft</Badge>;
    }
  };

  const getCompletionIcon = (isComplete: boolean) => {
    return isComplete ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <Clock className="h-4 w-4 text-gray-400" />
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Project Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Project Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Report Number:</label>
              <p className="font-semibold">{reportNumber || 'Not Set'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Tank ID:</label>
              <p className="font-semibold">{tankId || 'Not Set'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Inspector:</label>
              <p className="font-semibold flex items-center gap-1">
                <User className="h-3 w-3" />
                {inspector || 'Not Assigned'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Inspection Date:</label>
              <p className="font-semibold flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {inspectionDate || 'Not Set'}
              </p>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Report Status</span>
              {getStatusBadge(status)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5" />
            Completion Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                {getCompletionIcon(baseDataComplete)}
                Base Data Complete
              </span>
              <span className="text-sm text-gray-500">
                {baseDataComplete ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                {getCompletionIcon(shellCalcComplete)}
                Shell Calc Complete
              </span>
              <span className="text-sm text-gray-500">
                {shellCalcComplete ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                {getCompletionIcon(settlementComplete)}
                Settlement Complete
              </span>
              <span className="text-sm text-gray-500">
                {settlementComplete ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                {getCompletionIcon(cmlDataComplete)}
                CML Data Complete
              </span>
              <span className="text-sm text-gray-500">
                {cmlDataComplete ? 'Complete' : 'Pending'}
              </span>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-semibold">{completionPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}