import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Upload, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateMeasurement, validateThickness } from "@/lib/calculations";
import type { ThicknessMeasurement } from "@shared/schema";

interface ThicknessTableProps {
  measurements: ThicknessMeasurement[];
  onMeasurementsChange: (measurements: ThicknessMeasurement[]) => void;
  yearsSinceLastInspection: number;
}

const COMPONENT_OPTIONS = [
  { value: "Shell Course 1 (Bottom)", defaultThickness: 0.625 },  // Thickest - bottom course
  { value: "Shell Course 2", defaultThickness: 0.500 },
  { value: "Shell Course 3", defaultThickness: 0.375 },
  { value: "Shell Course 4", defaultThickness: 0.250 },
  { value: "Shell Course 5", defaultThickness: 0.250 },
  { value: "Shell Course 6 (Top)", defaultThickness: 0.187 },     // Thinnest - top course
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

const MEASUREMENT_TYPES = [
  { value: "shell", label: "Shell" },
  { value: "bottom_plate", label: "Bottom Plate" },
  { value: "chime", label: "Chime Area" },
  { value: "internal_annular", label: "Internal Annular Ring" },
  { value: "critical_zone", label: "Critical Zone" },
  { value: "roof", label: "Roof" },
  { value: "internal_component", label: "Internal Component" },
  { value: "external_repad", label: "External Repad" },
  { value: "nozzle", label: "Nozzle" },
  { value: "flange", label: "Flange" }
];

const ANNULAR_POSITIONS = [
  { value: "inner", label: "Inner" },
  { value: "center", label: "Center" },
  { value: "outer", label: "Outer" }
];

const CRITICAL_ZONE_TYPES = [
  { value: "settlement", label: "Settlement Area" },
  { value: "corrosion", label: "Corrosion Area" },
  { value: "repair", label: "Previous Repair" },
  { value: "stress", label: "High Stress Area" }
];

const REPAD_TYPES = [
  { value: "full_face", label: "Full Face" },
  { value: "partial", label: "Partial" },
  { value: "reinforcement", label: "Reinforcement" }
];

export function ThicknessTable({ 
  measurements, 
  onMeasurementsChange, 
  yearsSinceLastInspection 
}: ThicknessTableProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reportId, setReportId] = useState<number>(measurements[0]?.reportId || 0);
  const [newMeasurement, setNewMeasurement] = useState<Partial<ThicknessMeasurement>>({
    component: "",
    measurementType: "shell",
    location: "",
    elevation: null,
    gridReference: null,
    plateNumber: null,
    annularRingPosition: null,
    criticalZoneType: null,
    repadNumber: null,
    repadType: null,
    repadThickness: null,
    nozzleId: null,
    nozzleSize: null,
    flangeClass: null,
    flangeType: null,
    originalThickness: null,
    currentThickness: null,
    corrosionRate: null,
    remainingLife: null,
    status: "acceptable"
  });

  const addMeasurement = () => {
    if (!newMeasurement.component || !newMeasurement.location || !newMeasurement.currentThickness || !newMeasurement.originalThickness) {
      return;
    }

    const currentThickness = parseFloat(newMeasurement.currentThickness as string);
    const originalThickness = parseFloat(newMeasurement.originalThickness as string);
    
    if (!validateThickness(currentThickness) || !validateThickness(originalThickness)) {
      return;
    }

    const calculation = calculateMeasurement(
      originalThickness,
      currentThickness,
      yearsSinceLastInspection
    );

    const measurement: ThicknessMeasurement = {
      id: Date.now(),
      reportId: 0,
      component: newMeasurement.component!,
      measurementType: newMeasurement.measurementType || "shell",
      location: newMeasurement.location!,
      elevation: newMeasurement.elevation || null,
      gridReference: newMeasurement.gridReference || null,
      plateNumber: newMeasurement.plateNumber || null,
      annularRingPosition: newMeasurement.annularRingPosition || null,
      criticalZoneType: newMeasurement.criticalZoneType || null,
      repadNumber: newMeasurement.repadNumber || null,
      repadType: newMeasurement.repadType || null,
      repadThickness: newMeasurement.repadThickness || null,
      nozzleId: newMeasurement.nozzleId || null,
      nozzleSize: newMeasurement.nozzleSize || null,
      flangeClass: newMeasurement.flangeClass || null,
      flangeType: newMeasurement.flangeType || null,
      originalThickness: originalThickness.toString(),
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
  
  const handleDownloadDataIngestionPackage = async () => {
    try {
      const response = await fetch('/api/data-ingestion/package');
      if (!response.ok) throw new Error('Failed to download package');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'API653_Data_Ingestion_Package.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Package Downloaded",
        description: "Data ingestion templates downloaded successfully. Extract and fill out the CSV templates.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download data ingestion package",
        variant: "destructive"
      });
    }
  };
  
  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'shell'); // Default to shell measurements
    
    try {
      const response = await fetch(`/api/reports/${reportId || 1}/import-csv`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to import CSV');
      
      const result = await response.json();
      
      toast({
        title: "Import Successful",
        description: `${result.recordsProcessed} measurements imported successfully`,
      });
      
      // Reload measurements - would need to trigger parent refresh
      window.location.reload();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import CSV data. Please check the file format.",
        variant: "destructive"
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateMeasurement = (id: number, field: keyof ThicknessMeasurement, value: any) => {
    const updatedMeasurements = measurements.map(measurement => {
      if (measurement.id === id) {
        // Ensure numeric fields are stored as strings
        let processedValue = value;
        if (field === 'currentThickness' || field === 'originalThickness') {
          processedValue = value ? value.toString() : null;
        }
        
        const updated = { ...measurement, [field]: processedValue };
        
        // Recalculate if thickness changed and we have both original and current thickness
        if ((field === 'currentThickness' || field === 'originalThickness') && 
            updated.originalThickness && updated.currentThickness) {
          const originalThickness = parseFloat(updated.originalThickness.toString());
          const currentThickness = parseFloat(updated.currentThickness.toString());
          const calculation = calculateMeasurement(
            originalThickness,
            currentThickness,
            yearsSinceLastInspection
          );
          return {
            ...updated,
            currentThickness: currentThickness.toFixed(3),
            originalThickness: originalThickness.toString(),
            corrosionRate: calculation.corrosionRate.toFixed(4),
            remainingLife: calculation.remainingLife.toFixed(1),
            status: calculation.status
          };
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
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleDownloadDataIngestionPackage}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            CSV Templates
          </Button>
          
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />
          
          <Button type="button" onClick={addMeasurement} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>
      
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
                        <SelectItem key={option.value} value={option.value}>{option.value}</SelectItem>
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
                    value={measurement.originalThickness || ''}
                    onChange={(e) => updateMeasurement(measurement.id, 'originalThickness', e.target.value)}
                    placeholder="0.500"
                    className="w-20"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.001"
                    value={measurement.currentThickness || ''}
                    onChange={(e) => updateMeasurement(measurement.id, 'currentThickness', e.target.value)}
                    placeholder="0.485"
                    className="w-20"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-mono">
                    {(() => {
                      if (measurement.corrosionRate !== null && measurement.corrosionRate !== undefined) {
                        return `${measurement.corrosionRate} in/yr`;
                      }
                      // Calculate on the fly if not stored
                      const orig = parseFloat(measurement.originalThickness?.toString() || '0');
                      const curr = parseFloat(measurement.currentThickness?.toString() || '0');
                      const years = yearsSinceLastInspection || 5;
                      if (orig > 0 && curr > 0 && years > 0) {
                        const metalLoss = orig - curr;
                        const rate = metalLoss / years;
                        return `${rate.toFixed(4)} in/yr`;
                      }
                      return '---';
                    })()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-mono">
                    {(() => {
                      if (measurement.remainingLife !== null && measurement.remainingLife !== undefined) {
                        return `${measurement.remainingLife} years`;
                      }
                      // Calculate on the fly if not stored
                      const orig = parseFloat(measurement.originalThickness?.toString() || '0');
                      const curr = parseFloat(measurement.currentThickness?.toString() || '0');
                      const years = yearsSinceLastInspection || 5;
                      if (orig > 0 && curr > 0 && years > 0) {
                        const metalLoss = orig - curr;
                        const rate = metalLoss / years;
                        const minThickness = orig * 0.5;
                        const remaining = curr - minThickness;
                        const life = rate > 0 ? remaining / rate : 999;
                        return `${Math.min(life, 999).toFixed(1)} years`;
                      }
                      return '---';
                    })()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(measurement.status || 'acceptable')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                      originalThickness: component?.defaultThickness?.toString() || null
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
                  placeholder="Location description"
                  className="w-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Input
                  type="number"
                  step="0.001"
                  value={newMeasurement.originalThickness || ''}
                  onChange={(e) => setNewMeasurement({...newMeasurement, originalThickness: e.target.value || null})}
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
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                {(() => {
                  const orig = parseFloat(newMeasurement.originalThickness?.toString() || '0');
                  const curr = parseFloat(newMeasurement.currentThickness?.toString() || '0');
                  const years = yearsSinceLastInspection || 10;
                  if (orig > 0 && curr > 0 && years > 0) {
                    const metalLoss = orig - curr;
                    const rate = metalLoss / years;
                    return `${rate.toFixed(4)} in/yr`;
                  }
                  return '---';
                })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                {(() => {
                  const orig = parseFloat(newMeasurement.originalThickness?.toString() || '0');
                  const curr = parseFloat(newMeasurement.currentThickness?.toString() || '0');
                  const years = yearsSinceLastInspection || 10;
                  if (orig > 0 && curr > 0 && years > 0) {
                    const metalLoss = orig - curr;
                    const rate = metalLoss / years;
                    const minThickness = orig * 0.5;
                    const remaining = curr - minThickness;
                    const life = rate > 0 ? remaining / rate : 999;
                    return `${Math.min(life, 999).toFixed(1)} years`;
                  }
                  return '---';
                })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {(() => {
                  const orig = parseFloat(newMeasurement.originalThickness || '0');
                  const curr = parseFloat(newMeasurement.currentThickness || '0');
                  const years = yearsSinceLastInspection || 5;
                  if (orig > 0 && curr > 0 && years > 0) {
                    const metalLoss = orig - curr;
                    const rate = metalLoss / years;
                    const minThickness = orig * 0.5;
                    const remaining = curr - minThickness;
                    const life = rate > 0 ? remaining / rate : 999;
                    
                    if (curr <= minThickness || life <= 5) {
                      return <Badge className="bg-red-100 text-red-800">Action Required</Badge>;
                    } else if (life <= 10) {
                      return <Badge className="bg-yellow-100 text-yellow-800">Monitor</Badge>;
                    } else {
                      return <Badge className="bg-green-100 text-green-800">Acceptable</Badge>;
                    }
                  }
                  return <Badge variant="secondary">---</Badge>;
                })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Button
                  type="button"
                  onClick={addMeasurement}
                  size="sm"
                  disabled={!newMeasurement.component || !newMeasurement.location || !newMeasurement.currentThickness || !newMeasurement.originalThickness}
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
