'use client';

import { useState } from 'react';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from './button';
import { Badge } from '@/components/ui/badge';

interface ColorOption {
  id: string;
  name: string;
  inStock: boolean;
  stockQuantity: number;
}

interface SizeOption {
  id: string;
  name: string;
  inStock: boolean;
  stockQuantity: number;
  priceModifier: number;
}

interface VariantRow {
  id: string;
  color: string;
  size: string;
  quantity: number;
}

interface MultiVariantSelectorProps {
  colors: ColorOption[];
  sizes: SizeOption[];
  onAddToCart: (variants: VariantRow[]) => void;
  minOrderQuantity?: number;
}

export default function MultiVariantSelector({
  colors,
  sizes,
  onAddToCart,
  minOrderQuantity = 1
}: MultiVariantSelectorProps) {
  const [rows, setRows] = useState<VariantRow[]>([
    { id: '1', color: '', size: '', quantity: minOrderQuantity }
  ]);
  const [showMultiSelect, setShowMultiSelect] = useState(false);

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([...rows, { id: newId, color: '', size: '', quantity: minOrderQuantity }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof VariantRow, value: string | number) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleAddToCart = () => {
    // Filter valid rows (must have color and size)
    const validRows = rows.filter(row => row.color && row.size && row.quantity > 0);
    if (validRows.length > 0) {
      onAddToCart(validRows);
    }
  };

  const isRowValid = (row: VariantRow) => {
    return row.color !== '' && row.size !== '' && row.quantity >= minOrderQuantity;
  };

  const allRowsValid = rows.every(isRowValid);
  const totalQuantity = rows.reduce((sum, row) => sum + (isRowValid(row) ? row.quantity : 0), 0);

  if (!showMultiSelect) {
    return (
      <div className="space-y-3">
        <Button
          onClick={() => setShowMultiSelect(true)}
          variant="outline"
          className="w-full border-2 border-dashed border-gray-300 hover:border-[#173a6a] hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Order Multiple Colors/Sizes at Once
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Order Multiple Variants</h3>
        <button
          onClick={() => setShowMultiSelect(false)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Switch to Single Select
        </button>
      </div>

      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-gray-700 px-2">
          <div className="col-span-4">Color</div>
          <div className="col-span-3">Size</div>
          <div className="col-span-3">Quantity</div>
          <div className="col-span-2">Action</div>
        </div>

        {/* Data Rows */}
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg shadow-sm">
            {/* Color Select */}
            <div className="col-span-4">
              <select
                value={row.color}
                onChange={(e) => updateRow(row.id, 'color', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#173a6a] focus:border-transparent text-sm"
              >
                <option value="">Select Color</option>
                {colors.map(color => (
                  <option 
                    key={color.id} 
                    value={color.name}
                    disabled={!color.inStock}
                  >
                    {color.name} {!color.inStock && '(Out of Stock)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Select */}
            <div className="col-span-3">
              <select
                value={row.size}
                onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#173a6a] focus:border-transparent text-sm"
              >
                <option value="">Select Size</option>
                {sizes.map(size => (
                  <option 
                    key={size.id} 
                    value={size.name}
                    disabled={!size.inStock}
                  >
                    {size.name} {size.priceModifier > 0 && `(+$${size.priceModifier})`} {!size.inStock && '(Out)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div className="col-span-3">
              <input
                type="number"
                min={minOrderQuantity}
                value={row.quantity}
                onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || minOrderQuantity)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#173a6a] focus:border-transparent text-sm text-center"
              />
            </div>

            {/* Actions */}
            <div className="col-span-2 flex gap-1">
              {index === rows.length - 1 && (
                <Button
                  onClick={addRow}
                  size="sm"
                  variant="outline"
                  className="p-2"
                  title="Add Row"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {rows.length > 1 && (
                <Button
                  onClick={() => removeRow(row.id)}
                  size="sm"
                  variant="destructive"
                  className="p-2"
                  title="Delete Row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary & Add to Cart */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-700">
            Total Items: <Badge variant="secondary">{totalQuantity}</Badge>
          </span>
          <span className="text-gray-700">
            Valid Rows: <Badge variant={allRowsValid ? 'default' : 'secondary'}>
              {rows.filter(isRowValid).length} / {rows.length}
            </Badge>
          </span>
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={!allRowsValid || totalQuantity === 0}
          className="w-full bg-[#173a6a] hover:bg-[#1e4a7a] text-white py-3"
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Add All to Cart ({totalQuantity} items)
        </Button>
      </div>

      <p className="text-xs text-gray-600 text-center">
        ℹ️ You can order multiple colors and sizes in a single checkout
      </p>
    </div>
  );
}