import { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => this.setState({ hasError: false })}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
              {this.state.error && (
                <details className="text-left text-xs text-gray-500 mt-4">
                  <summary className="cursor-pointer">Error Details</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}