import { useState, useEffect } from "react"
import { UserInputSection } from "./user-input-section"
import { MealPlanDisplay } from "./meal-plan-display"
import { generateMealPlan, generateMealPlanForWeek, getCurrentWeekMealPlan, getSpecificWeekMealPlan, updateMealInPlan, getUserIngredients } from "@/lib/api"
import type { MealPlan, UserPreferences, Ingredient } from "@/lib/types"
import { Loader2, Sparkles, ArrowLeft } from "lucide-react"
import { useApi } from '../hooks/useApi'
import { Button } from "@/components/ui/button"

export function MealPlanner() {
  const [currentStep, setCurrentStep] = useState<"input" | "plan">("input")
  const [, setUserPreferences] = useState<UserPreferences | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<'previous' | 'current' | 'next'>('current')
  const [weekInfo, setWeekInfo] = useState<{ year: number; weekNumber: number } | null>(null)

  const { data: currentMealPlan, loading: loadingPlan, execute: fetchCurrentPlan } = useApi<MealPlan>(getCurrentWeekMealPlan)
  const { data: ingredients, loading: loadingIngredients, execute: fetchIngredients } = useApi<Ingredient[]>(getUserIngredients)
  const { execute: generatePlan } = useApi(generateMealPlan)
  const { execute: generateWeekPlan } = useApi(generateMealPlanForWeek)
  const { execute: updateMeal } = useApi(updateMealInPlan)
  const { execute: fetchSpecificWeek } = useApi(getSpecificWeekMealPlan)

  
  useEffect(() => {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil(days / 7)
    
    setWeekInfo({
      year: now.getFullYear(),
      weekNumber: weekNumber
    })
  }, [])

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([fetchCurrentPlan(), fetchIngredients()])
      } finally {
        setInitialLoading(false)
      }
    }
    loadInitialData()
  }, [fetchCurrentPlan, fetchIngredients])

  
  useEffect(() => {
    if (currentMealPlan) {
      setCurrentStep("plan")
    }
  }, [currentMealPlan])

  const handleGeneratePlan = async (preferences: UserPreferences) => {
    setIsGenerating(true)
    setUserPreferences(preferences)

    try {
      console.log('Generating plan with preferences:', preferences);
      if (selectedWeek === 'current') {
        const response = await generatePlan({
          dietary_restrictions: preferences.dietary_restrictions,
          calories_per_day: preferences.calories_per_day,
          meal_complexity: preferences.meal_complexity,
          cuisine_preferences: preferences.cuisine_preferences,
          meal_types: preferences.meal_types
        }, 7);
        console.log('Generated current week plan:', response);
        await fetchCurrentPlan()
      } else if (weekInfo) {
        const weekOffset = selectedWeek === 'previous' ? -1 : 1
        const targetWeek = {
          year: weekInfo.year,
          weekNumber: weekInfo.weekNumber + weekOffset
        }
        
        const response = await generateWeekPlan({
          dietary_restrictions: preferences.dietary_restrictions,
          calories_per_day: preferences.calories_per_day,
          meal_complexity: preferences.meal_complexity,
          cuisine_preferences: preferences.cuisine_preferences,
          meal_types: preferences.meal_types,
          week_info: {
            year: targetWeek.year,
            week_number: targetWeek.weekNumber
          }
        }, 7); 
        console.log('Generated specific week plan:', response);
        await fetchSpecificWeek(targetWeek.year, targetWeek.weekNumber)
      }
      setCurrentStep("plan")
    } catch (error) {
      console.error('Failed to generate meal plan:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateMeal = async (dayIndex: number, mealType: string, request: string) => {
    if (!mealPlan && !currentMealPlan) return

    setIsGenerating(true)
    try {
      await updateMeal({ day_index: dayIndex, meal_type: mealType, request })
      const updatedPlan = await fetchCurrentPlan()
      if (updatedPlan.data) {
        setMealPlan(updatedPlan.data)
      }
    } catch (error) {
      console.error('Failed to update meal:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleWeekChange = async (week: 'previous' | 'current' | 'next') => {
    if (!weekInfo) return
    
    console.log('Week change initiated:', { 
      week, 
      weekInfo, 
      currentState: { 
        mealPlan, 
        currentMealPlan,
        selectedWeek 
      } 
    })
    setSelectedWeek(week)
    setIsGenerating(true)
    
    try {
      if (week === 'current') {
        console.log('Fetching current week plan')
        const response = await fetchCurrentPlan()
        console.log('Current week plan response:', response)
        if (response.data) {
          console.log('Setting meal plan to null and using currentMealPlan')
          setMealPlan(null) 
        }
      } else {
        const weekOffset = week === 'previous' ? -1 : 1
        const targetWeek = {
          year: weekInfo.year,
          weekNumber: weekInfo.weekNumber + weekOffset
        }
        
        console.log('Fetching specific week plan:', targetWeek)
        try {
          const response = await getSpecificWeekMealPlan(targetWeek.year, targetWeek.weekNumber)
          console.log('Direct API response:', response)
          
          if (response && 'data' in response && response.data) {
            console.log('Setting specific week meal plan:', {
              responseData: response.data,
              hasDinner: response.data.days[0]?.dinner?.name
            })
            
            setMealPlan(response.data)
          }
        } catch (error: any) {
          console.error('Error fetching specific week:', error)
          setMealPlan({
            days: Array(7).fill({
              breakfast: null,
              lunch: null,
              dinner: null
            }),
            week_number: targetWeek.weekNumber,
            year: targetWeek.year,
            _timestamp: Date.now()
          })
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch meal plan:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBackToInput = () => {
    setCurrentStep("input")
  }

  const handleBulkUpdate = async () => {
    setIsGenerating(true)
    try {
      await fetchCurrentPlan()
    } catch (error) {
      console.error('Failed to refresh meal plan after bulk update:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  
  const activeMealPlan = (() => {
    console.log('Determining active meal plan:', {
      selectedWeek,
      hasMealPlan: !!mealPlan,
      hasCurrentMealPlan: !!currentMealPlan,
      mealPlanData: mealPlan,
      currentMealPlanData: currentMealPlan,
      timestamp: mealPlan?._timestamp,
      isGenerating,
      mealPlanDinner: mealPlan?.days[0]?.dinner?.name,
      currentMealPlanDinner: currentMealPlan?.days[0]?.dinner?.name
    })
    
    if (selectedWeek === 'current') {
      return currentMealPlan;
    }
    
    return mealPlan;
  })();

  
  const isLoading = isGenerating || loadingPlan || (selectedWeek !== 'current' && !mealPlan && !activeMealPlan);

  
  useEffect(() => {
    console.log('Meal plan updated:', { mealPlan, currentMealPlan, selectedWeek })
  }, [mealPlan, currentMealPlan, selectedWeek]);

  const availableIngredients = ingredients || []

  if (initialLoading || loadingIngredients) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Meal Planner
            </h1>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 mx-2">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-pulse"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Loading Your Data</h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p className={loadingPlan ? "opacity-100" : "opacity-50"}>
                  {loadingPlan ? "Checking for existing meal plan..." : "✓ Meal plan check complete"}
                </p>
                <p className={loadingIngredients ? "opacity-100" : "opacity-50"}>
                  {loadingIngredients ? "Loading your ingredients..." : "✓ Ingredients loaded"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            AI Meal Planner
          </h1>
        </div>
        <p className="text-sm text-slate-600 px-4">Get personalized weekly meals tailored just for you</p>
      </div>

      {/* Loading State */}
      {isGenerating && currentStep === "input" && (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 mx-2">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-pulse"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Creating Your Plan</h3>
              <p className="text-sm text-slate-600">Our AI is crafting the perfect meals for you...</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Section */}
      {currentStep === "input" && !isGenerating && (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mx-2">
          <div className="flex justify-between items-center mb-4">
            {(currentMealPlan || mealPlan) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentStep("plan")
                  if (selectedWeek === 'current') {
                    setSelectedWeek('current')
                  }
                }}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <div className="w-9 h-9" />
            )}

            <div className="flex-grow text-center">
              <h2 className="text-lg font-semibold text-slate-800">
                {selectedWeek === 'next' 
                  ? "Plan Next Week's Meals"
                  : currentMealPlan 
                  ? "Update Current Week's Plan"
                  : "Generate Meal Plan"}
              </h2>
            </div>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>
          <UserInputSection onSubmit={handleGeneratePlan} isLoading={isGenerating} />
        </div>
      )}

      {/* Meal Plan Display */}
      {currentStep === "plan" && (
        <MealPlanDisplay
          key={`${selectedWeek}-${activeMealPlan?.week_number}-${activeMealPlan?.year}`}
          mealPlan={activeMealPlan || {
            days: Array(7).fill({
              breakfast: null,
              lunch: null,
              dinner: null
            }),
            week_number: weekInfo?.weekNumber || 0,
            year: weekInfo?.year || 0
          }}
          availableIngredients={availableIngredients}
          onUpdateMeal={handleUpdateMeal}
          isUpdating={isGenerating}
          onBackToInput={handleBackToInput}
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          onBulkUpdate={handleBulkUpdate}
          hasExistingPlan={!!currentMealPlan}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

