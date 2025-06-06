import { useState, useEffect } from "react"
import type { Meal } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Users, ChefHat, Lightbulb, CheckCircle } from "lucide-react"
import { updateMealServings, updateAllMealServings } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface RecipeViewProps {
  meal: Meal
  onBack: () => void
  servings?: number
  dayIndex: number
  mealType: string
  onServingsUpdate?: () => void
  onBulkUpdate?: () => void
}

export function RecipeView({ meal, onBack, servings = 4, dayIndex, mealType, onServingsUpdate, onBulkUpdate }: RecipeViewProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [activeServings, setActiveServings] = useState(servings)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  
  useEffect(() => {
    setActiveServings(meal.recipe.servings)
  }, [meal.recipe.servings])

  const toggleStep = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps)
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex)
    } else {
      newCompleted.add(stepIndex)
    }
    setCompletedSteps(newCompleted)
  }

  const adjustServings = (newServings: number) => {
    if (newServings < 1 || isUpdating) return
    setActiveServings(newServings)
    setHasUnsavedChanges(true)
  }

  const saveServingsChanges = async () => {
    if (!hasUnsavedChanges || isUpdating) return
    setIsUpdating(true)
    try {
      await updateMealServings({
        day_index: dayIndex,
        meal_type: mealType,
        servings: activeServings
      })
      if (onServingsUpdate) {
        onServingsUpdate()
      }
      setHasUnsavedChanges(false)
      toast({
        title: "Servings Updated",
        description: `Recipe servings updated to ${activeServings}`,
      })
    } catch (error) {
      console.error('Failed to update servings:', error)
      toast({
        title: "Error",
        description: "Failed to update servings. Please try again.",
        variant: "destructive"
      })
      
      setActiveServings(meal.recipe.servings)
      setHasUnsavedChanges(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSetAllServings = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await updateAllMealServings(activeServings)
      if (onServingsUpdate) {
        onServingsUpdate()
      }
      if (onBulkUpdate) {
        onBulkUpdate()
      }
      setHasUnsavedChanges(false)
      toast({
        title: "All Servings Updated",
        description: `All recipe servings updated to ${activeServings}`,
      })
    } catch (error) {
      console.error('Failed to update all servings:', error)
      toast({
        title: "Error",
        description: "Failed to update all servings. Please try again.",
        variant: "destructive"
      })
      
      setActiveServings(meal.recipe.servings)
      setHasUnsavedChanges(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const servingMultiplier = activeServings / meal.recipe.servings

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 border-green-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Hard":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-4 mx-2">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full p-2 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">Recipe</h2>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Recipe Title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">{meal.emoji}</span>
            <h1 className="text-xl font-bold text-slate-800">{meal.name}</h1>
          </div>
          <p className="text-sm text-slate-600">{meal.description}</p>
        </div>

        {/* Recipe Info */}
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1 text-slate-600">
            <Clock className="h-4 w-4" />
            <span>{meal.recipe.prepTime + meal.recipe.cookTime} min</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Users className="h-4 w-4" />
            <span>{meal.recipe.servings} servings</span>
          </div>
          <Badge className={`${getDifficultyColor(meal.recipe.difficulty)} border`}>{meal.recipe.difficulty}</Badge>
        </div>
      </div>

      {/* Servings Adjuster */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mx-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Adjust Servings</h3>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustServings(activeServings - 1)}
              className="rounded-full w-8 h-8 p-0"
              disabled={activeServings <= 1 || isUpdating}
            >
              -
            </Button>
            <span className="text-lg font-semibold text-purple-600 min-w-[40px] text-center">{activeServings}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustServings(activeServings + 1)}
              className="rounded-full w-8 h-8 p-0"
              disabled={isUpdating}
            >
              +
            </Button>
          </div>
        </div>
        {activeServings !== meal.recipe.servings && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-500">
              Ingredients adjusted for {activeServings} servings (originally {meal.recipe.servings})
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={saveServingsChanges}
                disabled={isUpdating || !hasUnsavedChanges}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSetAllServings}
                disabled={isUpdating}
                className="flex-1"
              >
                Set All Recipes to {activeServings}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ingredients */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mx-2">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>🥘</span>
          Ingredients
        </h3>
        <div className="space-y-3">
          {meal.recipe.ingredientDetails.map((ingredient, index) => {
            const adjustedAmount = (ingredient.amount * servingMultiplier).toFixed(
              ingredient.amount * servingMultiplier < 1 ? 2 : 1,
            )
            return (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{ingredient.name}</p>
                  {ingredient.notes && <p className="text-xs text-slate-500 mt-1">{ingredient.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-purple-600">
                    {adjustedAmount} {ingredient.unit}
                  </p>
                  {servingMultiplier !== 1 && (
                    <p className="text-xs text-slate-400">
                      (orig: {ingredient.amount} {ingredient.unit})
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cooking Instructions */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mx-2">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>👨‍🍳</span>
          Instructions
        </h3>
        <div className="space-y-4">
          {meal.recipe.instructions.map((instruction, index) => {
            const isCompleted = completedSteps.has(index)
            return (
              <div
                key={index}
                className={`flex gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                  isCompleted ? "bg-green-50 border border-green-200" : "bg-slate-50 hover:bg-slate-100"
                }`}
                onClick={() => toggleStep(index)}
              >
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-purple-100 text-purple-600 border-2 border-purple-200"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <p className={`text-slate-800 leading-relaxed ${isCompleted ? "line-through text-slate-500" : ""}`}>
                    {instruction}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress */}
        <div className="mt-6 p-4 bg-purple-50 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-purple-800">Cooking Progress</span>
            <span className="text-sm text-purple-600">
              {completedSteps.size} of {meal.recipe.instructions.length} steps
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(completedSteps.size / meal.recipe.instructions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tips & Nutrition */}
      {(meal.recipe.tips || meal.recipe.nutrition) && (
        <div className="space-y-4 mx-2">
          {/* Tips */}
          {meal.recipe.tips && meal.recipe.tips.length > 0 && (
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Pro Tips
              </h3>
              <div className="space-y-2">
                {meal.recipe.tips.map((tip, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-yellow-50 rounded-2xl">
                    <span className="text-yellow-500 mt-0.5">💡</span>
                    <p className="text-sm text-slate-700">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition */}
          {meal.recipe.nutrition && (
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span>📊</span>
                Nutrition (per serving)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-2xl">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(meal.recipe.nutrition.calories * servingMultiplier)}
                  </p>
                  <p className="text-sm text-blue-800">Calories</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-2xl">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(meal.recipe.nutrition.protein * servingMultiplier)}g
                  </p>
                  <p className="text-sm text-green-800">Protein</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-2xl">
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.round(meal.recipe.nutrition.carbs * servingMultiplier)}g
                  </p>
                  <p className="text-sm text-orange-800">Carbs</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-2xl">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(meal.recipe.nutrition.fat * servingMultiplier)}g
                  </p>
                  <p className="text-sm text-purple-800">Fat</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completion */}
      {completedSteps.size === meal.recipe.instructions.length && (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mx-2">
          <div className="text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h3 className="text-lg font-bold text-slate-800">Recipe Complete!</h3>
            <p className="text-sm text-slate-600">Enjoy your delicious {meal.name}!</p>
            <Button
              onClick={onBack}
              className="mt-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-2xl"
            >
              Back to Meal Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
