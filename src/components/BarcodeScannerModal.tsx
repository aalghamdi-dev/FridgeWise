import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, AlertTriangle, Play, HelpCircle } from "lucide-react";
import { PRESET_BARCODES, CATEGORIES } from "../utils";
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeCamera, setActiveCamera] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setActiveCamera(false);
  };

  const startScanning = async () => {
    setCameraError(null);
    setIsScanning(true);
    setActiveCamera(true);

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.error("Error stopping existing scanner:", e);
      }
      scannerRef.current = null;
    }

    // Small timeout to ensure container is rendered
    setTimeout(async () => {
      const container = document.getElementById("reader-container");
      if (!container) {
        return;
      }

      try {
        const html5Qrcode = new Html5Qrcode("reader-container");
        scannerRef.current = html5Qrcode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0
        };

        await html5Qrcode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // On barcode detected
            onScanSuccess(decodedText);
            stopScanning();
            onClose();
          },
          () => {
            // Verbose error from camera scanner (usually safe to ignore)
          }
        );
      } catch (err: any) {
        console.error("Camera scanner start error:", err);
        setCameraError(
          err.message || "Could not access the camera. Please make sure camera permissions are granted."
        );
        setIsScanning(false);
        setActiveCamera(false);
      }
    }, 300);
  };

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Combine static presets with custom barcode mappings saved by the user
  const allBarcodesMap = new Map<string, BarcodeMapping>();
  PRESET_BARCODES.forEach((b) => allBarcodesMap.set(b.barcode, b));
  savedBarcodes.forEach((b) => allBarcodesMap.set(b.barcode, b));
  const availableBarcodes = Array.from(allBarcodesMap.values());

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
              Hold a barcode up to your camera or use the emulator below.
            </p>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="p-1 text-neutral-500 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Real Camera Area */}
          <div className="relative flex flex-col items-center justify-center bg-[#0A0A0B] rounded-xl overflow-hidden aspect-video border border-neutral-850">
            {activeCamera ? (
              <div id="reader-container" className="w-full h-full" />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="p-3 bg-neutral-900 rounded-full border border-neutral-850">
                  <Camera className="w-8 h-8 text-neutral-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-300">Webcam Scanner</p>
                  <p className="text-xs text-neutral-500 max-w-[280px]">
                    Requires camera permission. Works with standard product UPC/EAN barcodes.
                  </p>
                </div>
                <button
                  onClick={startScanning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Enable Camera
                </button>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                <AlertTriangle className="w-8 h-8 text-rose-500 animate-bounce" />
                <p className="text-xs text-neutral-300 max-w-[280px]">{cameraError}</p>
                <button
                  onClick={startScanning}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-md transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            )}

            {isScanning && (
              <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded-full text-[10px] text-indigo-400 font-mono tracking-wider animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                CAMERA ACTIVE
              </div>
            )}
          </div>

          {/* Barcode Emulator / Simulator (Essential for Sandbox environments) */}
          <div className="p-4 bg-[#121214] rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <HelpCircle className="w-4 h-4" />
              <h4 className="text-xs font-semibold uppercase tracking-wider">No Camera? Barcode Emulator</h4>
            </div>
            <p className="text-xs text-neutral-400">
              Click any sample item below to simulate a perfect barcode scan. This allows you to demo the auto-fill Barcode Memory immediately!
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {availableBarcodes.map((mapping) => {
                const categoryColor = CATEGORIES.find((c) => c.name === mapping.category)?.text || "text-neutral-500";
                return (
                  <button
                    key={mapping.barcode}
                    onClick={() => {
                      onScanSuccess(mapping.barcode);
                      stopScanning();
                      onClose();
                    }}
                    className="flex flex-col items-start p-2 bg-[#0F0F11] border border-neutral-800 hover:border-indigo-500 rounded-lg text-left transition-all group hover:shadow-xs"
                  >
                    <span className="text-xs font-semibold text-neutral-300 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {mapping.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Code: {mapping.barcode}
                    </span>
                    <span className={`text-[9px] font-medium mt-1 uppercase ${categoryColor}`}>
                      {mapping.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0F0F11] border-t border-neutral-850 flex justify-end">
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
