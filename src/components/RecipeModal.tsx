import { X, Clock, Award, Sparkles, AlertCircle, CheckCircle, BookOpen } from "lucide-react";
import { Recipe } from "../types";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeModal({ recipe, isOpen, onClose }: RecipeModalProps) {
  if (!isOpen || !recipe) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0F0F11] rounded-2xl shadow-2xl border border-neutral-850 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header Banner */}
        <div className="relative p-6 bg-gradient-to-r from-indigo-950 to-indigo-900 border-b border-neutral-850 text-white flex justify-between items-start">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-900/40 text-[10px] text-indigo-300 uppercase font-bold tracking-wider rounded-md border border-indigo-500/20">
                {recipe.difficulty} Difficulty
              </span>
              <span className="px-2 py-0.5 bg-indigo-600 text-[10px] text-white uppercase font-bold tracking-wider rounded-md border border-indigo-450 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                {recipe.matchPercentage}% Match
              </span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{recipe.name}</h3>
            <p className="text-xs text-neutral-400 italic leading-relaxed">
              &ldquo;{recipe.whyThisRecipe}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0F0F11]">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-[#121214] rounded-xl border border-neutral-800">
              <Clock className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-neutral-500">Prep Time</p>
                <p className="text-sm font-semibold text-neutral-200">{recipe.prepTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#121214] rounded-xl border border-neutral-800">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-neutral-500">Cook Time</p>
                <p className="text-sm font-semibold text-neutral-200">{recipe.cookTime}</p>
              </div>
            </div>
          </div>

          {/* Missing items warnings / substitutions (Mandatory spec requirement) */}
          {recipe.missingKeyIngredientsNote && (
            <div className="p-4 bg-amber-950/15 border border-amber-900/25 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Note on Missing Ingredients</h4>
                <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                  {recipe.missingKeyIngredientsNote}
                </p>
              </div>
            </div>
          )}

          {/* Ingredients list split */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Ingredients</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* From Fridge */}
              <div className="p-4 bg-emerald-950/10 rounded-xl border border-emerald-900/20">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs mb-2.5 uppercase tracking-wider">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  From Your Fridge
                </div>
                <ul className="space-y-1.5 text-xs text-neutral-300">
                  {recipe.ingredients.fromFridge.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      {ing}
                    </li>
                  ))}
                  {recipe.ingredients.fromFridge.length === 0 && (
                    <li className="text-neutral-500 italic">No fridge ingredients used.</li>
                  )}
                </ul>
              </div>

              {/* Missing or Pantry */}
              <div className="p-4 bg-[#121214] rounded-xl border border-neutral-800">
                <div className="flex items-center gap-1.5 text-neutral-300 font-semibold text-xs mb-2.5 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-neutral-500" />
                  Pantry Essentials & Missing
                </div>
                <ul className="space-y-1.5 text-xs text-neutral-300">
                  {recipe.ingredients.missingOrPantry.map((ing, i) => {
                    const isMissing = ing.toLowerCase().includes("missing");
                    return (
                      <li key={i} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isMissing ? "bg-amber-400" : "bg-neutral-600"}`} />
                          {ing}
                        </span>
                      </li>
                    );
                  })}
                  {recipe.ingredients.missingOrPantry.length === 0 && (
                    <li className="text-neutral-500 italic">No extra ingredients needed.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Cooking Instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Directions</h4>
            <ol className="space-y-4">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-950/50 border border-indigo-900/30 text-indigo-400 text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed mt-0.5">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0F0F11] border-t border-neutral-850 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors"
          >
            Close Recipe
          </button>
        </div>

      </div>
    </div>
  );
}
