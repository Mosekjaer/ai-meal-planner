import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { UserPreferences, Ingredient } from "@/lib/types"
import IngredientSelector from "./ingredient-selector"
import { Sparkles, ChefHat } from "lucide-react"

interface UserInputSectionProps {
  onSubmit: (preferences: UserPreferences) => void
  isLoading: boolean
}

export function UserInputSection({ onSubmit, isLoading }: UserInputSectionProps) {
  const [preferences, setPreferences] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [complexity, setComplexity] = useState<"simple" | "medium" | "complex">("medium")
  const [selectedMealTypes, setSelectedMealTypes] = useState<("breakfast" | "lunch" | "dinner")[]>(["breakfast", "lunch", "dinner"])
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMealTypes.length === 0) {
      alert("Please select at least one meal type")
      return
    }
    console.log('Submitting preferences:', {
      dietary_restrictions: preferences.split(",").map(s => s.trim()).filter(Boolean),
      calories_per_day: 2000,
      meal_complexity: complexity === "simple" ? "Easy" : complexity === "complex" ? "Hard" : "Medium",
      cuisine_preferences: [],
      meal_types: selectedMealTypes
    });
    onSubmit({
      dietary_restrictions: preferences.split(",").map(s => s.trim()).filter(Boolean),
      calories_per_day: 2000,
      meal_complexity: complexity === "simple" ? "Easy" : complexity === "complex" ? "Hard" : "Medium",
      cuisine_preferences: [],
      meal_types: selectedMealTypes
    })
  }

  const handleMealTypeToggle = (mealType: "breakfast" | "lunch" | "dinner") => {
    setSelectedMealTypes(prev => {
      if (prev.includes(mealType)) {
        return prev.filter(type => type !== mealType)
      } else {
        return [...prev, mealType]
      }
    })
  }

  const quickPreferences = [
    { text: "Vegetarian meals only", emoji: "🥬" },
    { text: "Budget-friendly options", emoji: "💰" },
    { text: "Quick 30-min meals", emoji: "⏰" },
    { text: "High protein diet", emoji: "💪" },
    { text: "Gluten-free options", emoji: "🌾" },
    { text: "Family-friendly meals", emoji: "👨‍👩‍👧‍👦" },
  ]

  const handleQuickSelect = (text: string) => {
    setPreferences((prev) => (prev ? `${prev}, ${text}` : text))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-purple-600" />
          <label className="text-base font-semibold text-slate-800">Tell us your preferences</label>
        </div>

        {/* Quick Selection Pills */}
        <div className="grid grid-cols-2 gap-2">
          {quickPreferences.map((pref, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleQuickSelect(pref.text)}
              className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-purple-50 rounded-2xl text-left text-sm font-medium text-slate-700 hover:text-purple-700 transition-colors border border-transparent hover:border-purple-200"
            >
              <span className="text-lg">{pref.emoji}</span>
              <span className="text-xs leading-tight">{pref.text}</span>
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Describe your dietary needs, cooking style, or any specific requirements..."
          className="min-h-[120px] text-base rounded-2xl border-slate-200 focus:border-purple-300 focus:ring-purple-200 resize-none"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          required
        />
      </div>

      {/* Meal Types Selection */}
      <div className="space-y-3">
        <label className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <span>🍽️</span>
          Which meals do you want to plan?
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleMealTypeToggle("breakfast")}
            className={`p-3 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              selectedMealTypes.includes("breakfast")
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-transparent hover:border-purple-200"
            }`}
          >
            <span>🍳</span>
            Breakfast
          </button>
          <button
            type="button"
            onClick={() => handleMealTypeToggle("lunch")}
            className={`p-3 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              selectedMealTypes.includes("lunch")
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-transparent hover:border-purple-200"
            }`}
          >
            <span>🥪</span>
            Lunch
          </button>
          <button
            type="button"
            onClick={() => handleMealTypeToggle("dinner")}
            className={`p-3 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              selectedMealTypes.includes("dinner")
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-transparent hover:border-purple-200"
            }`}
          >
            <span>🍲</span>
            Dinner
          </button>
        </div>
      </div>

      {/* Meal Complexity */}
      <div className="space-y-3">
        <label className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <span>👩‍🍳</span>
          Meal Complexity
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setComplexity("simple")}
            className={`p-3 rounded-2xl text-sm font-medium transition-colors ${
              complexity === "simple"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-transparent hover:border-purple-200"
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setComplexity("medium")}
            className={`p-3 rounded-2xl text-sm font-medium transition-colors ${
              complexity === "medium"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-transparent hover:border-purple-200"
            }`}
          >
            Medium
          </button>
          <button
            type="button"
            onClick={() => setComplexity("complex")}
            className={`p-3 rounded-2xl text-sm font-medium transition-colors ${
              complexity === "complex"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : "bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-transparent hover:border-purple-200"
            }`}
          >
            Complex
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <span>🥘</span>
          What's in your kitchen?
        </label>
        <IngredientSelector selectedIngredients={ingredients} onChange={setIngredients} />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          className="flex-1 h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          disabled={isLoading || !preferences.trim()}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Generate My Meal Plan
        </Button>
{/* 
        <Button
          type="button"
          variant="destructive"
          className="h-14 px-4 rounded-2xl hover:bg-red-700 transition-colors"
          onClick={handleReset}
          disabled={isDeleting}
        >
          <Trash2 className="h-5 w-5" />
        </Button> */}
      </div>
    </form>
  )
}
