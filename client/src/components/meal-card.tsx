import { useState, useEffect } from "react"
import type { Meal } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Edit2, Loader2, Clock, Users, ChefHat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RecipeView } from "./recipe-view"
import { getMealDetails } from "@/lib/api"

interface MealCardProps {
  meal: Meal | null
  dayIndex: number
  mealType: string
  onUpdate: (request: string) => void
  isUpdating: boolean
  onBulkUpdate?: () => void
}

export function MealCard({ meal, dayIndex, mealType, onUpdate, isUpdating, onBulkUpdate }: MealCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showRecipe, setShowRecipe] = useState(false)
  const [mealDetails, setMealDetails] = useState<Meal | null>(null)
  const [,setLoading] = useState(false)
  const [updateRequest, setUpdateRequest] = useState("")

  useEffect(() => {
    if (meal && !showRecipe) {
      setMealDetails(null)
    }
  }, [meal, showRecipe])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (updateRequest.trim()) {
      onUpdate(updateRequest)
      setIsDialogOpen(false)
      setUpdateRequest("")
    }
  }

  const handleViewRecipe = async () => {
    setLoading(true)
    try {
      const response = await getMealDetails(dayIndex, mealType)
      setMealDetails(response.data)
      setShowRecipe(true)
    } catch (error) {
      console.error("Failed to fetch meal details:", error)
      
    } finally {
      setLoading(false)
    }
  }

  const quickChanges = [
    "Make it vegetarian",
    "Make it spicier",
    "Use less ingredients",
    "Make it healthier",
    "Quick 15-min version",
  ]

  if (showRecipe && mealDetails) {
    return (
      <RecipeView
        meal={mealDetails}
        onBack={() => setShowRecipe(false)}
        dayIndex={dayIndex}
        mealType={mealType}
        onServingsUpdate={handleViewRecipe}
        onBulkUpdate={onBulkUpdate}
      />
    )
  }

  if (!meal) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
        <div className="text-center space-y-4">
          <div className="text-slate-400">No meal planned</div>
          <Button
            onClick={() => onUpdate("Generate a meal")}
            disabled={isUpdating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Meal"
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200" onClick={handleViewRecipe}>
        {/* Meal Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{meal.emoji}</span>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{meal.name}</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{meal.description}</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-3 hover:bg-purple-50 hover:text-purple-700 shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setIsDialogOpen(true)
              }}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Edit2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Meal Details */}
        <div className="px-6 pb-6 space-y-4">
          {/* Quick Info */}
          <div className="flex gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{meal.recipe.prepTime + meal.recipe.cookTime} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{meal.recipe.servings} servings</span>
            </div>
            <div className="flex items-center gap-1">
              <ChefHat className="h-3 w-3" />
              <span>{meal.recipe.difficulty}</span>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ingredients</p>
            <div className="flex flex-wrap gap-1.5">
              {meal.recipe.ingredientDetails.slice(0, 6).map((ingredient, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs py-1 px-2 bg-slate-50 text-slate-700 border-slate-200 rounded-full"
                >
                  {ingredient.name}
                </Badge>
              ))}
              {meal.recipe.ingredientDetails.length > 6 && (
                <Badge
                  variant="outline"
                  className="text-xs py-1 px-2 bg-slate-50 text-slate-500 border-slate-200 rounded-full"
                >
                  +{meal.recipe.ingredientDetails.length - 6} more
                </Badge>
              )}
            </div>
          </div>

          {/* Click to view recipe hint */}
          <div className="text-center pt-2">
            <p className="text-xs text-purple-600 font-medium">👆 Tap to view full recipe</p>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-bold">Customize this meal</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Meal */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{meal.emoji}</span>
                <p className="font-medium text-slate-800">{meal.name}</p>
              </div>
            </div>

            {/* Quick Changes */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Quick changes:</p>
              <div className="grid grid-cols-1 gap-2">
                {quickChanges.map((change, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setUpdateRequest(change)}
                    className="text-left p-3 bg-slate-50 hover:bg-purple-50 rounded-2xl text-sm text-slate-700 hover:text-purple-700 transition-colors border border-transparent hover:border-purple-200"
                  >
                    {change}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Request */}
            <div className="space-y-2">
              <label htmlFor="update-request" className="text-sm font-medium text-slate-700">
                Or describe your own change:
              </label>
              <Textarea
                id="update-request"
                placeholder="e.g., 'replace chicken with tofu' or 'add more vegetables'"
                value={updateRequest}
                onChange={(e) => setUpdateRequest(e.target.value)}
                className="min-h-[100px] rounded-2xl border-slate-200 focus:border-purple-300 focus:ring-purple-200 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 h-12 rounded-2xl border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!updateRequest.trim() || isUpdating}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Meal"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
