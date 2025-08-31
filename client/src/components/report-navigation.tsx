import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Calculator, 
  TrendingDown, 
  Gauge, 
  Clipboard, 
  Package, 
  Settings, 
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Home,
  BarChart3,
  Database,
  FileSpreadsheet,
  Camera,
  FileOutput
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  status?: 'complete' | 'in_progress' | 'pending' | 'warning';
  children?: NavigationItem[];
  badge?: string;
}

interface ReportNavigationProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  completionStatus?: Record<string, boolean>;
  warningCounts?: Record<string, number>;
}

export function ReportNavigation({
  activeSection,
  onSectionChange,
  completionStatus = {},
  warningCounts = {}
}: ReportNavigationProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['calculations', 'data-entry']);

  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: 'Report Overview',
      icon: <Home className="h-4 w-4" />,
      status: completionStatus.overview ? 'complete' : 'in_progress'
    },
    {
      id: 'alerts',
      label: 'Critical Alerts',
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: warningCounts.alerts ? String(warningCounts.alerts) : undefined,
      status: warningCounts.alerts ? 'warning' : 'complete'
    },
    {
      id: 'calculations',
      label: 'API 653 Calculations',
      icon: <Calculator className="h-4 w-4" />,
      children: [
        {
          id: 'shell-calc',
          label: 'Shell Calculations',
          icon: <BarChart3 className="h-4 w-4" />,
          status: completionStatus.shellCalc ? 'complete' : 'pending'
        },
        {
          id: 'bottom-calc',
          label: 'Bottom Calculations',
          icon: <Database className="h-4 w-4" />,
          status: completionStatus.bottomCalc ? 'complete' : 'pending'
        },
        {
          id: 'roof-calc',
          label: 'Roof Calculations',
          icon: <FileSpreadsheet className="h-4 w-4" />,
          status: completionStatus.roofCalc ? 'complete' : 'pending'
        },
        {
          id: 'settlement',
          label: 'Settlement Analysis',
          icon: <TrendingDown className="h-4 w-4" />,
          status: completionStatus.settlement ? 'complete' : 'pending'
        }
      ]
    },
    {
      id: 'data-entry',
      label: 'Inspection Data',
      icon: <Clipboard className="h-4 w-4" />,
      children: [
        {
          id: 'thickness',
          label: 'Thickness Measurements',
          icon: <Gauge className="h-4 w-4" />,
          status: completionStatus.thickness ? 'complete' : 'in_progress'
        },
        {
          id: 'cml-data',
          label: 'CML Data',
          icon: <Database className="h-4 w-4" />,
          status: completionStatus.cmlData ? 'complete' : 'pending',
          badge: warningCounts.cml ? String(warningCounts.cml) : undefined
        },
        {
          id: 'checklist',
          label: 'Inspection Checklist',
          icon: <Clipboard className="h-4 w-4" />,
          status: completionStatus.checklist ? 'complete' : 'pending'
        },
        {
          id: 'findings',
          label: 'Findings & Recommendations',
          icon: <FileText className="h-4 w-4" />,
          status: completionStatus.findings ? 'complete' : 'pending'
        }
      ]
    },
    {
      id: 'attachments',
      label: 'Attachments',
      icon: <Package className="h-4 w-4" />,
      children: [
        {
          id: 'photos',
          label: 'Photos',
          icon: <Camera className="h-4 w-4" />,
          badge: warningCounts.photos ? String(warningCounts.photos) : '0'
        },
        {
          id: 'documents',
          label: 'Documents',
          icon: <FileText className="h-4 w-4" />,
          badge: warningCounts.documents ? String(warningCounts.documents) : '0'
        }
      ]
    },
    {
      id: 'report-output',
      label: 'Report Output',
      icon: <FileOutput className="h-4 w-4" />,
      children: [
        {
          id: 'preview',
          label: 'Preview Report',
          icon: <FileText className="h-4 w-4" />
        },
        {
          id: 'export',
          label: 'Export Options',
          icon: <FileOutput className="h-4 w-4" />
        }
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-3 w-3 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-300" />;
    }
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);
    const isActive = activeSection === item.id;

    return (
      <div key={item.id}>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${level > 0 ? 'pl-8' : 'pl-3'} pr-2 h-9`}
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id);
            }
            onSectionChange(item.id);
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <span className="transition-transform">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </span>
              )}
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </div>
            <div className="flex items-center gap-1">
              {item.badge && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {getStatusIcon(item.status)}
            </div>
          </div>
        </Button>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Calculate overall completion percentage
  const flattenItems = (items: NavigationItem[]): NavigationItem[] => {
    return items.reduce((acc, item) => {
      acc.push(item);
      if (item.children) {
        acc.push(...flattenItems(item.children));
      }
      return acc;
    }, [] as NavigationItem[]);
  };

  const allItems = flattenItems(navigationItems);
  const completedItems = allItems.filter(item => item.status === 'complete').length;
  const totalItems = allItems.filter(item => !item.children).length; // Only count leaf nodes
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-2">Report Sections</h3>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Overall Progress</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2 space-y-1">
          {navigationItems.map(item => renderNavigationItem(item))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onSectionChange('settings')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Report Settings
        </Button>
      </div>
    </Card>
  );
}