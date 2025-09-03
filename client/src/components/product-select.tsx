import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ProductSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

const PRODUCTS = [
  'Crude Oil',
  'Diesel',
  'Gasoline',
  'Jet Fuel',
  'Fuel Oil',
  'Asphalt',
  'Ethanol',
  'Biodiesel',
  'Solubles',
  'Fish Oil',
  'Water',
  'Chemical',
  'Waste',
  'Other'
];

export function ProductSelect({ value, onChange, label = 'Product', error }: ProductSelectProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customProduct, setCustomProduct] = useState('');

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'Other') {
      setShowCustomInput(true);
      setCustomProduct('');
    } else {
      setShowCustomInput(false);
      onChange(selectedValue);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const customValue = e.target.value;
    setCustomProduct(customValue);
    onChange(customValue || 'Other');
  };

  return (
    <div>
      <Label htmlFor="product">{label}</Label>
      {!showCustomInput ? (
        <Select value={value || undefined} onValueChange={handleSelectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Product" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCTS.map(product => (
              <SelectItem key={product} value={product}>
                {product === 'Other' ? 'Other (Custom)' : product}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-2">
          <Input
            id="product"
            value={customProduct}
            onChange={handleCustomInputChange}
            placeholder="Enter custom product name"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              onChange(value || 'Other');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to selection
          </button>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}