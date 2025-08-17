import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { calculateMeasurement, validateThickness } from '@/lib/calculations';
import type { ThicknessMeasurement } from '@shared/schema';

interface ThicknessMeasurementsEditProps {
  reportId: number;
}

const COMPONENT_OPTIONS = [
  { value: "Shell Course 1 (Bottom)", defaultThickness: 0.625 },
  { value: "Shell Course 2", defaultThickness: 0.500 },
  { value: "Shell Course 3", defaultThickness: 0.375 },
  { value: "Shell Course 4", defaultThickness: 0.250 },
  { value: "Shell Course 5", defaultThickness: 0.250 },
  { value: "Shell Course 6 (Top)", defaultThickness: 0.187 },
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

export { ThicknessMeasurementsEdit };

function ThicknessMeasurementsEdit({ reportId }: ThicknessMeasurementsEditProps) {
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<ThicknessMeasurement[]>([]);
  const [newMeasurement, setNewMeasurement] = useState<Partial<ThicknessMeasurement>>({
    component: "",
    location: "",
    originalThickness: "",
    currentThickness: "",
    measurementType: "shell"
  });

  // Fetch report to get years since last inspection
  const { data: report } = useQuery({
    queryKey: [`/api/reports/${reportId}`],
    enabled: !!reportId
  });

  // Fetch existing measurements
  const { data: existingMeasurements = [], isLoading } = useQuery({
    queryKey: [`/api/reports/${reportId}/measurements`],
    enabled: !!reportId
  });

  // Load measurements when data is fetched
  useEffect(() => {
    if (existingMeasurements && existingMeasurements.length > 0) {
      setMeasurements(existingMeasurements);
    }
  }, [existingMeasurements]);

  // Add measurement mutation
  const addMeasurementMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/reports/${reportId}/measurements`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (newMeasurement) => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/measurements`] });
      toast({
        title: "Success",
        description: "Measurement added successfully"
      });
      // Add to local state
      setMeasurements([...measurements, newMeasurement]);
      // Reset form
      setNewMeasurement({
        component: "",
        location: "",
        originalThickness: "",
        currentThickness: "",
        measurementType: "shell"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add measurement",
        variant: "destructive"
      });
    }
  });

  // Delete measurement mutation
  const deleteMeasurementMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/measurements/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/measurements`] });
      toast({
        title: "Success",
        description: "Measurement deleted successfully"
      });
    }
  });

  const yearsSinceLastInspection = report?.yearsSinceLastInspection || 5;

  const addMeasurement = () => {
    if (!newMeasurement.component || !newMeasurement.location || 
        !newMeasurement.currentThickness || !newMeasurement.originalThickness) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const currentThickness = parseFloat(newMeasurement.currentThickness as string);
    const originalThickness = parseFloat(newMeasurement.originalThickness as string);
    
    if (!validateThickness(currentThickness) || !validateThickness(originalThickness)) {
      toast({
        title: "Error",
        description: "Invalid thickness values",
        variant: "destructive"
      });
      return;
    }

    const calculation = calculateMeasurement(
      originalThickness,
      currentThickness,
      yearsSinceLastInspection
    );

    const measurementData = {
      component: newMeasurement.component,
      measurementType: newMeasurement.measurementType || "shell",
      location: newMeasurement.location,
      originalThickness: originalThickness.toString(),
      currentThickness: currentThickness.toFixed(3),
      corrosionRate: calculation.corrosionRate.toFixed(4),
      remainingLife: calculation.remainingLife.toFixed(1),
      status: calculation.status
    };

    addMeasurementMutation.mutate(measurementData);
  };

  const removeMeasurement = (id: number) => {
    deleteMeasurementMutation.mutate(id);
    setMeasurements(measurements.filter(m => m.id !== id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'acceptable':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Acceptable</Badge>;
      case 'monitor':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Monitor</Badge>;
      case 'action_required':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Action Required</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thickness Measurements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original (in)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current (in)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corrosion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Life</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {measurements.map((measurement) => (
                <tr key={measurement.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{measurement.component}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{measurement.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{measurement.originalThickness}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{measurement.currentThickness}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{measurement.corrosionRate} in/yr</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{measurement.remainingLife} years</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(measurement.status || 'acceptable')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMeasurement(measurement.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              
              {/* Add new measurement row */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select 
                    value={newMeasurement.component || ''} 
                    onValueChange={(value) => {
                      const component = COMPONENT_OPTIONS.find(opt => opt.value === value);
                      setNewMeasurement({
                        ...newMeasurement, 
                        component: value,
                        originalThickness: component?.defaultThickness?.toString() || ""
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Component" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.value} (Default: {option.defaultThickness}")
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    value={newMeasurement.location || ''}
                    onChange={(e) => setNewMeasurement({...newMeasurement, location: e.target.value})}
                    placeholder="Location"
                    className="w-full"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.001"
                    value={newMeasurement.originalThickness || ''}
                    onChange={(e) => setNewMeasurement({...newMeasurement, originalThickness: e.target.value})}
                    placeholder="0.500"
                    className="w-20"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.001"
                    value={newMeasurement.currentThickness || ''}
                    onChange={(e) => setNewMeasurement({...newMeasurement, currentThickness: e.target.value})}
                    placeholder="0.485"
                    className="w-20"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" colSpan={3}>
                  Auto-calculated
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    type="button"
                    onClick={addMeasurement}
                    disabled={addMeasurementMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addMeasurementMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}