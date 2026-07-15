import { useState, useEffect, FormEvent } from "react";
import { 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  Filter, 
  ArrowUpDown, 
  AlertTriangle, 
  Calendar, 
  History, 
  ChefHat, 
  Apple, 
  Egg, 
  Beef, 
  Clock, 
  Package, 
  CupSoda, 
  Croissant, 
  Sparkles, 
  RefreshCw, 
  Info, 
  CheckCircle, 
  ChevronRight, 
  PlusCircle, 
  Bookmark, 
  Trash, 
  AlertCircle,
  HelpCircle,
  UtensilsCrossed,
  Sliders,
  ArrowRight
} from "lucide-react";
import { FridgeItem, HistoryItem, BarcodeMapping, Recipe, CategoryType } from "./types";
import { 
  CATEGORIES, 
  PRESET_BARCODES, 
  getDaysUntilExpiry, 
  getExpiryStatus, 
  getFutureDateString,
  getCookie,
  setCookie,
  eraseCookie
} from "./utils";
import BarcodeScannerModal from "./components/BarcodeScannerModal";
import UseItemModal from "./components/UseItemModal";
import RecipeModal from "./components/RecipeModal";

export default function App() {
  // --- States ---
  const [activeTab, setActiveTab] = useState<"fridge" | "add" | "recipes" | "history">("fridge");
  
  // Fridge ID and Sync states
  const [fridgeId, setFridgeId] = useState<string | null>(() => {
    const localId = localStorage.getItem("fridgewise_id");
    if (localId) return localId;
    const cookieId = getCookie("fridgewise_id");
    if (cookieId) {
      localStorage.setItem("fridgewise_id", cookieId);
      return cookieId;
    }
    return null;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [savedBarcodes, setSavedBarcodes] = useState<BarcodeMapping[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | "All">("All");
  const [sortBy, setSortBy] = useState<"expiry" | "name" | "category">("expiry");

  // Form State (Add Food / Edit)
  const [formBarcode, setFormBarcode] = useState("");
  const [formName, setFormName] = useState("");
  const [formQuantityNum, setFormQuantityNum] = useState("");
  const [formQuantityUnit, setFormQuantityUnit] = useState("pieces");
  const [formItemCount, setFormItemCount] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formCategory, setFormCategory] = useState<CategoryType>("Produce");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [useItemModalConfig, setUseItemModalConfig] = useState<{ isOpen: boolean; item: FridgeItem | null }>({ isOpen: false, item: null });
  const [autoFillSuccess, setAutoFillSuccess] = useState(false);
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState("");

  // AI Recipes State
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  // Modals & Scanners
  const [scannerOpen, setScannerOpen] = useState(false);

  // Login / Welcome States
  const [inputFridgeId, setInputFridgeId] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showIdTip, setShowIdTip] = useState(false);

  // --- Effects to sync with Server Database ---

  // Fetch barcodes once on mount
  useEffect(() => {
    const fetchBarcodes = async () => {
      try {
        const res = await fetch("/api/barcodes");
        if (res.ok) {
          const data = await res.json();
          setSavedBarcodes(data.barcodes || []);
        }
      } catch (err) {
        console.error("Failed to fetch barcodes:", err);
      }
    };
    fetchBarcodes();
  }, []);

  // Fetch fridge data when fridgeId changes
  useEffect(() => {
    if (!fridgeId) {
      setIsLoaded(false);
      setFridgeItems([]);
      setHistoryItems([]);
      setRecipes([]);
      return;
    }

    const fetchFridgeData = async () => {
      setIsLoadingDb(true);
      try {
        const res = await fetch(`/api/fridge/${fridgeId}`);
        if (res.ok) {
          const data = await res.json();
          setFridgeItems(data.items || []);
          setHistoryItems(data.history || []);
          setRecipes(data.recipes || []);
          setIsLoaded(true);
        } else {
          console.error("Failed to fetch fridge data:", res.statusText);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Error fetching fridge data:", err);
        setIsLoaded(true);
      } finally {
        setIsLoadingDb(false);
      }
    };

    fetchFridgeData();
  }, [fridgeId]);

  // Sync state to backend whenever items, history, or recipes change (only if loaded!)
  useEffect(() => {
    if (!fridgeId || !isLoaded) return;

    const syncFridgeData = async () => {
      try {
        await fetch(`/api/fridge/${fridgeId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: fridgeItems,
            history: historyItems,
            recipes: recipes
          })
        });
      } catch (err) {
        console.error("Error syncing fridge data:", err);
      }
    };

    const timer = setTimeout(() => {
      syncFridgeData();
    }, 500);

    return () => clearTimeout(timer);
  }, [fridgeItems, historyItems, recipes, fridgeId, isLoaded]);

  // Set default recipe selection based on expiring ingredients
  useEffect(() => {
    if (fridgeItems.length === 0) return;
    const expiringSoonIds = fridgeItems
      .filter(item => {
        const days = getDaysUntilExpiry(item.expiryDate);
        return days <= 3;
      })
      .map(item => item.id);
    setSelectedIngredients(expiringSoonIds);
  }, [fridgeItems]);

  // Keep localStorage and cookies synchronized if fridgeId is active
  useEffect(() => {
    if (fridgeId) {
      localStorage.setItem("fridgewise_id", fridgeId);
      setCookie("fridgewise_id", fridgeId, 365);
    }
  }, [fridgeId]);

  // --- Login / Create Handlers ---
  const handleCreateFridge = async () => {
    setIsCreating(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/fridge/create", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.fridgeId;
        localStorage.setItem("fridgewise_id", newId);
        setCookie("fridgewise_id", newId, 365);
        setFridgeId(newId);
      } else {
        setVerifyError("Could not create a new fridge. Please try again.");
      }
    } catch (err) {
      console.error("Create fridge error:", err);
      setVerifyError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleVerifyFridge = async (e: FormEvent) => {
    e.preventDefault();
    if (inputFridgeId.length !== 8) return;

    setIsVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/fridge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fridgeId: inputFridgeId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          localStorage.setItem("fridgewise_id", inputFridgeId);
          setCookie("fridgewise_id", inputFridgeId, 365);
          setFridgeId(inputFridgeId);
        } else {
          setVerifyError("Fridge ID not found. Try creating a new one!");
        }
      } else {
        setVerifyError("Server error verifying fridge ID.");
      }
    } catch (err) {
      console.error("Verify fridge error:", err);
      setVerifyError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of this fridge? Make sure you have saved your 8-digit Fridge ID to access it again!")) {
      localStorage.removeItem("fridgewise_id");
      eraseCookie("fridgewise_id");
      setFridgeId(null);
    }
  };

  const handleCopyId = () => {
    if (fridgeId) {
      navigator.clipboard.writeText(fridgeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- Barcode Memory lookup logic ---
  const handleBarcodeChange = (barcode: string) => {
    setFormBarcode(barcode);
    if (!barcode) return;

    // Search profile's saved barcodes + pre-loaded presets
    const match = savedBarcodes.find(b => b.barcode === barcode) || PRESET_BARCODES.find(b => b.barcode === barcode);
    if (match) {
      setFormName(match.name);
      setFormCategory(match.category as CategoryType);
      
      if (match.unit) setFormQuantityUnit(match.unit);
      if (match.unitSize) setFormQuantityNum(match.unitSize);
      
      setAutoFillSuccess(true);
      setTimeout(() => setAutoFillSuccess(false), 3000);
    }
  };

  // Callback when scanner detects a barcode
  const handleScanSuccess = (barcode: string) => {
    handleBarcodeChange(barcode);
  };

  // --- Action Handlers ---
  const handleAddOrUpdateItem = (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formExpiryDate) return;

    const qtyNum = formQuantityNum.trim() || "1";
    const qtyUnit = formQuantityUnit || "pieces";
    const finalQuantity = `${qtyNum} ${qtyUnit}`;

    // Save barcode mapping to Barcode Memory if a barcode is entered
    if (formBarcode.trim()) {
      const barcodeExists = savedBarcodes.some(b => b.barcode === formBarcode.trim()) || PRESET_BARCODES.some(b => b.barcode === formBarcode.trim());
      if (!barcodeExists) {
        const newMapping: BarcodeMapping = {
          barcode: formBarcode.trim(),
          name: formName.trim(),
          category: formCategory,
          unit: formQuantityUnit,
          unitSize: formQuantityNum.trim() || undefined
        };
        
        // Sync custom barcode to shared database
        fetch("/api/barcodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMapping)
        })
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(data => {
          if (data && data.barcodes) {
            setSavedBarcodes(data.barcodes);
          } else {
            setSavedBarcodes(prev => [...prev, newMapping]);
          }
        })
        .catch(err => {
          console.error("Error saving barcode to shared DB:", err);
          setSavedBarcodes(prev => [...prev, newMapping]);
        });
      }
    }

    if (editingItemId) {
      // Update existing item
      setFridgeItems(prev => prev.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            name: formName.trim(),
            quantity: finalQuantity,
            category: formCategory,
            expiryDate: formExpiryDate,
            barcode: formBarcode.trim() || undefined
          };
        }
        return item;
      }));
      setEditingItemId(null);
    } else {
      // Add new item(s)
      const count = Math.max(1, parseInt(formItemCount, 10) || 1);
      const newItems = Array.from({ length: count }).map((_, index) => ({
        id: `${Date.now()}-${index}`,
        name: formName.trim(),
        quantity: finalQuantity,
        category: formCategory,
        expiryDate: formExpiryDate,
        barcode: formBarcode.trim() || undefined,
        createdAt: new Date().toISOString()
      }));
      setFridgeItems(prev => [...prev, ...newItems]);
    }
    // Reset Form
    setFormBarcode("");
    setFormName("");
    setFormItemCount("");
    setFormQuantityNum("");
    setFormQuantityUnit("pieces");
    setFormQuantity("");
    setFormExpiryDate("");
    setFormCategory("Produce");
    
    // Direct back to home dashboard
    setActiveTab("fridge");
  };

  const handleEditTrigger = (item: FridgeItem) => {
    setEditingItemId(item.id);
    setFormBarcode(item.barcode || "");
    setFormName(item.name);
    
    // Parse quantity into number and unit
    const qtyStr = item.quantity || "1 pieces";
    const match = qtyStr.match(/^([\d.]+)\s*(.*)$/);
    if (match) {
      setFormQuantityNum(match[1]);
      const parsedUnit = match[2].trim().toLowerCase();
      if (parsedUnit.includes("gram")) {
        setFormQuantityUnit("grams");
      } else if (parsedUnit.includes("kilogram") || parsedUnit === "kg") {
        setFormQuantityUnit("kilograms");
      } else if (parsedUnit.includes("liter") || parsedUnit === "l") {
        setFormQuantityUnit("liters");
      } else if (parsedUnit.includes("milliliter") || parsedUnit === "ml") {
        setFormQuantityUnit("milliliters");
      } else {
        setFormQuantityUnit("pieces");
      }
    } else {
      setFormQuantityNum("");
      setFormQuantityUnit("pieces");
    }

    setFormQuantity(item.quantity);
    setFormCategory(item.category as CategoryType);
    setFormExpiryDate(item.expiryDate);
    setActiveTab("add");
  };

  const handleDeleteItem = (id: string) => {
    setFridgeItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUsePartial = (item: FridgeItem, newQuantityNum: number) => {
    // Round to 2 decimal places to avoid floating point issues
    const roundedNum = Math.round(newQuantityNum * 100) / 100;
    
    // Parse out unit
    const qtyParts = item.quantity.trim().split(" ");
    const unit = qtyParts.slice(1).join(" ");
    
    const updatedQuantity = `${roundedNum} ${unit}`.trim();
    
    // Update the item
    setFridgeItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: updatedQuantity } : i));
  };

  const handleUseAll = (item: FridgeItem) => {
    handleLogHistory(item, "used");
  };

  const handleLogHistory = (item: FridgeItem, action: "used" | "discarded") => {
    // Add to history log
    const newLog: HistoryItem = {
      id: Date.now().toString(),
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      action,
      loggedAt: new Date().toISOString().split("T")[0]
    };
    setHistoryItems(prev => [newLog, ...prev]);
    // Remove from active fridge
    handleDeleteItem(item.id);
  };

  const handleRestoreHistoryItem = (logItem: HistoryItem) => {
    const restoredItem: FridgeItem = {
      id: Date.now().toString(),
      name: logItem.name,
      quantity: logItem.quantity,
      category: logItem.category,
      expiryDate: getFutureDateString(5), // give it 5 fresh days default upon restoration
      createdAt: new Date().toISOString()
    };
    setFridgeItems(prev => [...prev, restoredItem]);
    setHistoryItems(prev => prev.filter(log => log.id !== logItem.id));
  };

  // --- AI Recipe Request Generator ---
  const handleGenerateRecipes = async () => {
    if (selectedIngredients.length === 0) {
      setRecipeError("Please select at least 1 ingredient to cook with.");
      return;
    }

    setIsGeneratingRecipes(true);
    setRecipeError(null);
    setRecipes([]);

    const ingredientsToSend = fridgeItems.filter(item => selectedIngredients.includes(item.id));

    try {
      const response = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ingredients: ingredientsToSend })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with OpenRouter API. Verify configuration.");
      }

      setRecipes(data.recipes || []);
    } catch (err: any) {
      console.error(err);
      setRecipeError(err.message || "An unexpected error occurred during recipe generation.");
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  const toggleSelectIngredient = (id: string) => {
    setSelectedIngredients(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // --- Expiry Counts & Warnings ---
  const expiredCount = fridgeItems.filter(item => getDaysUntilExpiry(item.expiryDate) < 0).length;
  const expiringSoonCount = fridgeItems.filter(item => {
    const days = getDaysUntilExpiry(item.expiryDate);
    return days >= 0 && days <= 2;
  }).length;
  const freshCount = fridgeItems.filter(item => getDaysUntilExpiry(item.expiryDate) > 2).length;

  // --- Filtering & Sorting execution ---
  const filteredItems = fridgeItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.barcode && item.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "expiry") {
      return getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate);
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      return a.category.localeCompare(b.category);
    }
  });

  // --- Wastage Calculations for History tab ---
  const usedCount = historyItems.filter(h => h.action === "used").length;
  const discardedCount = historyItems.filter(h => h.action === "discarded").length;
  const totalLogged = usedCount + discardedCount;
  const foodSavedRate = totalLogged > 0 ? Math.round((usedCount / totalLogged) * 100) : 100;

  // Get Lucide Category Icon dynamically
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case "Produce": return <Apple className="w-4 h-4 shrink-0" />;
      case "Dairy & Eggs": return <Egg className="w-4 h-4 shrink-0" />;
      case "Meat & Seafood": return <Beef className="w-4 h-4 shrink-0" />;
      case "Leftovers": return <Clock className="w-4 h-4 shrink-0" />;
      case "Pantry": return <Package className="w-4 h-4 shrink-0" />;
      case "Drinks": return <CupSoda className="w-4 h-4 shrink-0" />;
      case "Bakery": return <Croissant className="w-4 h-4 shrink-0" />;
      default: return <Sparkles className="w-4 h-4 shrink-0" />;
    }
  };

  if (!fridgeId) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-neutral-300 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121214] border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden">
          {/* Decorative glowing gradient effect in background */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-500/20 text-white">
              <svg
                viewBox="0 0 100 100"
                fill="none"
                className="w-16 h-16"
                aria-hidden="true"
              >
                <defs>
                  <mask id="pear-bite-login">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <circle cx="76" cy="58" r="19" fill="black" />
                    <circle cx="23" cy="64" r="15" fill="black" />
                  </mask>
                </defs>
                <path 
                  d="M 50 33 C 50 22, 48.5 16, 48.5 12" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />
                <path 
                  d="M 47 28 C 42 27, 35 23, 35 18 C 35 16, 38 15, 42 18 C 46 21, 47.5 25, 47 28 Z" 
                  fill="currentColor" 
                />
                <path 
                  d="M 50 33 C 41 33, 37.5 42, 34.5 52 C 31 63, 23 68, 23 78 C 23 88, 33 94, 50 94 C 67 94, 77 88, 77 78 C 77 68, 69 63, 65.5 52 C 62.5 42, 59 33, 50 33 Z" 
                  fill="currentColor" 
                  mask="url(#pear-bite-login)" 
                />
              </svg>
            </div>
            
            <div>
              <h1 className="text-3xl font-black tracking-tight font-display text-white">
                Fridge<span className="text-indigo-400">Wise</span>
              </h1>
              <p className="text-xs text-neutral-400 max-w-sm mt-1.5 font-medium leading-relaxed">
                Keep your kitchen waste-free. All items, history, and recipes are persisted instantly to your shared fridge database.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Action 1: Create a Fridge */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                First Time Here?
              </h3>
              <button
                onClick={handleCreateFridge}
                disabled={isCreating || isVerifying}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-850 disabled:text-neutral-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.98]"
              >
                {isCreating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" />
                    Create New Fridge ID
                  </>
                )}
              </button>
            </div>

            {/* Divider line */}
            <div className="flex items-center gap-3">
              <div className="h-[1px] bg-neutral-800 flex-1" />
              <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">or</span>
              <div className="h-[1px] bg-neutral-800 flex-1" />
            </div>

            {/* Action 2: Enter Existing Fridge */}
            <form onSubmit={handleVerifyFridge} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Access Existing Fridge
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setShowIdTip(true)}
                    onMouseLeave={() => setShowIdTip(false)}
                    onClick={() => setShowIdTip(!showIdTip)}
                    className="p-1 -mr-1 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-indigo-400 focus:outline-hidden transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Fridge ID Help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>

                  {/* Elegant Floating Tip Tooltip */}
                  {showIdTip && (
                    <div className="absolute right-0 bottom-full mb-2.5 w-72 bg-[#18181B] border border-neutral-800 p-4 rounded-2xl shadow-2xl text-left text-xs text-neutral-300 z-50 transition-all duration-200">
                      <div className="absolute bottom-[-6px] right-2.5 w-3 h-3 bg-[#18181B] border-r border-b border-neutral-800 rotate-45" />
                      <div className="space-y-2">
                        <p className="font-bold text-white flex items-center gap-1.5">
                          <span className="text-indigo-400 text-sm">💡</span>
                          How Fridge IDs Work
                        </p>
                        <p className="leading-relaxed text-neutral-400">
                          Your Fridge ID is a unique <strong className="text-indigo-300">8-digit code</strong> of letters and numbers (e.g., <code className="font-mono bg-neutral-900 px-1.5 py-0.5 rounded text-indigo-200 text-[10px]">A9x7K2pQ</code>).
                        </p>
                        <p className="leading-relaxed text-neutral-400">
                          Enter this ID on any smartphone, tablet, or PC to immediately access and synchronize your active inventory, wastage logs, and recipes in real-time.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputFridgeId}
                  onChange={(e) => {
                    setInputFridgeId(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8));
                    setVerifyError(null);
                  }}
                  placeholder="8-digit Fridge ID"
                  className="flex-1 px-4 py-2.5 bg-[#0A0A0B] border border-neutral-800 rounded-xl text-sm font-mono text-center tracking-widest text-white placeholder-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
                  maxLength={8}
                  disabled={isCreating || isVerifying}
                />
                
                <button
                  type="submit"
                  disabled={isCreating || isVerifying || inputFridgeId.length !== 8}
                  className="px-5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  {isVerifying ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              </div>

              {verifyError && (
                <p className="text-rose-500 text-[11px] font-medium flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {verifyError}
                </p>
              )}
            </form>
          </div>

          {/* Fridge Benefits summary footer */}
          <div className="pt-4 border-t border-neutral-850/50 flex flex-col gap-2 text-[11px] text-neutral-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">✓</span>
              <span>Access and share your inventory from any device</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">✓</span>
              <span>Contribute barcodes to crowdsource details for all users</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-neutral-300 font-sans flex flex-col">
      
      {/* Dynamic Expiry Advisory banner */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <div className="bg-amber-950/20 border-b border-neutral-800/80 text-amber-400 px-4 py-2.5 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>
            {expiredCount > 0 && `You have ${expiredCount} expired item${expiredCount > 1 ? "s" : ""}. `}
            {expiringSoonCount > 0 && `${expiringSoonCount} item${expiringSoonCount > 1 ? "s" : ""} must be used within 2 days!`}
          </span>
          <button 
            onClick={() => { setActiveTab("recipes"); }}
            className="underline hover:text-white ml-2 transition-colors flex items-center gap-1 text-indigo-400"
          >
            Ask AI to design a recipe <ChevronRight className="w-3 h-3 text-indigo-400" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-4xl mx-auto flex-1 p-4 md:p-6 flex flex-col space-y-6">
        
        {/* Sleek App Branding */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-b border-neutral-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <svg
                viewBox="0 0 100 100"
                fill="none"
                className="w-7 h-7"
                aria-hidden="true"
              >
                <defs>
                  <mask id="pear-bite">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    {/* Deep smooth circular bite cutout on the middle-right side */}
                    <circle cx="76" cy="58" r="19" fill="black" />
                    {/* Secondary bite cutout on the lower-left side */}
                    <circle cx="23" cy="64" r="15" fill="black" />
                  </mask>
                </defs>
                
                {/* Stem */}
                <path 
                  d="M 50 33 C 50 22, 48.5 16, 48.5 12" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />
                
                {/* Leaf */}
                <path 
                  d="M 47 28 C 42 27, 35 23, 35 18 C 35 16, 38 15, 42 18 C 46 21, 47.5 25, 47 28 Z" 
                  fill="currentColor" 
                />
                
                {/* Bottom-heavy organic Pear Body */}
                <path 
                  d="M 50 33 C 41 33, 37.5 42, 34.5 52 C 31 63, 23 68, 23 78 C 23 88, 33 94, 50 94 C 67 94, 77 88, 77 78 C 77 68, 69 63, 65.5 52 C 62.5 42, 59 33, 50 33 Z" 
                  fill="currentColor" 
                  mask="url(#pear-bite)" 
                />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight font-display text-white">
                Fridge<span className="text-indigo-400">Wise</span>
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs text-neutral-500 font-medium">Fridge ID:</span>
                <button 
                  onClick={handleCopyId}
                  className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-indigo-400 font-mono text-xs rounded-md flex items-center gap-1.5 transition-all group active:scale-[0.97] cursor-pointer"
                  title="Click to copy Fridge ID to share or access from other devices"
                >
                  <span className="font-bold tracking-widest">{fridgeId}</span>
                  {copied ? (
                    <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">Copied!</span>
                  ) : (
                    <svg className="w-3 h-3 text-neutral-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2 py-0.5 bg-neutral-900 hover:bg-rose-950/20 border border-neutral-800 hover:border-rose-900/30 text-neutral-400 hover:text-rose-400 text-xs rounded-md flex items-center gap-1 transition-all active:scale-[0.97] cursor-pointer"
                  title="Switch/Log out of current fridge"
                >
                  <span>Switch</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics display */}
          <div className="flex items-center gap-2 text-xs font-semibold font-mono">
            <span className="px-3 py-1.5 bg-rose-950/20 text-rose-400 rounded-lg border border-rose-900/30">
              {expiredCount} Expired
            </span>
            <span className="px-3 py-1.5 bg-amber-950/20 text-amber-400 rounded-lg border border-amber-900/30">
              {expiringSoonCount} Use Soon
            </span>
            <span className="px-3 py-1.5 bg-indigo-950/20 text-indigo-400 rounded-lg border border-indigo-900/30">
              {freshCount} Fresh
            </span>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex bg-[#0F0F11] p-1 rounded-xl border border-neutral-850">
          <button
            onClick={() => { setActiveTab("fridge"); setEditingItemId(null); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "fridge"
                ? "bg-[#121214] text-indigo-400 shadow-md border border-neutral-800"
                : "text-neutral-500 hover:text-neutral-200"
            }`}
          >
            <Apple className="w-4 h-4" />
            My Fridge
          </button>
          <button
            onClick={() => { setActiveTab("add"); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "add"
                ? "bg-[#121214] text-indigo-400 shadow-md border border-neutral-800"
                : "text-neutral-500 hover:text-neutral-200"
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingItemId ? "Edit Item" : "Add"}
          </button>
          <button
            onClick={() => { setActiveTab("recipes"); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "recipes"
                ? "bg-[#121214] text-indigo-400 shadow-md border border-neutral-800"
                : "text-neutral-500 hover:text-neutral-200"
            }`}
          >
            <ChefHat className="w-4 h-4" />
            AI Recipes
          </button>
          <button
            onClick={() => { setActiveTab("history"); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "history"
                ? "bg-[#121214] text-indigo-400 shadow-md border border-neutral-800"
                : "text-neutral-500 hover:text-neutral-200"
            }`}
          >
            <History className="w-4 h-4" />
            Wastage & Log
          </button>
        </div>

        {/* --- Content Tabs --- */}
        <main className="flex-1">
          
          {/* TAB 1: My Fridge Dashboard */}
          {activeTab === "fridge" && (
            <div className="space-y-4">
              
              {/* Search, Filter, Sort Controls */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search fridge or enter barcode..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#121214] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Filter Category */}
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as CategoryType | "All")}
                      className="pl-8 pr-8 py-2 bg-[#121214] border border-neutral-800 rounded-xl text-xs text-neutral-300 appearance-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="All">All Categories</option>
                      {CATEGORIES.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="relative">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "expiry" | "name" | "category")}
                      className="pl-8 pr-8 py-2 bg-[#121214] border border-neutral-800 rounded-xl text-xs text-neutral-300 appearance-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="expiry">Sort: Expiry Soonest</option>
                      <option value="name">Sort: Alphabetical</option>
                      <option value="category">Sort: Category</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Cards Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredItems.map(item => {
                  const status = getExpiryStatus(item.expiryDate);
                  
                  return (
                    <div 
                      key={item.id}
                      className={`group relative overflow-hidden bg-[#121214] rounded-2xl border-l-4 ${status.borderClass} border-neutral-800 shadow-xs hover:shadow-lg hover:shadow-indigo-500/5 transition-all p-5 flex flex-col justify-between`}
                    >
                      {/* Top Row with Category and Actions */}
                      <div className="flex justify-between items-start">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#0F0F11]/80 text-neutral-300 border border-neutral-800/80">
                          {getCategoryIcon(item.category)}
                          {item.category}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditTrigger(item)}
                            className="p-1.5 text-neutral-500 hover:text-indigo-400 rounded-md hover:bg-[#0F0F11] transition-colors"
                            title="Edit details"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-md hover:bg-[#0F0F11] transition-colors"
                            title="Delete entirely"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Item Info */}
                      <div className="my-3 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-base font-bold text-white truncate">
                            {item.name}
                          </h4>
                          <span className="text-[11px] font-medium text-neutral-300 bg-neutral-800/60 px-2 py-0.5 rounded border border-neutral-700/50 whitespace-nowrap shrink-0">
                            {item.quantity}
                          </span>
                        </div>
                        
                        {item.barcode && (
                          <div className="text-[10px] text-neutral-500 font-mono tracking-wider flex items-center gap-1">
                            <span className="inline-block w-2.5 h-1.5 bg-[#0F0F11] border-x border-neutral-600" />
                            Barcode: {item.barcode}
                          </div>
                        )}
                      </div>

                      {/* Expiry Advisory and Action Footer */}
                      <div className="mt-2 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
                        {/* Expiry Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${status.badgeClass}`}>
                          {status.label}
                        </span>

                        {/* Used / Discarded fast action triggers */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setUseItemModalConfig({ isOpen: true, item })}
                            className="px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/15 hover:bg-emerald-950/35 rounded-lg border border-emerald-900/40 transition-all flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Used
                          </button>
                          <button
                            onClick={() => handleLogHistory(item, "discarded")}
                            className="px-2.5 py-1 text-[10px] font-bold text-rose-400 bg-rose-950/15 hover:bg-rose-950/35 rounded-lg border border-rose-900/40 transition-all flex items-center gap-1"
                          >
                            <Trash className="w-3 h-3" />
                            Wasted
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="col-span-full py-16 text-center space-y-4 bg-[#121214] rounded-2xl border border-neutral-800">
                    <div className="mx-auto w-12 h-12 bg-[#0F0F11] rounded-full flex items-center justify-center text-neutral-500">
                      <Apple className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-200">No items found</p>
                      <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">
                        Try modifying your search filter, or add a fresh item with the &ldquo;Add&rdquo; button.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("add")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
                    >
                      Add New Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Add Food Form */}
          {activeTab === "add" && (
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Core Form Section */}
              <div className="md:col-span-2 bg-[#121214] p-6 rounded-2xl border border-neutral-800 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-display text-white">
                    {editingItemId ? "Modify Food" : "Add"}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Enter details manually or scan a barcode to lookup previously stored information instantly.
                  </p>
                </div>

                <form onSubmit={handleAddOrUpdateItem} className="space-y-4">
                  
                  {/* Barcode Memory lookup row */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Barcode Mapping (Optional lookup)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formBarcode}
                        onChange={(e) => handleBarcodeChange(e.target.value)}
                        placeholder="Scan or enter item barcode (e.g. 5011234567890)"
                        className="flex-1 px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setScannerOpen(true)}
                        className="px-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Scan Camera
                      </button>
                    </div>
                    {autoFillSuccess && (
                      <p className="text-[11px] font-bold text-indigo-400 animate-pulse flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        ⚡ Auto-filled details from Barcode Memory profile!
                      </p>
                    )}
                  </div>

                  {/* Item Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Organic Strawberries, Skimmed Milk"
                      className="w-full px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* Quantity, Unit, and Category Row */}
                  <div className={`grid grid-cols-2 gap-4 ${editingItemId ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Unit
                      </label>
                      <select
                        value={formQuantityUnit}
                        onChange={(e) => setFormQuantityUnit(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        <option value="grams">grams</option>
                        <option value="kilograms">kilograms</option>
                        <option value="liters">liters</option>
                        <option value="milliliters">milliliters</option>
                        <option value="pieces">pieces</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Unit Size
                      </label>
                      <input
                        type="number"
                        min="1"
                        list="quantity-presets"
                        value={formQuantityNum}
                        onChange={(e) => setFormQuantityNum(e.target.value)}
                        placeholder="5, 50, 100"
                        className="w-full px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <datalist id="quantity-presets">
                        <option value="1" />
                        <option value="5" />
                        <option value="10" />
                        <option value="15" />
                        <option value="20" />
                        <option value="30" />
                        <option value="50" />
                        <option value="100" />
                        <option value="200" />
                        <option value="500" />
                      </datalist>
                    </div>

                    {!editingItemId && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formItemCount}
                          onChange={(e) => setFormItemCount(e.target.value)}
                          placeholder=" 1, 3, 5"
                          className="w-full px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as CategoryType)}
                        className="w-full px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Expiry Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formExpiryDate}
                      onChange={(e) => setFormExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    
                    {/* Quick helper offsets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-neutral-500 self-center mr-1">Quick Expirations:</span>
                      <button
                        type="button"
                        onClick={() => setFormExpiryDate(getFutureDateString(3))}
                        className="px-2 py-0.5 text-[9px] font-bold border border-rose-900/40 hover:border-rose-700/50 bg-rose-950/10 text-rose-400 rounded-md transition-colors"
                      >
                        +3 days (Meat/Seafood)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormExpiryDate(getFutureDateString(7))}
                        className="px-2 py-0.5 text-[9px] font-bold border border-indigo-900/40 hover:border-indigo-700/50 bg-indigo-950/10 text-indigo-400 rounded-md transition-colors"
                      >
                        +7 days (Dairy/Eggs)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormExpiryDate(getFutureDateString(14))}
                        className="px-2 py-0.5 text-[9px] font-bold border border-emerald-900/40 hover:border-emerald-700/50 bg-emerald-950/10 text-emerald-400 rounded-md transition-colors"
                      >
                        +14 days (Produce)
                      </button>
                    </div>
                  </div>

                  {/* Form Submission buttons */}
                  <div className="flex gap-3 pt-4 border-t border-neutral-800/60">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
                    >
                      {editingItemId ? "Save Changes" : "Save Item to Fridge"}
                    </button>
                    {editingItemId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemId(null);
                          setFormBarcode("");
                          setFormName("");
                          setFormItemCount("");
                          setFormQuantityNum("");
                          setFormQuantityUnit("pieces");
                          setFormQuantity("");
                          setFormExpiryDate("");
                          setFormCategory("Produce");
                          setActiveTab("fridge");
                        }}
                        className="px-4 py-2 bg-[#0F0F11] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
              {/* Sidebar Guide: Explaining Barcode Memory and presets */}
              <div className="space-y-6">
                
                {/* Quick Add List (Click to trigger lookup directly in form) */}
                <div className="bg-[#0F0F11] p-5 rounded-2xl border border-neutral-850 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Quick Add
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Search and select an item from the barcode database to quickly load its information.
                  </p>
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={barcodeSearchQuery}
                      onChange={(e) => setBarcodeSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 pl-8 bg-[#0A0A0B] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                  </div>

                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {(barcodeSearchQuery 
                      ? [...savedBarcodes, ...PRESET_BARCODES]
                          .filter((b, index, self) => index === self.findIndex((t) => t.barcode === b.barcode))
                          .filter(b => b.name.toLowerCase().includes(barcodeSearchQuery.toLowerCase()) || b.barcode.includes(barcodeSearchQuery))
                      : [...savedBarcodes, ...PRESET_BARCODES]
                          .filter((b, index, self) => index === self.findIndex((t) => t.barcode === b.barcode))
                          .slice(-10).reverse()
                    ).map(b => (
                      <button
                        key={b.barcode}
                        type="button"
                        onClick={() => handleBarcodeChange(b.barcode)}
                        className="w-full p-2 bg-[#121214] hover:border-indigo-500 border border-neutral-800 rounded-lg text-left text-[11px] flex flex-col justify-between transition-all"
                      >
                        <div className="flex justify-between w-full">
                          <span className="font-semibold text-neutral-300">{b.name}</span>
                          <span className="text-neutral-500 font-mono text-[9px]">{b.barcode}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Chef's Kitchen / AI Recipe Suggestion */}
          {activeTab === "recipes" && (
            <div className="space-y-6">
              
              {/* Introduction Banner */}
              <div className="p-5 bg-gradient-to-r from-indigo-950/30 to-indigo-900/15 text-white rounded-2xl border border-indigo-500/10 flex items-start gap-4">
                <div className="p-3 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                  <ChefHat className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-xl">
                  <h3 className="text-sm font-bold tracking-tight text-white">AI-Powered Recipe Studio</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    FridgeWise uses AI to formulate tailored recipes based on your exact fridge holdings. It prioritizes items expiring soonest, suggests common pantry items, and labels any missing items you need to acquire with substitutions!
                  </p>
                </div>
              </div>

              {/* Interactive Ingredient Selector Grid */}
              <div className="bg-[#121214] p-6 rounded-2xl border border-neutral-800 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Select ingredients for your recipe
                    </h4>
                    <p className="text-xs text-neutral-500">
                      We have auto-selected items expiring soonest. Check/uncheck boxes to modify.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Select all active fridge items
                      setSelectedIngredients(fridgeItems.map(i => i.id));
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
                  >
                    Select All ({fridgeItems.length})
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto p-1 border border-neutral-800 rounded-xl">
                  {fridgeItems.map(item => {
                    const isSelected = selectedIngredients.includes(item.id);
                    const days = getDaysUntilExpiry(item.expiryDate);
                    
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSelectIngredient(item.id)}
                        className={`p-3 text-left border rounded-xl flex items-center justify-between transition-all ${
                          isSelected 
                            ? "bg-indigo-950/20 border-indigo-500 shadow-xs" 
                            : "bg-[#0A0A0B] border-neutral-800 hover:border-neutral-700 text-neutral-300"
                        }`}
                      >
                        <div className="space-y-1 truncate pr-3">
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400 font-mono bg-neutral-800/60 px-1 rounded">{item.quantity}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">•</span>
                            <span className={`text-[9px] font-semibold ${
                              days < 0 
                                ? "text-rose-400" 
                                : days <= 2 
                                  ? "text-amber-400" 
                                  : "text-emerald-400"
                            }`}>
                              {days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d`}
                            </span>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "border-neutral-700"
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}

                  {fridgeItems.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-neutral-500 italic">
                      No ingredients inside your fridge to cook with. Add some groceries first!
                    </div>
                  )}
                </div>

                {/* Generate Action Button */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleGenerateRecipes}
                    disabled={isGeneratingRecipes || fridgeItems.length === 0}
                    className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingRecipes ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        AI is Curating Recipes...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300 fill-current" />
                        Formulate AI Recipes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Recipe Generation Loading State */}
              {isGeneratingRecipes && (
                <div className="bg-[#121214] border border-neutral-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-neutral-800 border-t-indigo-500 rounded-full animate-spin" />
                    <ChefHat className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white animate-pulse">Consulting FridgeWise Culinary AI...</p>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Matching your expiring spinach, dairy, and meat. This may take 5-10 seconds to generate bespoke suggestions.
                    </p>
                  </div>
                </div>
              )}

              {/* Recipe Error Alert */}
              {recipeError && (
                <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl flex gap-3 text-rose-400 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold uppercase tracking-wider">Recipe Generation Failed</h5>
                    <p className="mt-1 leading-relaxed">{recipeError}</p>
                    <p className="mt-1.5 text-[11px] text-rose-500">
                      Note: Make sure your OpenRouter API key is declared as <code>OPENROUTER_API_KEY</code> or <code>GEMINI_API_KEY</code> in the environment variables.
                    </p>
                  </div>
                </div>
              )}

              {/* Recipes suggestion list */}
              {recipes.length > 0 && !isGeneratingRecipes && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-indigo-400 fill-indigo-400/10" />
                    <h3 className="text-base font-bold font-display uppercase tracking-wider">Suggested Dishes For You</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {recipes.map((recipe, idx) => (
                      <div 
                        key={idx}
                        className="bg-[#121214] border border-neutral-800 hover:border-indigo-500 rounded-2xl p-5 flex flex-col justify-between shadow-xs transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="px-2 py-0.5 bg-indigo-950/30 text-indigo-400 text-[9px] uppercase font-bold tracking-wider rounded border border-indigo-900/40">
                              {recipe.matchPercentage}% MATCH
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {recipe.prepTime}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-white">
                            {recipe.name}
                          </h4>

                          <p className="text-xs text-neutral-400 italic line-clamp-2">
                            &ldquo;{recipe.whyThisRecipe}&rdquo;
                          </p>

                          {recipe.missingKeyIngredientsNote && (
                            <div className="p-2.5 bg-amber-950/15 border border-amber-900/25 rounded-lg text-[10px] text-amber-400 leading-relaxed">
                              💡 {recipe.missingKeyIngredientsNote}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-neutral-800/60 flex justify-end">
                          <button
                            onClick={() => setActiveRecipe(recipe)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                          >
                            Read Full Recipe
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: Wastage Stats & History Log */}
          {activeTab === "history" && (
            <div className="space-y-6">
              
              {/* Consumption & Waste Stats Dashboard */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-[#121214] border border-neutral-800 rounded-2xl p-5 shadow-xs text-center space-y-1">
                  <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Items Consumed</p>
                  <p className="text-3xl font-extrabold text-emerald-400 font-display">{usedCount}</p>
                  <p className="text-[10px] text-neutral-500">Successfully eaten / cooked</p>
                </div>

                <div className="bg-[#121214] border border-neutral-800 rounded-2xl p-5 shadow-xs text-center space-y-1">
                  <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Items Wasted</p>
                  <p className="text-3xl font-extrabold text-rose-400 font-display">{discardedCount}</p>
                  <p className="text-[10px] text-neutral-500">Discarded due to spoil</p>
                </div>

                <div className="bg-[#121214] border border-neutral-800 rounded-2xl p-5 shadow-xs text-center space-y-1">
                  <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Food Consumed Rate</p>
                  <p className={`text-3xl font-extrabold font-display ${foodSavedRate >= 70 ? "text-indigo-400" : "text-amber-500"}`}>
                    {foodSavedRate}%
                  </p>
                  <div className="w-full bg-[#0A0A0B] h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full ${foodSavedRate >= 70 ? "bg-indigo-500" : "bg-amber-500"}`} 
                      style={{ width: `${foodSavedRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* History list */}
              <div className="bg-[#121214] p-6 rounded-2xl border border-neutral-800 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold font-display text-white uppercase tracking-wider">
                    Culinary History Log
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    A record of grocery items marked as used or discarded. Restore items to fridge if marked in error.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {historyItems.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3 bg-[#0F0F11]/50 border border-neutral-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Dynamic action badge */}
                        <span className={`p-1.5 rounded-lg shrink-0 ${
                          item.action === "used" 
                            ? "bg-emerald-950/20 text-emerald-400" 
                            : "bg-rose-950/20 text-rose-400"
                        }`}>
                          {item.action === "used" ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Trash className="w-4 h-4" />
                          )}
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-0.5">
                            <span className="text-neutral-400 font-medium bg-neutral-800/60 px-1 rounded">{item.quantity}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                            <span>•</span>
                            <span>{item.loggedAt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Restore Action */}
                      <button
                        onClick={() => handleRestoreHistoryItem(item)}
                        className="px-2 py-1 bg-[#0F0F11] border border-neutral-800 hover:border-indigo-500 hover:text-indigo-400 text-neutral-400 text-[10px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                        title="Restore back to fridge"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Restore
                      </button>
                    </div>
                  ))}

                  {historyItems.length === 0 && (
                    <div className="py-12 text-center text-xs text-neutral-500 italic">
                      No consumption history recorded. Use the active fridge tab to log item consumption.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* --- Footer credit --- */}
      <footer className="mt-12 py-6 bg-[#0F0F11] border-t border-neutral-900 text-center text-xs text-neutral-600">
        <p>&copy; 2026 FridgeWise Inc. Track groceries efficiently, save money, and waste zero food.</p>
      </footer>

      {/* --- Barcode Scanner Webcam Modal --- */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        savedBarcodes={savedBarcodes}
      />

      {/* --- Recipe Details modal --- */}
      <RecipeModal
        recipe={activeRecipe}
        isOpen={activeRecipe !== null}
        onClose={() => setActiveRecipe(null)}
      />

      {/* --- Use Item Modal --- */}
      <UseItemModal
        isOpen={useItemModalConfig.isOpen}
        item={useItemModalConfig.item}
        onClose={() => setUseItemModalConfig({ isOpen: false, item: null })}
        onUsePartial={handleUsePartial}
        onUseAll={handleUseAll}
      />

    </div>
  );
}
