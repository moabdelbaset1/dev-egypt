'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Ruler, X } from 'lucide-react';
import Image from 'next/image';

interface SizeChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sizeChartImage?: string;
  productName?: string;
}

export default function SizeChartModal({
  open,
  onOpenChange,
  sizeChartImage,
  productName = 'Product'
}: SizeChartModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Ruler className="h-5 w-5" />
            Size Chart - {productName}
          </DialogTitle>
          <DialogDescription>
            Refer to this size guide to find your perfect fit
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {sizeChartImage ? (
            <div className="relative w-full bg-white rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={sizeChartImage}
                alt={`Size chart for ${productName}`}
                width={800}
                height={600}
                className="w-full h-auto"
                style={{ objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Ruler className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No size chart available for this product</p>
              <p className="text-sm text-gray-500">Please contact customer service for sizing information</p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📏 Sizing Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Measure yourself in inches or centimeters</li>
            <li>• Compare your measurements with the size chart</li>
            <li>• If between sizes, we recommend ordering the larger size</li>
            <li>• Contact us if you need help choosing the right size</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}