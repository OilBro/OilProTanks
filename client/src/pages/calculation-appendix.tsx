import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CMLDataEntry } from "@/components/cml-data-entry";
import { ShellCalculations } from "@/components/shell-calculations";
import { SettlementSurvey } from "@/components/settlement-survey";
import { Calculator, FileText, BarChart3, Building, Layers, Wrench } from "lucide-react";
import { useLocation } from "wouter";

export default function CalculationAppendix() {
  const [, setLocation] = useLocation();
  
  // Component CML Data
  const [componentCMLData, setComponentCMLData] = useState([]);
  
  // Nozzle CML Data  
  const [nozzleCMLData, setNozzleCMLData] = useState([]);
  
  // Shell Calculation Data
  const [shellData, setShellData] = useState({
    diameter: 120,
    fillHeight: 48,
    specificGravity: 0.85,
    corrosionAllowance: 0.125,
    age: 10,
    courses: [
      {
        course: 1,
        height: 8,
        tNominal: 0.5,
        tActual: 0.425,
        material: "A36",
        stressValue: 16000,
        jointEfficiency: 1.0,
        tmin: 0.1,
        remainingLife: 15.2,
        status: 'acceptable' as const
      }
    ],
    notes: ""
  });
  
  // Settlement Survey Data
  const [settlementData, setSettlementData] = useState({
    tankDiameter: 120,
    numberOfPoints: 12,
    roofType: 'F' as const,
    modulus: 29000000,
    elevationSet: 'single' as const,
    points: [],
    calculationMethod: 'cosine' as const,
    notes: ""
  });

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API 653 Calculation Appendix</h2>
            <p className="text-gray-600">Comprehensive inspection calculations and data analysis</p>
          </div>
          <Button variant="outline" onClick={() => setLocation('/')}>
            Back to Dashboard
          </Button>
        </div>
        
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-sm font-medium">Component CML</div>
              <Badge variant="outline" className="text-xs mt-1">
                {componentCMLData.length} records
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Wrench className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-sm font-medium">Nozzle CML</div>
              <Badge variant="outline" className="text-xs mt-1">
                {nozzleCMLData.length} records
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calculator className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-sm font-medium">Shell Calc</div>
              <Badge variant="outline" className="text-xs mt-1">
                {shellData.courses.length} courses
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Building className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <div className="text-sm font-medium">Roof Calc</div>
              <Badge variant="outline" className="text-xs mt-1">
                Available
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Layers className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <div className="text-sm font-medium">Floor MRT</div>
              <Badge variant="outline" className="text-xs mt-1">
                Available
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-teal-600" />
              <div className="text-sm font-medium">Settlement</div>
              <Badge variant="outline" className="text-xs mt-1">
                {settlementData.points.length} points
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="component-cml" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="component-cml" className="text-xs">Component CML</TabsTrigger>
          <TabsTrigger value="nozzle-cml" className="text-xs">Nozzle CML</TabsTrigger>
          <TabsTrigger value="shell-calc" className="text-xs">Shell Calc</TabsTrigger>
          <TabsTrigger value="roof-calc" className="text-xs">Roof Calc</TabsTrigger>
          <TabsTrigger value="floor-mrt" className="text-xs">Floor MRT</TabsTrigger>
          <TabsTrigger value="settlement" className="text-xs">Settlement</TabsTrigger>
        </TabsList>

        <TabsContent value="component-cml" className="space-y-6">
          <CMLDataEntry
            records={componentCMLData}
            onRecordsChange={setComponentCMLData}
            componentType="shell"
          />
        </TabsContent>

        <TabsContent value="nozzle-cml" className="space-y-6">
          <CMLDataEntry
            records={nozzleCMLData}
            onRecordsChange={setNozzleCMLData}
            componentType="nozzle"
          />
        </TabsContent>

        <TabsContent value="shell-calc" className="space-y-6">
          <ShellCalculations
            data={shellData}
            onDataChange={setShellData}
          />
        </TabsContent>

        <TabsContent value="roof-calc" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                AST Roof Calculations
              </CardTitle>
              <p className="text-sm text-gray-600">
                Roof load calculations per API 650/653 requirements
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Building className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Roof Calculations Module</h3>
                <p className="text-sm max-w-md mx-auto">
                  Comprehensive roof load analysis including dead loads, live loads, 
                  wind loads, and seismic considerations per API 650 standards.
                </p>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
                  <h4 className="font-medium text-blue-800 mb-2">Features Include:</h4>
                  <div className="text-sm text-blue-700 space-y-1 text-left">
                    <p>• Fixed roof structural analysis</p>
                    <p>• Floating roof calculations</p>
                    <p>• Wind and seismic load factors</p>
                    <p>• Material stress evaluations</p>
                    <p>• Remaining life assessments</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="floor-mrt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Floor MRT Calculations
              </CardTitle>
              <p className="text-sm text-gray-600">
                Magnetic Flux Examination analysis for tank bottom assessment
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Floor MRT Analysis Module</h3>
                <p className="text-sm max-w-md mx-auto">
                  Advanced magnetic flux examination calculations for bottom plate 
                  integrity assessment with threshold optimization.
                </p>
                <div className="mt-6 p-4 bg-amber-50 rounded-lg max-w-md mx-auto">
                  <h4 className="font-medium text-amber-800 mb-2">MRT Capabilities:</h4>
                  <div className="text-sm text-amber-700 space-y-1 text-left">
                    <p>• RTbc and RTip threshold settings</p>
                    <p>• Top-side and bottom-side analysis</p>
                    <p>• Pitting depth evaluation</p>
                    <p>• Repair cost optimization</p>
                    <p>• Statistical analysis reporting</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlement" className="space-y-6">
          <SettlementSurvey
            data={settlementData}
            onDataChange={setSettlementData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}