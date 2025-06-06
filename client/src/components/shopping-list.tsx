import { useState, useEffect, useCallback } from "react"
import type { MealPlan, Ingredient, ShoppingItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShoppingCart, Check, Plus, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getCurrentShoppingList, getWeekShoppingList, updateShoppingItemStatus } from '../lib/api'

interface ShoppingListProps {
  mealPlan: MealPlan
  availableIngredients: Ingredient[]
  onBack: () => void
}

const categoryEmojis: Record<string, string> = {
  Proteins: "🥩",
  Vegetables: "🥬",
  Fruits: "🍎",
  Dairy: "🥛",
  Grains: "🌾",
  Pantry: "🥫",
  Spices: "🧂",
  Other: "🛒",
}


const roundQuantity = (value: number): number => {
  
  return Math.ceil(value * 2) / 2;
}

export function ShoppingList({ mealPlan, availableIngredients, onBack }: ShoppingListProps) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)

  
  const fetchShoppingList = useCallback(async () => {
    try {
      setLoading(true)
      let response
      if (mealPlan.week_number && mealPlan.year) {
        response = await getWeekShoppingList(mealPlan.year, mealPlan.week_number)
      } else {
        response = await getCurrentShoppingList()
      }
      
      if (response) {
        
        const aggregatedItems = response.reduce<Record<string, ShoppingItem>>((acc, item) => {
          const key = `${item.name?.toLowerCase()}-${item.unit}`
          
          if (acc[key]) {
            
            acc[key] = {
              ...acc[key],
              needed: acc[key].needed + item.needed,
              quantity: acc[key].quantity + (item.quantity || 0),
              
              bought: acc[key].bought || item.bought
            }
          } else {
            
            acc[key] = { ...item }
          }
          
          return acc
        }, {})

        
        const aggregatedArray: ShoppingItem[] = Object.values(aggregatedItems)
        console.log('Aggregated shopping items:', aggregatedArray)
        setShoppingItems(aggregatedArray)
      } else {

      }
    } catch (error) {
      console.error('Error fetching shopping list:', error)

    } finally {
      setLoading(false)
    }
  }, [mealPlan.week_number, mealPlan.year, mealPlan, availableIngredients])

  
  useEffect(() => {
    fetchShoppingList()
  }, [fetchShoppingList])

  const handleToggleCheck = async (itemId: number, bought: boolean) => {
    try {
      await updateShoppingItemStatus(itemId, !bought)
      setShoppingItems(items =>
        items.map(item =>
          item.id === itemId ? { ...item, bought: !bought } : item
        )
      )
    } catch (error) {
      console.error('Failed to update item status:', error)
      
    }
  }

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) return

    setShoppingItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, needed: newQuantity } : item))
    )
  }

  
  const groupedItems = shoppingItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ShoppingItem[]>
  )

  const totalItems = shoppingItems.length
  const checkedCount = shoppingItems.filter(item => item.bought).length
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          <p className="text-slate-600">Loading shopping list...</p>
        </div>
      </div>
    )
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
            <ShoppingCart className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">Shopping List</h2>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Progress</span>
            <span className="font-medium text-slate-800">
              {checkedCount} of {totalItems} items
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Shopping Items by Category */}
      <div className="space-y-4 px-2">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={`category-${category}`} className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Category Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">{categoryEmojis[category] || "🛒"}</span>
                <h3 className="font-semibold text-slate-800">{category}</h3>
                <Badge variant="secondary" className="ml-auto bg-slate-200 text-slate-600">
                  {items.length} items
                </Badge>
              </div>
            </div>

            {/* Category Items */}
            <div className="p-4 space-y-3">
              {items.map((item) => {
                const hasEnough = item.quantity >= item.needed

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                      item.bought ? "bg-green-50 border border-green-200" : "bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {/* Checkbox */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleCheck(item.id, item.bought)}
                      className={`h-8 w-8 p-0 rounded-full border-2 transition-all ${
                        item.bought
                          ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                          : "border-slate-300 hover:border-purple-300 hover:bg-purple-50"
                      }`}
                    >
                      {item.bought && <Check className="h-4 w-4" />}
                    </Button>

                    {/* Item Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${item.bought ? "text-green-800 line-through" : "text-slate-800"}`}>
                          {item.name || "Unknown Item"}
                        </p>
                        {hasEnough && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Have some
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-600">
                          {item.name ? (
                            <>Need: {roundQuantity(item.needed)} {item.unit}</>
                          ) : (
                            "Missing ingredient information"
                          )}
                        </p>
                        {item.quantity > 0 && (
                          <p className="text-xs text-slate-500">
                            (Have: {roundQuantity(item.quantity)} {item.unit})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.needed - 1)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                        disabled={item.needed <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>

                      <span className="text-sm font-medium min-w-[40px] text-center">{roundQuantity(item.needed)}</span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.needed + 1)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mx-2">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-slate-800">Shopping Summary</h3>
          <p className="text-sm text-slate-600">
            {checkedCount === totalItems
              ? "🎉 All done! You're ready to cook!"
              : `${totalItems - checkedCount} items left to get`}
          </p>
          {checkedCount === totalItems && (
            <Button
              onClick={onBack}
              className="mt-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-2xl"
            >
              Back to Meal Plan
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}