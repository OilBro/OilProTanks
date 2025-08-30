import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calculator, Upload, Download, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SettlementSurveyProps {
  reportId: number;
}

interface SettlementMeasurement {
  pointNumber: number;
  angle: number;
  measuredElevation: number;
  normalizedElevation?: number;
  cosineFitElevation?: number;
  outOfPlane?: number;
  tieShot?: boolean;
  tieOffset?: number;
}

interface SettlementSurvey {
  id: number;
  surveyType: string;
  surveyDate: string;
  numberOfPoints: number;
  tankDiameter?: string;
  tankHeight?: string;
  shellYieldStrength?: string;
  elasticModulus?: string;
  cosineAmplitude?: string;
  cosinePhase?: string;
  rSquared?: string;
  maxOutOfPlane?: string;
  allowableSettlement?: string;
  settlementAcceptance?: string;
  annexReference?: string;
}

export function SettlementSurvey({ reportId }: SettlementSurveyProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('data-entry');
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [measurements, setMeasurements] = useState<SettlementMeasurement[]>([]);
  const [tankParams, setTankParams] = useState({
    diameter: '',
    height: '',
    yieldStrength: '20000',
    elasticModulus: '29000000'
  });

  // Check if reportId is valid
  const isValidReportId = reportId && !isNaN(reportId) && reportId > 0;
  
  // Early return if reportId is invalid
  if (!isValidReportId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Settlement Analysis Not Available</AlertTitle>
        <AlertDescription>
          Settlement surveys can only be created for saved reports. Please save the report first, then edit it to access settlement analysis.
        </AlertDescription>
      </Alert>
    );
  }

  // Fetch existing surveys
  const { data: surveys = [], isLoading: surveysLoading } = useQuery<SettlementSurvey[]>({
    queryKey: [`/api/reports/${reportId}/settlement-surveys`],
    enabled: isValidReportId
  });

  // Fetch measurements for selected survey
  const { data: surveyMeasurements = [] } = useQuery<SettlementMeasurement[]>({
    queryKey: [`/api/settlement-surveys/${selectedSurveyId}/measurements`],
    enabled: !!selectedSurveyId
  });

  // Load measurements when survey is selected or data changes
  useEffect(() => {
    if (surveyMeasurements && Array.isArray(surveyMeasurements) && surveyMeasurements.length > 0) {
      setMeasurements(surveyMeasurements);
    } else if (selectedSurveyId && measurements.length === 0) {
      // Initialize measurements if none exist
      initializeMeasurements(8);
    }
  }, [selectedSurveyId, surveyMeasurements]);

  // Create new survey mutation
  const createSurveyMutation = useMutation<any, Error, any>({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/reports/${reportId}/settlement-surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create survey');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/settlement-surveys`] });
      toast({ title: 'Success', description: 'Settlement survey created successfully' });
      // Set the newly created survey as selected and initialize measurements
      if (result && result.id) {
        setSelectedSurveyId(result.id);
        initializeMeasurements(8);
      }
    }
  });

  // Save measurements mutation
  const saveMeasurementsMutation = useMutation<any, Error, { surveyId: number; measurements: SettlementMeasurement[] }>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/settlement-surveys/${data.surveyId}/measurements/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements: data.measurements })
      });
      if (!response.ok) throw new Error('Failed to save measurements');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/settlement-surveys/${selectedSurveyId}/measurements`] });
      toast({ title: 'Success', description: 'Measurements saved successfully' });
    }
  });

  // Calculate settlement analysis mutation
  const calculateSettlementMutation = useMutation<any, Error, { surveyId: number; tankParams: any; tiePoints?: any[] }>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/settlement-surveys/${data.surveyId}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to calculate settlement');
      return response.json();
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/settlement-surveys`] });
      if (results && results.settlementAcceptance) {
        toast({ 
          title: 'Calculation Complete', 
          description: `Settlement status: ${results.settlementAcceptance}`
        });
      }
      setActiveTab('results');
    }
  });

  // Initialize measurement points
  const initializeMeasurements = (numPoints: number) => {
    const newMeasurements: SettlementMeasurement[] = [];
    const angleIncrement = 360 / numPoints;
    
    for (let i = 0; i < numPoints; i++) {
      newMeasurements.push({
        pointNumber: i + 1,
        angle: i * angleIncrement,
        measuredElevation: 0
      });
    }
    
    setMeasurements(newMeasurements);
  };

  // Create new survey
  const handleCreateSurvey = async () => {
    if (!isValidReportId) {
      toast({ 
        title: 'Error', 
        description: 'Cannot create survey: Report must be saved first',
        variant: 'destructive'
      });
      return;
    }

    try {
      const newSurvey = {
        surveyType: 'external_ringwall',
        surveyDate: new Date().toISOString().split('T')[0],
        numberOfPoints: 8,
        tankDiameter: null,
        tankHeight: null,
        shellYieldStrength: 20000,
        elasticModulus: 29000000
      };
      
      console.log('Creating new survey with data:', newSurvey);
      const result = await createSurveyMutation.mutateAsync(newSurvey);
      console.log('Survey created successfully:', result);
      
      // Initialize measurements immediately after creation
      if (result && result.id) {
        setSelectedSurveyId(result.id);
        initializeMeasurements(8);
        toast({ 
          title: 'Success', 
          description: 'Settlement survey created successfully'
        });
      }
    } catch (error) {
      console.error('Error creating survey - Full details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        title: 'Error', 
        description: `Failed to create survey: ${errorMessage}`,
        variant: 'destructive'
      });
    }
  };

  // Update measurement value
  const updateMeasurement = (index: number, field: keyof SettlementMeasurement, value: any) => {
    const updated = [...measurements];
    updated[index] = { ...updated[index], [field]: value };
    setMeasurements(updated);
  };

  // Calculate settlement analysis
  const handleCalculate = async () => {
    if (!selectedSurveyId || !tankParams.diameter || !tankParams.height) {
      toast({ 
        title: 'Error', 
        description: 'Please fill in all tank parameters',
        variant: 'destructive'
      });
      return;
    }

    // Save measurements first
    await saveMeasurementsMutation.mutateAsync({
      surveyId: selectedSurveyId,
      measurements
    });

    // Then calculate
    await calculateSettlementMutation.mutateAsync({
      surveyId: selectedSurveyId,
      tankParams: {
        diameter: parseFloat(tankParams.diameter),
        height: parseFloat(tankParams.height),
        yieldStrength: parseFloat(tankParams.yieldStrength),
        elasticModulus: parseFloat(tankParams.elasticModulus)
      }
    });
  };

  const selectedSurvey = surveys.find((s: SettlementSurvey) => s.id === selectedSurveyId);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Settlement Analysis (API 653 Annex B)
        </CardTitle>
        <CardDescription>
          Perform cosine fit analysis for tank settlement per API 653 Annex B standards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="data-entry">Data Entry</TabsTrigger>
            <TabsTrigger value="results">Analysis Results</TabsTrigger>
            <TabsTrigger value="history">Survey History</TabsTrigger>
          </TabsList>

          <TabsContent value="data-entry" className="space-y-4">
            {/* Survey Selection/Creation */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Settlement Survey</Label>
                <Select 
                  value={selectedSurveyId?.toString()} 
                  onValueChange={(v) => {
                    const surveyId = parseInt(v);
                    setSelectedSurveyId(surveyId);
                    // Initialize measurements when selecting a survey
                    if (!surveyMeasurements || surveyMeasurements.length === 0) {
                      initializeMeasurements(8);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or create a survey" />
                  </SelectTrigger>
                  <SelectContent>
                    {surveys.map((survey: SettlementSurvey) => (
                      <SelectItem key={survey.id} value={survey.id.toString()}>
                        {survey.surveyType} - {survey.surveyDate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateSurvey} variant="outline">
                New Survey
              </Button>
            </div>

            {selectedSurveyId && (
              <>
                {/* Tank Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tank Diameter (ft)</Label>
                    <Input
                      type="number"
                      value={tankParams.diameter}
                      onChange={(e) => setTankParams({ ...tankParams, diameter: e.target.value })}
                      placeholder="55.5"
                    />
                  </div>
                  <div>
                    <Label>Tank Height (ft)</Label>
                    <Input
                      type="number"
                      value={tankParams.height}
                      onChange={(e) => setTankParams({ ...tankParams, height: e.target.value })}
                      placeholder="32"
                    />
                  </div>
                  <div>
                    <Label>Shell Yield Strength (psi)</Label>
                    <Input
                      type="number"
                      value={tankParams.yieldStrength}
                      onChange={(e) => setTankParams({ ...tankParams, yieldStrength: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Elastic Modulus (psi)</Label>
                    <Input
                      type="number"
                      value={tankParams.elasticModulus}
                      onChange={(e) => setTankParams({ ...tankParams, elasticModulus: e.target.value })}
                    />
                  </div>
                </div>

                {/* Measurement Points */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Elevation Measurements (inches)</Label>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => initializeMeasurements(8)}
                    >
                      Reset to 8 Points
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Point</TableHead>
                          <TableHead className="w-32">Angle (°)</TableHead>
                          <TableHead>Elevation (in)</TableHead>
                          <TableHead className="w-32">Tie Shot</TableHead>
                          <TableHead className="w-32">Tie Offset</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {measurements.map((m, i) => (
                          <TableRow key={i}>
                            <TableCell>{m.pointNumber}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={m.angle}
                                onChange={(e) => updateMeasurement(i, 'angle', parseFloat(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.0001"
                                value={m.measuredElevation}
                                onChange={(e) => updateMeasurement(i, 'measuredElevation', parseFloat(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={m.tieShot || false}
                                onChange={(e) => updateMeasurement(i, 'tieShot', e.target.checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.0001"
                                value={m.tieOffset || ''}
                                onChange={(e) => updateMeasurement(i, 'tieOffset', parseFloat(e.target.value))}
                                disabled={!m.tieShot}
                                className="h-8"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleCalculate} className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Calculate Cosine Fit
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {selectedSurvey && selectedSurvey.rSquared && (
              <>
                {/* Settlement Status Alert */}
                <Alert className={
                  selectedSurvey.settlementAcceptance === 'ACCEPTABLE' ? 'border-green-500' :
                  selectedSurvey.settlementAcceptance === 'MONITOR' ? 'border-yellow-500' :
                  'border-red-500'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Settlement Status: {selectedSurvey.settlementAcceptance}</AlertTitle>
                  <AlertDescription>
                    {selectedSurvey.annexReference}
                  </AlertDescription>
                </Alert>

                {/* Analysis Results */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Cosine Fit Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">R² Value:</span>
                        <Badge variant={parseFloat(selectedSurvey.rSquared) >= 0.9 ? 'default' : 'destructive'}>
                          {parseFloat(selectedSurvey.rSquared).toFixed(4)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Amplitude (A):</span>
                        <span className="font-medium">{parseFloat(selectedSurvey.cosineAmplitude || '0').toFixed(3)} in</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Phase (B):</span>
                        <span className="font-medium">{(parseFloat(selectedSurvey.cosinePhase || '0') * 180 / Math.PI).toFixed(1)}°</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Settlement Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max Out-of-Plane:</span>
                        <span className="font-medium">{parseFloat(selectedSurvey.maxOutOfPlane || '0').toFixed(3)} in</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Allowable:</span>
                        <span className="font-medium">{parseFloat(selectedSurvey.allowableSettlement || '0').toFixed(3)} in</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Ratio:</span>
                        <Badge variant={
                          parseFloat(selectedSurvey.maxOutOfPlane || '0') / parseFloat(selectedSurvey.allowableSettlement || '1') <= 1 
                            ? 'default' : 'destructive'
                        }>
                          {(parseFloat(selectedSurvey.maxOutOfPlane || '0') / parseFloat(selectedSurvey.allowableSettlement || '1')).toFixed(2)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tank Parameters Used */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Tank Parameters Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Diameter:</span>
                        <p className="font-medium">{selectedSurvey.tankDiameter} ft</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Height:</span>
                        <p className="font-medium">{selectedSurvey.tankHeight} ft</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Yield Strength:</span>
                        <p className="font-medium">{selectedSurvey.shellYieldStrength} psi</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Elastic Modulus:</span>
                        <p className="font-medium">{selectedSurvey.elasticModulus} psi</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Export Options */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV Data
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View Settlement Plot
                  </Button>
                </div>
              </>
            )}

            {(!selectedSurvey || !selectedSurvey.rSquared) && (
              <Alert>
                <AlertDescription>
                  No analysis results available. Please enter measurement data and calculate.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>R²</TableHead>
                  <TableHead>Max Settlement</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey: SettlementSurvey) => (
                  <TableRow key={survey.id}>
                    <TableCell>{survey.surveyDate}</TableCell>
                    <TableCell>{survey.surveyType}</TableCell>
                    <TableCell>{survey.numberOfPoints}</TableCell>
                    <TableCell>{survey.rSquared ? parseFloat(survey.rSquared).toFixed(4) : '-'}</TableCell>
                    <TableCell>
                      {survey.maxOutOfPlane ? `${parseFloat(survey.maxOutOfPlane).toFixed(3)} in` : '-'}
                    </TableCell>
                    <TableCell>
                      {survey.settlementAcceptance && (
                        <Badge variant={
                          survey.settlementAcceptance === 'ACCEPTABLE' ? 'default' :
                          survey.settlementAcceptance === 'MONITOR' ? 'secondary' :
                          'destructive'
                        }>
                          {survey.settlementAcceptance}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}