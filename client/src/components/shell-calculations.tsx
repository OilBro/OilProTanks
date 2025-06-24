import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, AlertTriangle, Info } from "lucide-react";

interface ShellCourse {
  course: number;
  height: number; // feet
  tNominal: number; // inches
  tActual: number; // inches
  material: string;
  stressValue: number; // psi
  jointEfficiency: number;
  altTmin?: number; // Override calculated tmin
  tmin: number; // calculated minimum thickness
  remainingLife: number; // years
  status: 'acceptable' | 'monitor' | 'action_required';
}

interface ShellCalculationData {
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

// API 650 Material specifications
const MATERIALS = [
  { value: "A36", label: "A36", stress: 16000 },
  { value: "A283C", label: "A283 Grade C", stress: 16000 },
  { value: "A573-58", label: "A573 Grade 58", stress: 20000 },
  { value: "A573-65", label: "A573 Grade 65", stress: 22500 },
  { value: "A516-60", label: "A516 Grade 60", stress: 20000 },
  { value: "A516-65", label: "A516 Grade 65", stress: 22500 },
  { value: "A516-70", label: "A516 Grade 70", stress: 24000 }
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
  const calculateShellRequirements = (course: ShellCourse, fillHeight: number) => {
    const H = fillHeight - data.courses.slice(0, course.course - 1).reduce((sum, c) => sum + c.height, 0);
    const hydrostaticPressure = 0.433 * data.specificGravity * H; // psi per foot of height
    const designPressure = hydrostaticPressure + 2.5; // Add atmospheric pressure
    
    // Shell thickness calculation per API 650
    const requiredThickness = (designPressure * data.diameter * 12) / (2 * course.stressValue * course.jointEfficiency) + data.corrosionAllowance;
    const tmin = Math.max(requiredThickness, 0.100); // Minimum 0.100" per API 653
    
    // Remaining life calculation
    const corrosionRate = (course.tNominal - course.tActual) / data.age;
    const remainingLife = corrosionRate > 0 ? (course.tActual - (course.altTmin || tmin)) / corrosionRate : 999;
    
    return {
      designPressure: designPressure.toFixed(2),
      requiredThickness: requiredThickness.toFixed(3),
      tmin: tmin.toFixed(3),
      corrosionRate: (corrosionRate * 1000).toFixed(1), // mils per year
      remainingLife: remainingLife.toFixed(1),
      status: remainingLife < 5 ? 'action_required' : remainingLife < 10 ? 'monitor' : 'acceptable'
    };
  };

  const updateCourse = (index: number, updates: Partial<ShellCourse>) => {
    const newCourses = [...data.courses];
    newCourses[index] = { ...newCourses[index], ...updates };
    
    // Recalculate when values change
    const calc = calculateShellRequirements(newCourses[index], data.fillHeight);
    newCourses[index].tmin = parseFloat(calc.tmin);
    newCourses[index].remainingLife = parseFloat(calc.remainingLife);
    newCourses[index].status = calc.status as any;
    
    onDataChange({ ...data, courses: newCourses });
  };

  const addCourse = () => {
    const newCourse: ShellCourse = {
      course: data.courses.length + 1,
      height: 8,
      tNominal: 0.5,
      tActual: 0.45,
      material: "A36",
      stressValue: 16000,
      jointEfficiency: 1.0,
      tmin: 0.1,
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
    const updatedCourses = data.courses.map(course => {
      const calc = calculateShellRequirements(course, data.fillHeight);
      return {
        ...course,
        tmin: parseFloat(calc.tmin),
        remainingLife: parseFloat(calc.remainingLife),
        status: calc.status as any
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
            const calc = calculateShellRequirements(course, data.fillHeight);
            
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
                    <Label>T Nominal (in)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={course.tNominal}
                      onChange={(e) => updateCourse(index, { tNominal: parseFloat(e.target.value) || 0 })}
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
                    <Label>Alt Tmin (override)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Optional override"
                      value={course.altTmin || ''}
                      onChange={(e) => updateCourse(index, { 
                        altTmin: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
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
                    <span className="font-medium">Design Pressure:</span><br />
                    {calc.designPressure} psi
                  </div>
                  <div>
                    <span className="font-medium">Required Thickness:</span><br />
                    {calc.requiredThickness}"
                  </div>
                  <div>
                    <span className="font-medium">Tmin:</span><br />
                    {calc.tmin}"
                  </div>
                  <div>
                    <span className="font-medium">Corrosion Rate:</span><br />
                    {calc.corrosionRate} mils/yr
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded p-3 flex justify-between items-center">
                  <div>
                    <span className="font-medium">Remaining Life: </span>
                    <span className={`font-bold ${course.remainingLife < 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {calc.remainingLife} years
                    </span>
                  </div>
                  {course.remainingLife < 10 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Attention Required</span>
                    </div>
                  )}
                </div>
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