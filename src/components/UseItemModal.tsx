import React, { useState, useEffect } from "react";
import { X, Check, Calculator, AlertTriangle, PackageOpen } from "lucide-react";
import { FridgeItem } from "../types";

interface UseItemModalProps {
  isOpen: boolean;
  item: FridgeItem | null;
  onClose: () => void;
  onUsePartial: (item: FridgeItem, newQuantityNum: number) => void;
  onUseAll: (item: FridgeItem) => void;
}

export default function UseItemModal({ isOpen, item, onClose, onUsePartial, onUseAll }: UseItemModalProps) {
  const [useAmount, setUseAmount] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUseAmount("");
      setWarning(null);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  // Parse quantity and unit
  // Example "500 grams", "2 pieces", "1.5 liters"
  const qtyParts = item.quantity.trim().split(" ");
  const currentNum = parseFloat(qtyParts[0]) || 0;
  const currentUnit = qtyParts.slice(1).join(" ");

  const handleUseCustomAmount = () => {
    setWarning(null);
    const amountToUse = parseFloat(useAmount);
    if (isNaN(amountToUse) || amountToUse <= 0) {
      setWarning("Please enter a valid amount.");
      return;
    }

    if (amountToUse >= currentNum) {
      setWarning("Amount exceeds remaining quantity. Using all instead.");
      setTimeout(() => {
        onUseAll(item);
        onClose();
      }, 1500);
      return;
    }

    const remaining = currentNum - amountToUse;
    onUsePartial(item, remaining);
    onClose();
  };

  const handleUseHalf = () => {
    const remaining = currentNum / 2;
    onUsePartial(item, remaining);
    onClose();
  };

  const handleUseAll = () => {
    onUseAll(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden bg-[#0F0F11] rounded-2xl shadow-2xl border border-neutral-850 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-850">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <PackageOpen className="w-4 h-4 text-emerald-400" />
              Use Item
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Item Info */}
          <div className="flex items-center justify-between bg-[#121214] p-3 rounded-xl border border-neutral-800">
            <span className="text-sm font-bold text-white truncate max-w-[60%]">{item.name}</span>
            <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30">
              Remaining: {currentNum} {currentUnit}
            </span>
          </div>

          <div className="space-y-4">
            {/* Enter Amount */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                1. Enter Custom Amount
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={useAmount}
                    onChange={(e) => {
                      setUseAmount(e.target.value);
                      setWarning(null);
                    }}
                    placeholder={`e.g. ${currentNum / 2}`}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <span className="text-xs font-mono text-neutral-500">{currentUnit}</span>
                  </div>
                </div>
                <button
                  onClick={handleUseCustomAmount}
                  className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-lg shadow-emerald-500/20 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Use
                </button>
              </div>
              {warning && (
                <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {warning}
                </p>
              )}
            </div>

            <div className="relative flex items-center py-2">
              <div className="grow border-t border-neutral-850"></div>
              <span className="shrink-0 mx-4 text-xs font-medium text-neutral-600 uppercase">OR</span>
              <div className="grow border-t border-neutral-850"></div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                2. Quick Actions
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleUseHalf}
                  className="py-2.5 bg-[#121214] hover:bg-[#18181b] border border-neutral-800 hover:border-emerald-900/50 text-neutral-300 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Use Half ({(currentNum / 2).toLocaleString()} {currentUnit})
                </button>
                <button
                  onClick={handleUseAll}
                  className="py-2.5 bg-[#121214] hover:bg-emerald-950/20 border border-neutral-800 hover:border-emerald-900/50 text-neutral-300 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Use All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
