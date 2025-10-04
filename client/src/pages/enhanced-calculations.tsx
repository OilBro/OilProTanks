import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VelocityAnalysisCalculator } from '@/components/velocity-analysis-calculator';
import { TankCapacityCalculator } from '@/components/tank-capacity-calculator';
import { Badge } from '@/components/ui/badge';
import { Calculator, Gauge, Container, Wrench, BarChart3 } from 'lucide-react';

export default function EnhancedCalculationsPage() {
  const [activeTab, setActiveTab] = useState('velocity-analysis');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Enhanced Calculations</h1>
          <p className="text-gray-500 mt-1">
            Advanced engineering calculations and analysis tools for tank inspection and design
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          OptanKit Enhanced
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Gauge className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Velocity Analysis</p>
                <p className="text-xs text-blue-700">API RP 14E Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Container className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Tank Capacity</p>
                <p className="text-xs text-green-700">Multi-Configuration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">Engineering Tools</p>
                <p className="text-xs text-purple-700">Industry Standards</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-900">Analysis Reports</p>
                <p className="text-xs text-orange-700">Professional Output</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calculation Tools */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-6 w-6" />
            <span>Professional Engineering Calculations</span>
          </CardTitle>
          <CardDescription className="text-blue-100">
            Industry-standard calculations with API 653, API 650, and API RP 14E compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger 
                value="velocity-analysis" 
                className="flex items-center space-x-2"
              >
                <Gauge className="h-4 w-4" />
                <span>Velocity Analysis</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tank-capacity" 
                className="flex items-center space-x-2"
              >
                <Container className="h-4 w-4" />
                <span>Tank Capacity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="velocity-analysis" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">API RP 14E Velocity Analysis</h3>
                <p className="text-sm text-blue-800">
                  Calculate erosional velocity, sonic velocity, and pipeline flow analysis according to 
                  API Recommended Practice 14E standards.
                </p>
              </div>
              <VelocityAnalysisCalculator />
            </TabsContent>

            <TabsContent value="tank-capacity" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Multi-Configuration Tank Capacity</h3>
                <p className="text-sm text-green-800">
                  Calculate tank volumes for various configurations including cylindrical, spherical, 
                  and custom tank geometries with accurate capacity tables.
                </p>
              </div>
              <TankCapacityCalculator />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Standards Compliance */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Industry Standards Compliance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-white">API 653</Badge>
              <span className="text-sm text-gray-700">Tank Inspection Standards</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-white">API 650</Badge>
              <span className="text-sm text-gray-700">Tank Design Standards</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-white">API RP 14E</Badge>
              <span className="text-sm text-gray-700">Pipeline Design Standards</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}