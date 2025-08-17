import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { insertInspectionReportSchema, type InspectionReport, type InsertInspectionReport } from "@shared/schema";
import { ThicknessMeasurementsEdit } from "@/components/thickness-measurements";
import { ChecklistEdit } from "@/components/checklist-edit";

export function EditReport() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const reportId = parseInt(id || "0");

  const { data: report, isLoading } = useQuery<InspectionReport>({
    queryKey: [`/api/reports/${reportId}`],
  });

  const form = useForm<InsertInspectionReport>({
    resolver: zodResolver(insertInspectionReportSchema),
    defaultValues: {
      reportNumber: "",
      tankId: "",
      service: "",
      inspector: "",
      inspectionDate: "",
      diameter: null,
      height: null,
      originalThickness: null,
      yearsSinceLastInspection: 1,
      status: "draft"
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: async (data: InsertInspectionReport) => {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to update report');
      }
      return response.json();
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      navigate(`/report/${reportId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update report",
        variant: "destructive",
      });
    }
  });

  // Update form when report data loads
  useEffect(() => {
    if (report) {
      form.reset({
        reportNumber: report.reportNumber,
        tankId: report.tankId,
        service: report.service,
        inspector: report.inspector,
        inspectionDate: report.inspectionDate,
        diameter: report.diameter,
        height: report.height,
        originalThickness: report.originalThickness,
        yearsSinceLastInspection: report.yearsSinceLastInspection || 1,
        status: report.status
      });
    }
  }, [report, form]);

  const onSubmit = (data: InsertInspectionReport) => {
    updateReportMutation.mutate(data);
  };

  if (isLoading) {
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
          <p className="text-gray-600 mb-6">The inspection report you're trying to edit doesn't exist.</p>
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

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href={`/report/${reportId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Report
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Report</h1>
            <p className="text-gray-600">{report.reportNumber}</p>
          </div>
        </div>
        
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateReportMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateReportMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportNumber">Report Number</Label>
                <Input
                  id="reportNumber"
                  {...form.register('reportNumber')}
                />
                {form.formState.errors.reportNumber && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.reportNumber.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="tankId">Tank ID</Label>
                <Input
                  id="tankId"
                  {...form.register('tankId')}
                />
                {form.formState.errors.tankId && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.tankId.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="service">Service</Label>
                <Select value={form.watch('service')} onValueChange={(value) => form.setValue('service', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crude">Crude Oil</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasoline">Gasoline</SelectItem>
                    <SelectItem value="jet_fuel">Jet Fuel</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="chemical">Chemical</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.service && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.service.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="inspector">Inspector</Label>
                <Input
                  id="inspector"
                  {...form.register('inspector')}
                />
                {form.formState.errors.inspector && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.inspector.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="inspectionDate">Inspection Date</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  {...form.register('inspectionDate')}
                />
                {form.formState.errors.inspectionDate && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.inspectionDate.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="diameter">Diameter (ft)</Label>
                <Input
                  id="diameter"
                  type="number"
                  {...form.register('diameter')}
                  placeholder="120"
                />
              </div>
              
              <div>
                <Label htmlFor="height">Height (ft)</Label>
                <Input
                  id="height"
                  type="number"
                  {...form.register('height')}
                  placeholder="48"
                />
              </div>
              
              <div>
                <Label htmlFor="yearsSinceLastInspection">Years Since Last Inspection</Label>
                <Input
                  id="yearsSinceLastInspection"
                  type="number"
                  step="0.1"
                  {...form.register('yearsSinceLastInspection', { valueAsNumber: true })}
                />
              </div>
              
              <div>
                <Label htmlFor="originalThickness">Original Thickness (in)</Label>
                <Input
                  id="originalThickness"
                  type="number"
                  step="0.001"
                  {...form.register('originalThickness', { valueAsNumber: true })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Report Status</Label>
              <Select 
                value={form.watch('status')} 
                onValueChange={(value) => form.setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Thickness Measurements Section */}
        <ThicknessMeasurementsEdit reportId={reportId} />
        
        {/* Checklist Section */}
        <ChecklistEdit reportId={reportId} />
        
        <div className="flex justify-between">
          <Link href={`/report/${reportId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          
          <Button 
            type="submit"
            disabled={updateReportMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateReportMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}