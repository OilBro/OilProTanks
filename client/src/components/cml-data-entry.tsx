import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Upload, Download, Edit, Copy } from "lucide-react";

interface CMLReading {
  point: number;
  reading: number;
  notes?: string;
}

export interface CMLRecord {
  id: number;
  cmlId: string;
  component: string;
  location: string;
  currentReading: number;
  previousReading?: number;
  practicalTmin: number;
  corrosionRate: number; // mpy
  remainingLife: number; // years
  nextInspDate: string;
  status: 'acceptable' | 'monitor' | 'action_required' | 'critical';
}

interface CMLDataEntryProps {
  records: CMLRecord[];
  onRecordsChange: (records: CMLRecord[]) => void;
  componentType: 'shell' | 'nozzle' | 'floor';
}

export function CMLDataEntry({ records, onRecordsChange, componentType }: CMLDataEntryProps) {
  const [quickAddComponent, setQuickAddComponent] = useState('Shell Course 1');
  const [quickAddLocation, setQuickAddLocation] = useState('');
  const [autoCMLId, setAutoCMLId] = useState(`CML-${String(records.length + 1).padStart(3, '0')}`);
  const [newRecord, setNewRecord] = useState({
    component: "",
    location: "",
    currentReading: "",
    previousReading: "",
    practicalTmin: "0.100",
  });
  
  const [editingCML, setEditingCML] = useState<number | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);

  // Component options for quick add
  const COMPONENT_OPTIONS = [
    'Shell Course 1',
    'Shell Course 2',
    'Shell Course 3',
    'Shell Course 4',
    'Shell Course 5',
    'Shell Course 6',
    'Bottom Plate',
    'Annular Ring',
    'Roof',
    'Nozzle N1',
    'Nozzle N2',
    'Manway',
  ];

  const addRecord = () => {
    const component = quickAddComponent;
    const location = quickAddLocation || 'TBD';
    const currentReading = parseFloat(newRecord.currentReading) || 0;
    const previousReading = parseFloat(newRecord.previousReading) || currentReading;
    const practicalTmin = parseFloat(newRecord.practicalTmin) || 0.100;
    
    // Calculate corrosion rate and remaining life
    const yearsSinceLastInspection = 5; // Default assumption
    const corrosionRate = previousReading > 0 ? 
      ((previousReading - currentReading) / yearsSinceLastInspection) * 1000 : 0; // Convert to mpy
    
    const remainingLife = corrosionRate > 0 ? 
      ((currentReading - practicalTmin) * 1000) / corrosionRate : 999;
    
    // Calculate next inspection date
    const nextInspYears = Math.min(remainingLife / 2, 10); // Half remaining life or 10 years max
    const nextDate = new Date();
    nextDate.setFullYear(nextDate.getFullYear() + Math.floor(nextInspYears));
    
    // Determine status
    let status: CMLRecord['status'] = 'acceptable';
    if (remainingLife < 2) status = 'critical';
    else if (remainingLife < 5) status = 'action_required';
    else if (remainingLife < 10) status = 'monitor';

    const record: CMLRecord = {
      id: Date.now(),
      cmlId: autoCMLId,
      component,
      location,
      currentReading,
      previousReading,
      practicalTmin,
      corrosionRate,
      remainingLife,
      nextInspDate: nextDate.toISOString().split('T')[0],
      status
    };

    onRecordsChange([...records, record]);
    
    // Reset and update auto CML ID
    setQuickAddLocation('');
    setAutoCMLId(`CML-${String(records.length + 2).padStart(3, '0')}`);
    setNewRecord({ 
      component: "", 
      location: "", 
      currentReading: "", 
      previousReading: "",
      practicalTmin: "0.100" 
    });
  };

  const duplicateRecord = () => {
    if (selectedRecords.length === 0) return;

    const recordsToDuplicate = records.filter(r => selectedRecords.includes(r.id));
    const duplicatedRecords = recordsToDuplicate.map(record => ({
      ...record,
      id: Date.now() + Math.random(),
      cmlId: `CML-${String(records.length + recordsToDuplicate.indexOf(record) + 1).padStart(3, '0')}`,
      currentReading: 0, // Reset readings for new duplicate
      previousReading: undefined
    }));

    onRecordsChange([...records, ...duplicatedRecords]);
    setSelectedRecords([]);
  };

  const updateCMLRecord = (cmlId: number, updates: Partial<CMLRecord>) => {
    const updatedRecords = records.map(record => {
      if (record.id === cmlId) {
        const updated = { ...record, ...updates };
        
        // Recalculate if readings changed
        if (updates.currentReading !== undefined || updates.previousReading !== undefined) {
          const yearsSinceLastInspection = 5;
          const corrosionRate = updated.previousReading && updated.previousReading > 0 ? 
            ((updated.previousReading - updated.currentReading) / yearsSinceLastInspection) * 1000 : 0;
          
          const remainingLife = corrosionRate > 0 ? 
            ((updated.currentReading - updated.practicalTmin) * 1000) / corrosionRate : 999;
          
          let status: CMLRecord['status'] = 'acceptable';
          if (remainingLife < 2) status = 'critical';
          else if (remainingLife < 5) status = 'action_required';
          else if (remainingLife < 10) status = 'monitor';
          
          updated.corrosionRate = corrosionRate;
          updated.remainingLife = remainingLife;
          updated.status = status;
        }
        
        return updated;
      }
      return record;
    });
    onRecordsChange(updatedRecords);
  };

  const exportCMLData = () => {
    const csvData = records.map(record => ({
      'CML ID': record.cmlId,
      Component: record.component,
      Location: record.location,
      'Current Reading': record.currentReading,
      'Previous Reading': record.previousReading || '',
      'Practical T-min': record.practicalTmin,
      'Corrosion Rate (mpy)': record.corrosionRate.toFixed(1),
      'Remaining Life (yrs)': record.remainingLife.toFixed(1),
      'Next Inspection': record.nextInspDate,
      Status: record.status
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentType}_CML_data.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'action_required': return 'destructive';
      case 'monitor': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CML Data Entry - {componentType.charAt(0).toUpperCase() + componentType.slice(1)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCMLData}>
              <Download className="w-4 h-4 mr-2" />
              Export CML's
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import CML's
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Component Corrosion Monitoring Locations with thickness tracking and remaining life analysis
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Add CML */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h4 className="font-semibold mb-3 text-blue-900">Quick Add CML</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="component" className="text-sm">Component:</Label>
              <Select value={quickAddComponent} onValueChange={setQuickAddComponent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location" className="text-sm">Location:</Label>
              <Input
                placeholder="e.g., North side, 90°"
                value={quickAddLocation}
                onChange={(e) => setQuickAddLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="autoCMLId" className="text-sm">Auto CML ID:</Label>
              <Input
                value={autoCMLId}
                onChange={(e) => setAutoCMLId(e.target.value)}
                className="font-mono bg-white"
              />
            </div>
          </div>
          <Button 
            type="button" 
            onClick={addRecord} 
            className="mt-3"
            disabled={!quickAddComponent}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add CML Location
          </Button>
        </div>

        {/* CML Data Entry Form */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-4">CML Measurement Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="currentReading" className="text-sm">Current Reading (in)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.245"
                value={newRecord.currentReading}
                onChange={(e) => setNewRecord(prev => ({ ...prev, currentReading: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="previousReading" className="text-sm">Previous Reading (in)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.250"
                value={newRecord.previousReading}
                onChange={(e) => setNewRecord(prev => ({ ...prev, previousReading: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="practicalTmin" className="text-sm">Practical t-min (in)</Label>
              <Input
                type="number"
                step="0.001"
                value={newRecord.practicalTmin}
                onChange={(e) => setNewRecord(prev => ({ ...prev, practicalTmin: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* CML Records Table */}
        {records.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">CML Records ({records.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left border-b">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecords(records.map(r => r.id));
                          } else {
                            setSelectedRecords([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-2 text-left border-b">CML</th>
                    <th className="p-2 text-left border-b">Component</th>
                    <th className="p-2 text-left border-b">Location</th>
                    <th className="p-2 text-left border-b">Current (in)</th>
                    <th className="p-2 text-left border-b">Previous (in)</th>
                    <th className="p-2 text-left border-b">T-min (in)</th>
                    <th className="p-2 text-left border-b">CR (mpy)</th>
                    <th className="p-2 text-left border-b">RL (yrs)</th>
                    <th className="p-2 text-left border-b">Next Insp</th>
                    <th className="p-2 text-left border-b">Status</th>
                    <th className="p-2 text-left border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecords([...selectedRecords, record.id]);
                            } else {
                              setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-2 font-mono text-sm">{record.cmlId}</td>
                      <td className="p-2">{record.component}</td>
                      <td className="p-2">{record.location}</td>
                      <td className="p-2">{record.currentReading.toFixed(3)}</td>
                      <td className="p-2">
                        {record.previousReading ? record.previousReading.toFixed(3) : '-'}
                      </td>
                      <td className="p-2">{record.practicalTmin.toFixed(3)}</td>
                      <td className="p-2">{record.corrosionRate.toFixed(1)}</td>
                      <td className="p-2">
                        {record.remainingLife > 100 ? '> 100' : record.remainingLife.toFixed(1)}
                      </td>
                      <td className="p-2 text-sm">{record.nextInspDate}
                      </td>
                      <td className="p-2">
                        <Badge variant={getStatusColor(record.status)}>
                          {record.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCML(record.id)}
                          >
                            CML Data
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onRecordsChange(records.filter(r => r.id !== record.id));
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CML Summary Statistics */}
        {records.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">CML Summary Statistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total CML Locations:</span>
                <span className="ml-2 font-semibold">{records.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Critical Locations:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {records.filter(r => r.status === 'critical').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Warning Locations:</span>
                <span className="ml-2 font-semibold text-orange-600">
                  {records.filter(r => r.status === 'action_required' || r.status === 'monitor').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Min Remaining Life:</span>
                <span className="ml-2 font-semibold">
                  {records.length > 0 ? Math.min(...records.map(r => r.remainingLife)).toFixed(1) : 0} years
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick edit modal for updating CML readings
interface CMLEditModalProps {
  record: CMLRecord;
  onSave: (updates: Partial<CMLRecord>) => void;
  onClose: () => void;
}

function CMLEditModal({ record, onSave, onClose }: CMLEditModalProps) {
  const [currentReading, setCurrentReading] = useState(record.currentReading.toString());
  const [previousReading, setPreviousReading] = useState(record.previousReading?.toString() || '');
  const [practicalTmin, setPracticalTmin] = useState(record.practicalTmin.toString());

  const handleSave = () => {
    onSave({
      currentReading: parseFloat(currentReading) || record.currentReading,
      previousReading: previousReading ? parseFloat(previousReading) : undefined,
      practicalTmin: parseFloat(practicalTmin) || record.practicalTmin
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Edit CML: {record.cmlId}
          </h3>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm">
            <strong>Component:</strong> {record.component}<br />
            <strong>Location:</strong> {record.location}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="currentReading">Current Reading (in)</Label>
            <Input
              id="currentReading"
              type="number"
              step="0.001"
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="previousReading">Previous Reading (in)</Label>
            <Input
              id="previousReading"
              type="number"
              step="0.001"
              value={previousReading}
              onChange={(e) => setPreviousReading(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="practicalTmin">Practical T-min (in)</Label>
            <Input
              id="practicalTmin"
              type="number"
              step="0.001"
              value={practicalTmin}
              onChange={(e) => setPracticalTmin(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}