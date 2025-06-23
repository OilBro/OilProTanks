import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { calculateMeasurement, validateThickness } from "@/lib/calculations";
import type { ThicknessMeasurement } from "@shared/schema";

interface ThicknessTableProps {
  measurements: ThicknessMeasurement[];
  onMeasurementsChange: (measurements: ThicknessMeasurement[]) => void;
  originalThickness: number;
  yearsSinceLastInspection: number;
}

const COMPONENT_OPTIONS = [
  "Shell Course 1",
  "Shell Course 2", 
  "Shell Course 3",
  "Shell Course 4",
  "Bottom Plate",
  "Roof",
  "Chime Area",
  "Nozzle"
];

export function ThicknessTable({ 
  measurements, 
  onMeasurementsChange, 
  originalThickness, 
  yearsSinceLastInspection 
}: ThicknessTableProps) {
  const [newMeasurement, setNewMeasurement] = useState<Partial<ThicknessMeasurement>>({
    component: "",
    location: "",
    currentThickness: "",
    status: "acceptable"
  });

  const addMeasurement = () => {
    if (!newMeasurement.component || !newMeasurement.location || !newMeasurement.currentThickness) {
      return;
    }

    const currentThickness = parseFloat(newMeasurement.currentThickness as string);
    if (!validateThickness(currentThickness)) {
      return;
    }

    const calculation = calculateMeasurement(
      originalThickness,
      currentThickness,
      yearsSinceLastInspection
    );

    const measurement: ThicknessMeasurement = {
      id: Date.now(), // temporary ID
      reportId: 0, // will be set when saving
      component: newMeasurement.component,
      location: newMeasurement.location,
      currentThickness: currentThickness.toFixed(3),
      corrosionRate: calculation.corrosionRate.toFixed(4),
      remainingLife: calculation.remainingLife.toFixed(1),
      status: calculation.status,
      createdAt: new Date().toISOString()
    };

    onMeasurementsChange([...measurements, measurement]);
    setNewMeasurement({
      component: "",
      location: "",
      currentThickness: "",
      status: "acceptable"
    });
  };

  const removeMeasurement = (id: number) => {
    onMeasurementsChange(measurements.filter(m => m.id !== id));
  };

  const updateMeasurement = (id: number, field: string, value: string) => {
    const updatedMeasurements = measurements.map(measurement => {
      if (measurement.id === id) {
        const updated = { ...measurement, [field]: value };
        
        // Recalculate if current thickness changes
        if (field === 'currentThickness') {
          const currentThickness = parseFloat(value);
          if (validateThickness(currentThickness)) {
            const calculation = calculateMeasurement(
              originalThickness,
              currentThickness,
              yearsSinceLastInspection
            );
            updated.corrosionRate = calculation.corrosionRate.toFixed(4);
            updated.remainingLife = calculation.remainingLife.toFixed(1);
            updated.status = calculation.status;
          }
        }
        
        return updated;
      }
      return measurement;
    });
    
    onMeasurementsChange(updatedMeasurements);
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Thickness Measurements</h3>
        <Button onClick={addMeasurement} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Thickness (in)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corrosion Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Life</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {measurements.map((measurement) => (
              <tr key={measurement.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select 
                    value={measurement.component || ''} 
                    onValueChange={(value) => updateMeasurement(measurement.id, 'component', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    value={measurement.location || ''}
                    onChange={(e) => updateMeasurement(measurement.id, 'location', e.target.value)}
                    placeholder="Q1-Q2 Chime"
                    className="w-full"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.001"
                    value={measurement.currentThickness || ''}
                    onChange={(e) => updateMeasurement(measurement.id, 'currentThickness', e.target.value)}
                    placeholder="0.485"
                    className="w-full"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-mono">{measurement.corrosionRate} in/yr</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-mono">{measurement.remainingLife} years</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(measurement.status || 'acceptable')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button
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
                  onValueChange={(value) => setNewMeasurement({...newMeasurement, component: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Component" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Input
                  value={newMeasurement.location || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, location: e.target.value})}
                  placeholder="Location description"
                  className="w-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Input
                  type="number"
                  step="0.001"
                  value={newMeasurement.currentThickness || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, currentThickness: e.target.value})}
                  placeholder="0.000"
                  className="w-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                Auto-calculated
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                Auto-calculated
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                Auto-determined
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Button
                  onClick={addMeasurement}
                  size="sm"
                  disabled={!newMeasurement.component || !newMeasurement.location || !newMeasurement.currentThickness}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
