import { CategoryType, BarcodeMapping } from "./types";

export const CATEGORIES: { name: CategoryType; color: string; iconName: string; bg: string; text: string }[] = [
  { name: "Produce", color: "emerald", iconName: "Apple", bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400" },
  { name: "Dairy & Eggs", color: "blue", iconName: "Egg", bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400" },
  { name: "Meat & Seafood", color: "red", iconName: "Beef", bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400" },
  { name: "Leftovers", color: "amber", iconName: "Clock", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400" },
  { name: "Pantry", color: "stone", iconName: "Package", bg: "bg-stone-50 dark:bg-stone-950/20", text: "text-stone-700 dark:text-stone-400" },
  { name: "Drinks", color: "cyan", iconName: "CupSoda", bg: "bg-cyan-50 dark:bg-cyan-950/20", text: "text-cyan-700 dark:text-cyan-400" },
  { name: "Bakery", color: "orange", iconName: "Croissant", bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400" },
  { name: "Others", color: "indigo", iconName: "Sparkles", bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-700 dark:text-indigo-400" }
];

// Seed mappings for the Barcode Memory feature
export const PRESET_BARCODES: BarcodeMapping[] = [
  { barcode: "5011234567890", name: "Organic Whole Milk", category: "Dairy & Eggs", defaultExpiryDays: 7 },
  { barcode: "5022345678901", name: "Fresh Strawberries", category: "Produce", defaultExpiryDays: 4 },
  { barcode: "5033456789012", name: "Greek Yogurt Tub", category: "Dairy & Eggs", defaultExpiryDays: 12 },
  { barcode: "5044567890123", name: "Classic Tomato Pasta Sauce", category: "Pantry", defaultExpiryDays: 90 },
  { barcode: "5055678901234", name: "Atlantic Salmon Fillets", category: "Meat & Seafood", defaultExpiryDays: 3 },
  { barcode: "5066789012345", name: "Sourdough Artisan Bread", category: "Bakery", defaultExpiryDays: 5 },
  { barcode: "5077890123456", name: "Sparkling Apple Cider", category: "Drinks", defaultExpiryDays: 30 }
];

// Helper to count days remaining
export function getDaysUntilExpiry(expiryDateStr: string): number {
  if (!expiryDateStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Get standard styling colors and badge descriptions depending on expiry date
export function getExpiryStatus(expiryDateStr: string) {
  const days = getDaysUntilExpiry(expiryDateStr);
  
  if (days < 0) {
    return {
      type: "expired",
      label: `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`,
      badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50",
      borderClass: "border-rose-500",
      indicatorClass: "bg-rose-500",
      cardBg: "bg-rose-50/40 dark:bg-rose-950/10"
    };
  } else if (days === 0) {
    return {
      type: "today",
      label: "Expires TODAY",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900",
      borderClass: "border-red-500 animate-pulse",
      indicatorClass: "bg-red-500",
      cardBg: "bg-red-50/40 dark:bg-red-950/10"
    };
  } else if (days <= 2) {
    return {
      type: "use_soon",
      label: `Expires in ${days} day${days !== 1 ? "s" : ""} (Use Soon)`,
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50",
      borderClass: "border-amber-500",
      indicatorClass: "bg-amber-500",
      cardBg: "bg-amber-50/20 dark:bg-amber-950/5"
    };
  } else {
    return {
      type: "fresh",
      label: `Expires in ${days} days (Fresh)`,
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50",
      borderClass: "border-emerald-200 dark:border-emerald-800/50",
      indicatorClass: "bg-emerald-500",
      cardBg: "bg-white dark:bg-neutral-900"
    };
  }
}

// Generate future date based on offset days
export function getFutureDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}
