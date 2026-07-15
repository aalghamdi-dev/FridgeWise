import React, { useEffect, useState, useRef, ChangeEvent } from "react";
import { BarcodeDetector } from "barcode-detector/ponyfill";
import { X, Camera, AlertTriangle, Play, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

import { BarcodeMapping } from "../types";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  savedBarcodes: BarcodeMapping[];
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  savedBarcodes
}: BarcodeScannerModalProps) {
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScanError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const processImageFile = async (file: File) => {
    setScanError(null);
    setIsProcessing(true);

    try {
      // Use the BarcodeDetector ponyfill (ZXing WASM / Google ML Kit polyfill engine)
      const barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar']
      });
      
      // Create an ImageBitmap from the file for the detector
      const bitmap = await createImageBitmap(file);
      const barcodes = await barcodeDetector.detect(bitmap);
      
      if (barcodes && barcodes.length > 0) {
        onScanSuccess(barcodes[0].rawValue);
        setIsProcessing(false);
        onClose();
        return;
      } else {
        throw new Error("No barcode detected");
      }
    } catch (err: any) {
      console.error("File scan error:", err);
      setScanError("Could not detect any barcode in the image. Please try a clearer picture with better lighting.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden bg-[#0F0F11] rounded-2xl shadow-2xl border border-neutral-850 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-850">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Scan Barcode
            </h3>
            <p className="text-xs text-neutral-500">
              Take a picture or upload an image to extract the barcode.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-white rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Action Area */}
          <div className="flex flex-col items-center justify-center bg-[#0A0A0B] rounded-xl border border-neutral-850 p-8 space-y-5 text-center">
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-4 py-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Analyzing Image...</p>
                  <p className="text-xs text-neutral-500">Searching for 1D barcodes (UPC/EAN)</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-neutral-900 rounded-full border border-neutral-800 shadow-inner">
                  <ImageIcon className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-300">Take or Upload a Photo</p>
                  <p className="text-xs text-neutral-500 max-w-[280px]">
                    Ensure the barcode is well-lit, clearly visible, and takes up a good portion of the image.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-3 pt-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 fill-current" />
                    Take Picture or Upload
                  </button>
                </div>
              </>
            )}

            {scanError && !isProcessing && (
              <div className="w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-200">{scanError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0F0F11] border-t border-neutral-850 flex justify-end">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
