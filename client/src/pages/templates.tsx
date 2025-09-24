import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ReportTemplate } from "@shared/schema";

export default function Templates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      // In a real implementation, this would create a new report based on the template
      // For now, we'll just navigate to the new report page
      return templateId;
    },
    onSuccess: () => {
      toast({
        title: "Template Selected",
        description: "Creating new report from template...",
      });
      setLocation('/new-report');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to use template. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleUseTemplate = (templateId: number) => {
    useTemplateMutation.mutate(templateId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Templates</h2>
        <p className="text-gray-600">Pre-configured templates for common tank types</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const defaultComponents = Array.isArray(template.defaultComponents)
            ? (template.defaultComponents as string[])
            : [];

          return (
          <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{template.service} service template</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{template.description}</p>
              
              {defaultComponents.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Includes components:</p>
                  <div className="flex flex-wrap gap-1">
                    {defaultComponents.slice(0, 3).map((component, index) => (
                      <span key={index} className="inline-block bg-gray-100 text-xs px-2 py-1 rounded">
                        {component}
                      </span>
                    ))}
                    {defaultComponents.length > 3 && (
                      <span className="inline-block bg-gray-100 text-xs px-2 py-1 rounded">
                        +{defaultComponents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={() => handleUseTemplate(template.id)}
                disabled={useTemplateMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {useTemplateMutation.isPending ? 'Loading...' : 'Use Template'}
              </Button>
            </CardContent>
          </Card>
        );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates available</h3>
          <p className="text-gray-500">Templates will be available soon.</p>
        </div>
      )}
    </div>
  );
}
