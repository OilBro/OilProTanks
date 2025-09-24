import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { InspectionReport, ThicknessMeasurement } from "@shared/schema";
import { calculateMeasurement } from "@/lib/calculations";

interface ThicknessMeasurementsEditProps {
  reportId: number;
}

const COMPONENT_OPTIONS = [
  { value: "Shell Course 1 (Bottom)", defaultThickness: 0.625 },  // Thickest - bottom course
  { value: "Shell Course 2", defaultThickness: 0.500 },
  { value: "Shell Course 3", defaultThickness: 0.375 },
  { value: "Shell Course 4", defaultThickness: 0.250 },
  { value: "Shell Course 5", defaultThickness: 0.250 },
  { value: "Shell Course 6 (Top)", defaultThickness: 0.187 },     // Thinnest - top course
  { value: "Shell Ring 1", defaultThickness: 0.625 },             // Alternative naming
  { value: "Shell Ring 2", defaultThickness: 0.500 },
  { value: "Shell Ring 3", defaultThickness: 0.375 },
  { value: "Shell Ring 4", defaultThickness: 0.250 },
  { value: "Bottom Plate", defaultThickness: 0.250 },
  { value: "Roof - Center", defaultThickness: 0.125 },
  { value: "Roof - Edge", defaultThickness: 0.125 },
  { value: "Roof - Nozzle Area", defaultThickness: 0.250 },
  { value: "Chime Area", defaultThickness: 0.500 },
  { value: "Nozzle", defaultThickness: 0.375 },
  { value: "Internal Annular Ring", defaultThickness: 0.250 },
  { value: "Critical Zone", defaultThickness: 0.500 },
  { value: "External Repad", defaultThickness: 0.375 }
];

export function ThicknessMeasurementsEdit({ reportId }: ThicknessMeasurementsEditProps) {
  const { toast } = useToast();
  const [yearsSince, setYearsSince] = useState(5);
  
  // Fetch existing measurements
  const { data: measurements = [], isLoading } = useQuery<ThicknessMeasurement[]>({
    queryKey: [`/api/reports/${reportId}/measurements`],
  });

  // Fetch report to get years since last inspection
  const { data: report } = useQuery<InspectionReport | null>({
    queryKey: [`/api/reports/${reportId}`],
  });

  useEffect(() => {
    if (report?.yearsSinceLastInspection) {
      setYearsSince(report.yearsSinceLastInspection);
    }
  }, [report]);

  // Update measurement mutation
  const updateMeasurementMutation = useMutation({
    mutationFn: async (measurement: ThicknessMeasurement) => {
      const response = await fetch(`/api/measurements/${measurement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurement)
      });
      if (!response.ok) throw new Error('Failed to update measurement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/measurements`] });
      toast({ title: "Success", description: "Measurement updated" });
    }
  });

  // Delete measurement mutation
  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: number) => {
      const response = await fetch(`/api/measurements/${measurementId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete measurement');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/measurements`] });
      toast({ title: "Success", description: "Measurement deleted" });
    }
  });

  // Add new measurement mutation
  const addMeasurementMutation = useMutation({
    mutationFn: async (measurement: Partial<ThicknessMeasurement>) => {
      const response = await fetch(`/api/reports/${reportId}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...measurement,
          reportId,
          createdAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to add measurement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/measurements`] });
      toast({ title: "Success", description: "Measurement added" });
    }
  });

  const handleUpdateMeasurement = (measurement: ThicknessMeasurement, field: string, value: any) => {
    const updated = { ...measurement, [field]: value };
    
    // Recalculate if thickness values change
    if (field === 'currentThickness' || field === 'originalThickness') {
      const original = parseFloat(field === 'originalThickness' ? value : measurement.originalThickness || '0');
      const current = parseFloat(field === 'currentThickness' ? value : measurement.currentThickness || '0');
      const calc = calculateMeasurement(original, current, yearsSince);
      Object.assign(updated, calc);
    }
    
    updateMeasurementMutation.mutate(updated);
  };

  const handleAddMeasurement = () => {
    const defaultComponent = COMPONENT_OPTIONS[0];
    addMeasurementMutation.mutate({
      component: defaultComponent.value,
      location: 'New Location',
      originalThickness: defaultComponent.defaultThickness.toString(),
      currentThickness: defaultComponent.defaultThickness.toString(),
      measurementType: 'shell',
      status: 'acceptable'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acceptable': return 'bg-green-100 text-green-800';
      case 'monitor': return 'bg-yellow-100 text-yellow-800';
      case 'action_required': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-gray-100 rounded"></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Thickness Measurements ({measurements.length})</CardTitle>
        <Button onClick={handleAddMeasurement} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Measurement
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="pb-2">Component</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Original (in)</th>
                <th className="pb-2">Current (in)</th>
                <th className="pb-2">Corr. Rate</th>
                <th className="pb-2">Remaining Life</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((measurement) => (
                <tr key={measurement.id} className="border-b">
                  <td className="py-3 pr-2">
                    <Select 
                      value={measurement.component || ''} 
                      onValueChange={(value) => {
                        const component = COMPONENT_OPTIONS.find(c => c.value === value);
                        handleUpdateMeasurement(measurement, 'component', value);
                        if (component && !measurement.originalThickness) {
                          handleUpdateMeasurement(measurement, 'originalThickness', component.defaultThickness.toString());
                        }
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPONENT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 pr-2">
                    <Input
                      value={measurement.location || ''}
                      onChange={(e) => handleUpdateMeasurement(measurement, 'location', e.target.value)}
                      className="w-32"
                    />
                  </td>
                  <td className="py-3 pr-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={measurement.originalThickness || ''}
                      onChange={(e) => handleUpdateMeasurement(measurement, 'originalThickness', e.target.value)}
                      className="w-24"
                    />
                  </td>
                  <td className="py-3 pr-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={measurement.currentThickness || ''}
                      onChange={(e) => handleUpdateMeasurement(measurement, 'currentThickness', e.target.value)}
                      className="w-24"
                    />
                  </td>
                  <td className="py-3 pr-2 text-sm">
                    {parseFloat(measurement.corrosionRate || '0').toFixed(4)} in/yr
                  </td>
                  <td className="py-3 pr-2 text-sm">
                    {parseFloat(measurement.remainingLife || '0').toFixed(1)} yrs
                  </td>
                  <td className="py-3 pr-2">
                    <Badge className={getStatusColor(measurement.status || 'acceptable')}>
                      {(measurement.status || 'acceptable').replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMeasurementMutation.mutate(measurement.id!)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}