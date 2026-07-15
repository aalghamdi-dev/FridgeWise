export interface FridgeItem {
  id: string;
  name: string;
  quantity: string;
  expiryDate: string; // YYYY-MM-DD
  category: string;
  barcode?: string;
  createdAt: string;
}

export interface BarcodeMapping {
  barcode: string;
  name: string;
  category: string;
  unit?: string;
  unitSize?: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  action: "used" | "discarded";
  loggedAt: string;
}

export interface Recipe {
  name: string;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  matchPercentage: number;
  whyThisRecipe: string;
  ingredients: {
    fromFridge: string[];
    missingOrPantry: string[];
  };
  instructions: string[];
  missingKeyIngredientsNote: string;
}

export type CategoryType = 
  | "Produce" 
  | "Dairy & Eggs" 
  | "Meat & Seafood" 
  | "Leftovers" 
  | "Pantry" 
  | "Drinks" 
  | "Bakery"
  | "Others";
