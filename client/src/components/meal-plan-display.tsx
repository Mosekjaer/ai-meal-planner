import { useState, useEffect } from "react"
import type { MealPlan, Ingredient } from "@/lib/types"
import { MealCard } from "./meal-card"
import { ShoppingList } from "./shopping-list"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, ShoppingCart, Sparkles, UtensilsCrossed, Loader2 } from "lucide-react"

interface MealPlanDisplayProps {
  mealPlan: MealPlan
  availableIngredients: Ingredient[]
  onUpdateMeal: (dayIndex: number, mealType: string, request: string) => void
  isUpdating: boolean
  onBackToInput: () => void
  selectedWeek: 'previous' | 'current' | 'next'
  onWeekChange: (week: 'previous' | 'current' | 'next') => void
  onBulkUpdate?: () => void
  hasExistingPlan?: boolean
  isLoading?: boolean
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
]

export function MealPlanDisplay({
  mealPlan,
  availableIngredients,
  onUpdateMeal,
  isUpdating,
  onBackToInput,
  selectedWeek,
  onWeekChange,
  onBulkUpdate,
  isLoading
}: MealPlanDisplayProps) {
  const [activeDay, setActiveDay] = useState(0)
  const [showShoppingList, setShowShoppingList] = useState(false)

  const nextDay = () => {
    setActiveDay((prev) => (prev + 1) % 7)
  }

  const prevDay = () => {
    setActiveDay((prev) => (prev - 1 + 7) % 7)
  }

  const hasAnyMealsForWeek = mealPlan.days.some((day, index) => {
    if (!day) {
      console.log(`Day ${index} is null/undefined`)
      return false
    }

    const hasMeals = (
      (day.breakfast && day.breakfast.name) || 
      (day.lunch && day.lunch.name) || 
      (day.dinner && day.dinner.name)
    )

    console.log(`Checking day ${index} for meals:`, {
      day,
      hasBreakfast: !!day?.breakfast?.name,
      hasLunch: !!day?.lunch?.name,
      hasDinner: !!day?.dinner?.name,
      hasMeals
    })
    return hasMeals
  })

  useEffect(() => {
    console.log('MealPlanDisplay mounted/updated:', {
      mealPlan,
      hasAnyMealsForWeek,
      days: mealPlan.days
    })
  }, [mealPlan])

  
  useEffect(() => {
    if (!hasAnyMealsForWeek) {
      setShowShoppingList(false)
    }
  }, [hasAnyMealsForWeek])

  console.log('MealPlanDisplay render:', {
    hasAnyMealsForWeek,
    mealPlan,
    selectedWeek,
    showShoppingList
  })

  if (showShoppingList && hasAnyMealsForWeek) {
    return (
      <ShoppingList
        mealPlan={mealPlan}
        availableIngredients={availableIngredients}
        onBack={() => setShowShoppingList(false)}
      />
    )
  }

  
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 mx-2">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-slate-800">Loading Meal Plan</h3>
            <p className="text-sm text-slate-600">Fetching your meals...</p>
          </div>
        </div>
      </div>
    )
  }

  
  const getSortedMealTypes = (day: any) => {
    return MEAL_TYPES.sort((a, b) => {
      const aMeal = day[a.key as keyof typeof day]
      const bMeal = day[b.key as keyof typeof day]
      if (!!aMeal === !!bMeal) return 0
      return !!aMeal ? -1 : 1
    })
  }

  return (
    <div className="space-y-4">
      {/* Week Selector */}
      <div className="relative mx-2">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 rounded-full"></div>
        <div className="relative flex justify-between items-center bg-white rounded-full p-1 shadow-sm border border-purple-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWeekChange('previous')}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
              selectedWeek === 'previous' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:text-white shadow-md' 
                : 'text-slate-600 hover:text-purple-600'
            }`}
            disabled={isUpdating}
          >
            Last Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWeekChange('current')}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
              selectedWeek === 'current'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:text-white shadow-md' 
                : 'text-slate-600 hover:text-purple-600'
            }`}
            disabled={isUpdating}
          >
            This Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWeekChange('next')}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
              selectedWeek === 'next'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:text-white shadow-md' 
                : 'text-slate-600 hover:text-purple-600'
            }`}
            disabled={isUpdating}
          >
            Next Week
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-4 mx-2">
        <div className="flex items-center justify-between mb-4">
          {/* Show AI button for current and next week, nothing for previous week */}
          {selectedWeek === 'previous' ? (
            <div className="w-10" /> 
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBackToInput} 
              className="rounded-full p-2 hover:bg-purple-100 text-purple-600"
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">Your Meal Plan</h2>
          </div>
          
          {hasAnyMealsForWeek ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShoppingList(true)}
              className="rounded-full p-2 hover:bg-purple-50 hover:text-purple-700"
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" /> 
          )}
        </div>

        {/* Day Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevDay} className="rounded-full p-2 hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800">{DAYS[activeDay]}</h3>
            <p className="text-sm text-slate-500">Day {activeDay + 1} of 7</p>
          </div>

          <Button variant="ghost" size="sm" onClick={nextDay} className="rounded-full p-2 hover:bg-slate-100">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Day Dots Indicator */}
        <div className="flex justify-center gap-2 mt-4">
          {DAYS.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveDay(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === activeDay ? "bg-purple-600 w-6" : "bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!hasAnyMealsForWeek && (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 mx-2 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="h-8 w-8 text-purple-600" />
              </div>
              <div className="absolute -inset-2 bg-purple-100 rounded-full opacity-20 animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">No Meal Plan Yet</h3>
              <p className="text-sm text-slate-600">
                {selectedWeek === 'next' 
                  ? "Ready to plan next week's meals? Click the sparkle button to get started!"
                  : selectedWeek === 'previous'
                  ? "No meals were planned for last week."
                  : "Click the sparkle button to generate your meal plan!"}
              </p>
            </div>
            {selectedWeek === 'next' && (
              <Button
                onClick={onBackToInput}
                className="mt-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Meal Plan
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Meals for Active Day */}
      {hasAnyMealsForWeek && (
        <div className="space-y-4 px-2">
          {getSortedMealTypes(mealPlan.days[activeDay] || { breakfast: null, lunch: null, dinner: null }).map((mealType) => {
            const day = mealPlan.days[activeDay] || { breakfast: null, lunch: null, dinner: null }
            const meal = day[mealType.key as keyof typeof day] || null
            return (
              <div key={mealType.key} className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <span className="text-lg">{mealType.emoji}</span>
                  <h3 className="text-lg font-semibold text-slate-800">{mealType.label}</h3>
                </div>
                <MealCard
                  meal={meal}
                  dayIndex={activeDay}
                  mealType={mealType.key}
                  onUpdate={(request) => onUpdateMeal(activeDay, mealType.key, request)}
                  isUpdating={isUpdating}
                  onBulkUpdate={onBulkUpdate}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Action Buttons - Only show if there are meals */}
      {hasAnyMealsForWeek && (
        <div className="px-2 space-y-3">
          <Button
            onClick={() => setShowShoppingList(true)}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Shopping List
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-700"
            onClick={() => onWeekChange('current')}
            disabled={selectedWeek === 'current'}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Back to Current Week
          </Button>
        </div>
      )}
    </div>
  )
}
