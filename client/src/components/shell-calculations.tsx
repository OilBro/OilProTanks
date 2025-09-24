import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, AlertTriangle, Info } from "lucide-react";

export interface ShellCourse {
  course: number;
  height: number; // feet
  tOriginal: number; // inches - original thickness
  tActual: number; // inches - actual measured thickness
  tRequired: number; // inches - calculated required thickness
  tMin: number; // inches - minimum allowable thickness
  material: string;
  stressValue: number; // psi
  jointEfficiency: number;
  corrosionRate: number; // mpy (mils per year)
  remainingLife: number; // years
  status: 'acceptable' | 'monitor' | 'action_required' | 'critical';
}

export interface ShellCalculationData {
  diameter: number; // feet
  fillHeight: number; // feet
  specificGravity: number;
  corrosionAllowance: number; // inches
  age: number; // years
  courses: ShellCourse[];
  notes: string;
}

interface ShellCalculationsProps {
  data: ShellCalculationData;
  onDataChange: (data: ShellCalculationData) => void;
}

// API 653 Material specifications with allowable stress values
const MATERIALS = [
  { value: "A36", label: "A36", stress: 26700 },
  { value: "A283C", label: "A283 Grade C", stress: 24000 },
  { value: "A285C", label: "A285 Grade C", stress: 24000 },
  { value: "A516-60", label: "A516 Grade 60", stress: 26700 },
  { value: "A516-65", label: "A516 Grade 65", stress: 28200 },
  { value: "A516-70", label: "A516 Grade 70", stress: 30000 },
  { value: "A573-58", label: "A573 Grade 58", stress: 26700 },
  { value: "A573-65", label: "A573 Grade 65", stress: 28200 },
  { value: "A573-70", label: "A573 Grade 70", stress: 30000 }
];

// Joint efficiency values per API 650 Table 4-2
const JOINT_EFFICIENCIES = [
  { value: 1.0, label: "1.0 - Full Radiography" },
  { value: 0.85, label: "0.85 - Spot Radiography" },
  { value: 0.70, label: "0.70 - No Radiography" }
];

export function ShellCalculations({ data, onDataChange }: ShellCalculationsProps) {
  const [calculations, setCalculations] = useState<any>({});

  // Calculate shell stress and minimum thickness per API 653
  const calculateShellRequirements = (course: ShellCourse, courseIndex: number) => {
    // Calculate height from bottom of this course
    const bottomOfCourse = data.courses.slice(0, courseIndex).reduce((sum, c) => sum + c.height, 0);
    const H = Math.max(data.fillHeight - bottomOfCourse - 1, 0); // API 653 uses (H-1)
    
    // API 653 Formula: t_required = 2.6 * D * (H - 1) * G / (S * E)
    const tRequired = (2.6 * data.diameter * H * data.specificGravity) / 
                      (course.stressValue * course.jointEfficiency);
    
    // Minimum thickness per API 653
    const tMin = Math.max(tRequired, 0.100); // Minimum 0.100" per API 653
    
    // Corrosion rate calculation
    const thicknessLoss = course.tOriginal - course.tActual;
    const corrosionRate = data.age > 0 ? (thicknessLoss / data.age) * 1000 : 0; // mpy
    
    // Remaining life calculation
    const remainingCorrosionAllowance = course.tActual - tMin;
    const remainingLife = corrosionRate > 0 ? (remainingCorrosionAllowance * 1000) / corrosionRate : 999;
    
    // Determine status based on remaining life
    let status: ShellCourse['status'] = 'acceptable';
    if (remainingLife < 2) {
      status = 'critical';
    } else if (remainingLife < 5) {
      status = 'action_required';
    } else if (remainingLife < 10) {
      status = 'monitor';
    }
    
    return {
      tRequired: tRequired,
      tMin: tMin,
      corrosionRate: corrosionRate,
      remainingLife: Math.max(remainingLife, 0),
      status: status
    };
  };

  const updateCourse = (index: number, updates: Partial<ShellCourse>) => {
    const newCourses = [...data.courses];
    newCourses[index] = { ...newCourses[index], ...updates };
    
    // Recalculate when values change
    const calc = calculateShellRequirements(newCourses[index], index);
    newCourses[index].tRequired = calc.tRequired;
    newCourses[index].tMin = calc.tMin;
    newCourses[index].corrosionRate = calc.corrosionRate;
    newCourses[index].remainingLife = calc.remainingLife;
    newCourses[index].status = calc.status;
    
    onDataChange({ ...data, courses: newCourses });
  };

  const addCourse = () => {
    const newCourse: ShellCourse = {
      course: data.courses.length + 1,
      height: 8,
      tOriginal: 0.25,
      tActual: 0.241,
      tRequired: 0,
      tMin: 0.1,
      material: "A36",
      stressValue: 26700,
      jointEfficiency: 0.85,
      corrosionRate: 0,
      remainingLife: 999,
      status: 'acceptable'
    };
    onDataChange({ ...data, courses: [...data.courses, newCourse] });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'action_required': return 'destructive';
      case 'monitor': return 'secondary';
      default: return 'default';
    }
  };

  const getGoverningCourse = () => {
    return data.courses.reduce((min, course) => 
      course.remainingLife < min.remainingLife ? course : min
    );
  };

  useEffect(() => {
    // Recalculate all courses when tank parameters change
    const updatedCourses = data.courses.map((course, index) => {
      const calc = calculateShellRequirements(course, index);
      return {
        ...course,
        tRequired: calc.tRequired,
        tMin: calc.tMin,
        corrosionRate: calc.corrosionRate,
        remainingLife: calc.remainingLife,
        status: calc.status
      };
    });
    
    if (JSON.stringify(updatedCourses) !== JSON.stringify(data.courses)) {
      onDataChange({ ...data, courses: updatedCourses });
    }
  }, [data.diameter, data.fillHeight, data.specificGravity, data.corrosionAllowance, data.age]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Shell Calculations (API 653)
        </CardTitle>
        <p className="text-sm text-gray-600">
          Remaining life calculations for tank shell courses per API 653 requirements
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tank Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="diameter">Tank Diameter (ft)</Label>
            <Input
              type="number"
              value={data.diameter}
              onChange={(e) => onDataChange({ ...data, diameter: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="fillHeight">Fill Height (ft)</Label>
            <Input
              type="number"
              value={data.fillHeight}
              onChange={(e) => onDataChange({ ...data, fillHeight: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="specificGravity">Specific Gravity</Label>
            <Input
              type="number"
              step="0.01"
              value={data.specificGravity}
              onChange={(e) => onDataChange({ ...data, specificGravity: parseFloat(e.target.value) || 0.8 })}
            />
          </div>
          <div>
            <Label htmlFor="corrosionAllowance">Corrosion Allowance (in)</Label>
            <Input
              type="number"
              step="0.001"
              value={data.corrosionAllowance}
              onChange={(e) => onDataChange({ ...data, corrosionAllowance: parseFloat(e.target.value) || 0.125 })}
            />
          </div>
        </div>

        {/* Joint Efficiency Reference */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Joint Efficiency Values (API 650 Table 4-2)
          </h5>
          <div className="text-sm text-blue-700 space-y-1">
            {JOINT_EFFICIENCIES.map(je => (
              <div key={je.value}>{je.label}</div>
            ))}
          </div>
        </div>

        {/* Shell Courses */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Shell Courses</h4>
            <Button type="button" onClick={addCourse} variant="outline" size="sm">
              Add Course
            </Button>
          </div>

          {data.courses.map((course, index) => {
            
            return (
              <div key={course.course} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="font-medium">Course {course.course}</h5>
                  <Badge variant={getStatusColor(course.status)}>
                    {course.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Course Height (ft)</Label>
                    <Input
                      type="number"
                      value={course.height}
                      onChange={(e) => updateCourse(index, { height: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>T Original (in)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={course.tOriginal}
                      onChange={(e) => updateCourse(index, { tOriginal: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>T Actual (in)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={course.tActual}
                      onChange={(e) => updateCourse(index, { tActual: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Material</Label>
                    <Select 
                      value={course.material} 
                      onValueChange={(value) => {
                        const material = MATERIALS.find(m => m.value === value);
                        updateCourse(index, { 
                          material: value, 
                          stressValue: material?.stress || 16000 
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIALS.map(material => (
                          <SelectItem key={material.value} value={material.value}>
                            {material.label} ({material.stress} psi)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Stress Value (psi)</Label>
                    <Input
                      type="number"
                      value={course.stressValue}
                      onChange={(e) => updateCourse(index, { stressValue: parseFloat(e.target.value) || 16000 })}
                    />
                  </div>
                  <div>
                    <Label>Joint Efficiency</Label>
                    <Select 
                      value={course.jointEfficiency.toString()} 
                      onValueChange={(value) => updateCourse(index, { jointEfficiency: parseFloat(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOINT_EFFICIENCIES.map(je => (
                          <SelectItem key={je.value} value={je.value.toString()}>
                            {je.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>T Min (in)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={course.tMin.toFixed(3)}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const newCourses = data.courses.filter((_, i) => i !== index);
                        onDataChange({ ...data, courses: newCourses });
                      }}
                    >
                      Remove Course
                    </Button>
                  </div>
                </div>

                {/* Calculation Results */}
                <div className="bg-gray-50 rounded p-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">T Required:</span><br />
                    {course.tRequired.toFixed(3)}"
                  </div>
                  <div>
                    <span className="font-medium">T Min:</span><br />
                    {course.tMin.toFixed(3)}"
                  </div>
                  <div>
                    <span className="font-medium">Corrosion Rate:</span><br />
                    {course.corrosionRate.toFixed(1)} mpy
                  </div>
                  <div>
                    <span className="font-medium">Remaining Life:</span><br />
                    {course.remainingLife > 100 ? '> 100' : course.remainingLife.toFixed(1)} years
                  </div>
                </div>
                
                {course.remainingLife < 10 && (
                  <div className="bg-red-50 rounded p-3 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Attention Required - Remaining Life: {course.remainingLife.toFixed(1)} years
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Governing Course Summary */}
        {data.courses.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-medium text-yellow-800 mb-2">Governing Course Analysis</h5>
            <div className="text-sm text-yellow-700">
              {(() => {
                const governing = getGoverningCourse();
                return (
                  <p>
                    <strong>Course {governing.course}</strong> governs with {governing.remainingLife.toFixed(1)} years remaining life.
                    {governing.remainingLife < data.fillHeight && (
                      <span className="block mt-1">
                        Consider reducing fill height to {governing.remainingLife.toFixed(1)} ft to match governing course capacity.
                      </span>
                    )}
                  </p>
                );
              })()}
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div>
          <Label htmlFor="notes">Calculation Notes</Label>
          <Textarea
            id="notes"
            placeholder="Enter any additional notes or considerations for the shell calculations..."
            value={data.notes}
            onChange={(e) => onDataChange({ ...data, notes: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            Notes will appear at the bottom of the calculation report
          </p>
        </div>
      </CardContent>
    </Card>
  );
}