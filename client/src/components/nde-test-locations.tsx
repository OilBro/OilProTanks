import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Upload, FileText } from "lucide-react";

interface NDEResult {
  id: number;
  testType: 'UT' | 'MT' | 'PT' | 'VT' | 'RT' | 'ET';
  location: string;
  component: string;
  gridReference?: string;
  testMethod: string;
  acceptance: 'pass' | 'fail' | 'conditional';
  discontinuityType?: string;
  discontinuitySize?: string;
  discontinuityDepth?: number;
  repairRequired: boolean;
  testDate: string;
  technician: string;
  equipment: string;
  findings: string;
  attachments?: string[];
}

interface NDETestLocationsProps {
  results: NDEResult[];
  onResultsChange: (results: NDEResult[]) => void;
}

const NDE_TYPES = [
  { value: 'UT', label: 'Ultrasonic Testing (UT)', description: 'Thickness measurement, flaw detection' },
  { value: 'MT', label: 'Magnetic Particle Testing (MT)', description: 'Surface and near-surface defects' },
  { value: 'PT', label: 'Penetrant Testing (PT)', description: 'Surface defects in non-magnetic materials' },
  { value: 'VT', label: 'Visual Testing (VT)', description: 'Visual inspection for defects' },
  { value: 'RT', label: 'Radiographic Testing (RT)', description: 'Internal defects in welds' },
  { value: 'ET', label: 'Eddy Current Testing (ET)', description: 'Surface and sub-surface defects' }
];

const DISCONTINUITY_TYPES = [
  'Crack', 'Porosity', 'Inclusion', 'Lack of Fusion', 'Undercut', 'Overlap',
  'Burn Through', 'Root Concavity', 'Incomplete Penetration', 'Corrosion',
  'Pitting', 'General Thinning', 'Lamination', 'Delamination'
];

export function NDETestLocations({ results, onResultsChange }: NDETestLocationsProps) {
  const [newResult, setNewResult] = useState({
    testType: '',
    location: '',
    component: '',
    gridReference: '',
    testMethod: '',
    acceptance: '',
    testDate: '',
    technician: '',
    equipment: '',
    findings: ''
  });

  const addNDEResult = () => {
    if (!newResult.testType || !newResult.location || !newResult.component) return;

    const result: NDEResult = {
      id: Date.now(),
      testType: newResult.testType as any,
      location: newResult.location,
      component: newResult.component,
      gridReference: newResult.gridReference,
      testMethod: newResult.testMethod,
      acceptance: newResult.acceptance as any,
      repairRequired: newResult.acceptance === 'fail',
      testDate: newResult.testDate,
      technician: newResult.technician,
      equipment: newResult.equipment,
      findings: newResult.findings
    };

    onResultsChange([...results, result]);
    setNewResult({
      testType: '',
      location: '',
      component: '',
      gridReference: '',
      testMethod: '',
      acceptance: '',
      testDate: '',
      technician: '',
      equipment: '',
      findings: ''
    });
  };

  const updateResult = (id: number, updates: Partial<NDEResult>) => {
    const updatedResults = results.map(result =>
      result.id === id ? { ...result, ...updates } : result
    );
    onResultsChange(updatedResults);
  };

  const removeResult = (id: number) => {
    onResultsChange(results.filter(result => result.id !== id));
  };

  const getAcceptanceColor = (acceptance: string) => {
    switch (acceptance) {
      case 'pass': return 'default';
      case 'conditional': return 'secondary';
      case 'fail': return 'destructive';
      default: return 'outline';
    }
  };

  const failedTests = results.filter(r => r.acceptance === 'fail');
  const conditionalTests = results.filter(r => r.acceptance === 'conditional');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          NDE Test Locations & Results
        </CardTitle>
        <p className="text-sm text-gray-600">
          Non-Destructive Examination test locations, methods, and detailed results
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.length}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results.filter(r => r.acceptance === 'pass').length}
              </div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{conditionalTests.length}</div>
              <div className="text-sm text-gray-600">Conditional</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedTests.length}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        )}

        {/* Add New NDE Result */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Add NDE Test Result</h4>
          
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="testType">Test Type</Label>
              <Select value={newResult.testType} onValueChange={(value) => setNewResult(prev => ({ ...prev, testType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select NDE method" />
                </SelectTrigger>
                <SelectContent>
                  {NDE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="component">Component</Label>
              <Input
                placeholder="Shell Course 1, Bottom Plate, Nozzle A"
                value={newResult.component}
                onChange={(e) => setNewResult(prev => ({ ...prev, component: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                placeholder="Vertical weld V-1, HAZ, Center bottom"
                value={newResult.location}
                onChange={(e) => setNewResult(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          {/* Test Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="gridReference">Grid Reference</Label>
              <Input
                placeholder="A-1, B-3, etc."
                value={newResult.gridReference}
                onChange={(e) => setNewResult(prev => ({ ...prev, gridReference: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="testMethod">Test Method/Standard</Label>
              <Input
                placeholder="ASME V, ASTM E164, etc."
                value={newResult.testMethod}
                onChange={(e) => setNewResult(prev => ({ ...prev, testMethod: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="acceptance">Acceptance</Label>
              <Select value={newResult.acceptance} onValueChange={(value) => setNewResult(prev => ({ ...prev, acceptance: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Test result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="testDate">Test Date</Label>
              <Input
                type="date"
                value={newResult.testDate}
                onChange={(e) => setNewResult(prev => ({ ...prev, testDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Personnel and Equipment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="technician">Technician/Level</Label>
              <Input
                placeholder="J. Smith - Level II UT"
                value={newResult.technician}
                onChange={(e) => setNewResult(prev => ({ ...prev, technician: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="equipment">Equipment/Model</Label>
              <Input
                placeholder="Krautkramer USM 35X, 2.25MHz"
                value={newResult.equipment}
                onChange={(e) => setNewResult(prev => ({ ...prev, equipment: e.target.value }))}
              />
            </div>
          </div>

          {/* Findings */}
          <div className="mb-4">
            <Label htmlFor="findings">Findings/Results</Label>
            <textarea
              id="findings"
              className="w-full p-2 border rounded mt-1"
              rows={3}
              placeholder="Detailed findings, discontinuity descriptions, measurements, etc."
              value={newResult.findings}
              onChange={(e) => setNewResult(prev => ({ ...prev, findings: e.target.value }))}
            />
          </div>

          <Button type="button" onClick={addNDEResult}>
            <Plus className="w-4 h-4 mr-2" />
            Add NDE Result
          </Button>
        </div>

        {/* NDE Results Table */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">NDE Test Results ({results.length})</h4>
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Test Type:</span>
                        <div className="font-medium">{result.testType}</div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Component:</span>
                        <div>{result.component}</div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Location:</span>
                        <div>{result.location}</div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Acceptance:</span>
                        <Badge variant={getAcceptanceColor(result.acceptance)}>
                          {result.acceptance.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeResult(result.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Grid Ref:</span> {result.gridReference || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Method:</span> {result.testMethod}
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Date:</span> {result.testDate}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Technician:</span> {result.technician}
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Equipment:</span> {result.equipment}
                    </div>
                  </div>

                  {result.findings && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Findings:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded text-sm">{result.findings}</div>
                    </div>
                  )}

                  {/* Discontinuity Details for Failed Tests */}
                  {result.acceptance === 'fail' && (
                    <div className="border-t pt-3 mt-3">
                      <h6 className="font-medium text-red-800 mb-2">Discontinuity Details</h6>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`disc-type-${result.id}`}>Type</Label>
                          <Select 
                            value={result.discontinuityType || ''} 
                            onValueChange={(value) => updateResult(result.id, { discontinuityType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {DISCONTINUITY_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`disc-size-${result.id}`}>Size/Length</Label>
                          <Input
                            placeholder="2.5 in, 15mm, etc."
                            value={result.discontinuitySize || ''}
                            onChange={(e) => updateResult(result.id, { discontinuitySize: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`disc-depth-${result.id}`}>Depth (in)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.050"
                            value={result.discontinuityDepth || ''}
                            onChange={(e) => updateResult(result.id, { discontinuityDepth: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Tests Summary */}
        {failedTests.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="font-medium text-red-800 mb-2">Failed NDE Tests Requiring Attention</h5>
            <div className="space-y-2">
              {failedTests.map(test => (
                <div key={test.id} className="text-sm text-red-700">
                  <strong>{test.testType}</strong> at {test.component} - {test.location}
                  {test.discontinuityType && (
                    <span className="ml-2">({test.discontinuityType})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NDE Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-2">API 653 NDE Requirements</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Document all NDE test locations with grid references or sketches</p>
            <p>• Record technician certification levels and equipment calibration dates</p>
            <p>• Maintain detailed records of discontinuities including type, size, and depth</p>
            <p>• Follow acceptance criteria per applicable codes (API 653, ASME V, etc.)</p>
            <p>• Include photographic documentation of significant findings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}