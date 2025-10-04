import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import NewReport from "@/pages/new-report";
import Templates from "@/pages/templates";
import ImportReports from "@/pages/import-reports";
import ChecklistTemplates from "@/pages/checklist-templates";
import EnhancedCalculationsPage from "@/pages/enhanced-calculations";
import { ReportView } from "@/pages/report-view";
import { EditReportFull } from "@/pages/edit-report-full";
import NotFound from "@/pages/not-found";

function Header() {
  const [location] = useLocation();

  const getTabClass = (tab: string) => {
    const isActive = location === `/${tab}` || (tab === 'dashboard' && location === '/');
    return isActive
      ? "text-blue-600 border-b-2 border-blue-600 px-1 pb-4 text-sm font-medium"
      : "text-gray-500 hover:text-gray-700 px-1 pb-4 text-sm font-medium";
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">OilPro Tanks</h1>
              <p className="text-xs text-gray-500">API 653 Tank Inspection Management</p>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className={getTabClass('dashboard')}>
                Dashboard
              </Link>
              <Link href="/new-report" className={getTabClass('new-report')}>
                New Report
              </Link>
              <Link href="/import" className={getTabClass('import')}>
                Import Excel
              </Link>
              <Link href="/templates" className={getTabClass('templates')}>
                Templates
              </Link>
              <Link href="/checklists" className={getTabClass('checklists')}>
                Checklists
              </Link>
              <Link href="/enhanced-calculations" className={getTabClass('enhanced-calculations')}>
                Enhanced Calculations
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/new-report">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </Link>

          </div>
        </div>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/new-report" component={NewReport} />
      <Route path="/import" component={ImportReports} />
      <Route path="/templates" component={Templates} />
      <Route path="/checklists" component={ChecklistTemplates} />
      <Route path="/enhanced-calculations" component={EnhancedCalculationsPage} />
      <Route path="/report/:id" component={ReportView} />
      <Route path="/edit-report/:id" component={EditReportFull} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
