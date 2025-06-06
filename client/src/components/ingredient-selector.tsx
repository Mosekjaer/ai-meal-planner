"use client"

import { useState, useEffect } from "react"
import { Plus, X, Minus, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Ingredient } from "@/lib/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useApi } from '../hooks/useApi'
import { getCommonIngredients, getUserIngredients, addUserIngredient, updateUserIngredient, deleteUserIngredient } from '../lib/api'

interface IngredientSelectorProps {
  selectedIngredients: Ingredient[]
  onChange: (ingredients: Ingredient[]) => void
}

interface CommonIngredient {
  name: string
  emoji: string
  defaultUnit: string
}

const units = ["pieces", "lbs", "cups", "boxes", "dozen", "gallons", "loaves", "bulbs", "blocks", "oz", "tbsp", "tsp"]

export default function IngredientSelector({ selectedIngredients, onChange }: IngredientSelectorProps) {
  const { data: commonIngredients, loading: loadingCommon, execute: fetchCommonIngredients } = useApi<CommonIngredient[]>(getCommonIngredients)
  const { loading: loadingUser, execute: fetchUserIngredients } = useApi<Ingredient[]>(getUserIngredients)
  const { execute: addIngredient } = useApi(addUserIngredient)
  const { execute: updateIngredient } = useApi(updateUserIngredient)
  const { execute: deleteIngredient } = useApi(deleteUserIngredient)

  const [customIngredient, setCustomIngredient] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  useEffect(() => {
    fetchCommonIngredients()
    fetchUserIngredients()
  }, [fetchCommonIngredients, fetchUserIngredients])

  const handleSelect = (ingredientData: CommonIngredient) => {
    if (!selectedIngredients.some((item) => item.name === ingredientData.name)) {
      const newIngredient: Ingredient = {
        name: ingredientData.name,
        quantity: 1,
        unit: ingredientData.defaultUnit,
      }
      handleAddIngredient(newIngredient)
    }
  }

  const handleAddIngredient = async (ingredient: Ingredient) => {
    try {
      await addIngredient(ingredient)
      await fetchUserIngredients()
      onChange([...selectedIngredients, ingredient])
    } catch (error) {
      console.error('Failed to add ingredient:', error)
    }
  }

  const handleRemove = async (ingredientName: string) => {
    try {
      await deleteIngredient(ingredientName)
      await fetchUserIngredients()
      onChange(selectedIngredients.filter((item) => item.name !== ingredientName))
    } catch (error) {
      console.error('Failed to remove ingredient:', error)
    }
  }

  const handleQuantityChange = async (ingredientName: string, delta: number) => {
    const ingredient = selectedIngredients.find((item) => item.name === ingredientName)
    if (ingredient) {
      const quantity = Math.max(0, ingredient.quantity + delta)
      try {
        await updateIngredient({ ...ingredient, quantity })
        await fetchUserIngredients()
        onChange(selectedIngredients.map((item) => (item.name === ingredientName ? { ...item, quantity } : item)))
      } catch (error) {
        console.error('Failed to update ingredient quantity:', error)
      }
    }
  }

  const handleUnitChange = async (ingredientName: string, unit: string) => {
    const ingredient = selectedIngredients.find((item) => item.name === ingredientName)
    if (ingredient) {
      try {
        await updateIngredient({ ...ingredient, unit })
        await fetchUserIngredients()
        onChange(selectedIngredients.map((item) => (item.name === ingredientName ? { ...item, unit } : item)))
      } catch (error) {
        console.error('Failed to update ingredient unit:', error)
      }
    }
  }

  const handleCustomAdd = async () => {
    if (customIngredient.trim()) {
      const newIngredient: Ingredient = {
        name: customIngredient.trim(),
        quantity: 1,
        unit: "pieces",
      }
      await handleAddIngredient(newIngredient)
      setCustomIngredient("")
      setShowCustomInput(false)
    }
  }

  if (loadingCommon || loadingUser) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selected Ingredients */}
      <div className="space-y-2">
        {selectedIngredients.map((ingredient) => (
          <div
            key={ingredient.name}
            className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{ingredient.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(ingredient.name, -1)}
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                disabled={ingredient.quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{ingredient.quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(ingredient.name, 1)}
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-full hover:bg-slate-100 font-medium text-slate-600"
                  >
                    {ingredient.unit} <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {units.map((unit) => (
                      <Button
                        key={unit}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnitChange(ingredient.name, unit)}
                        className={`justify-start font-medium ${
                          ingredient.unit === unit ? "bg-purple-100 text-purple-700" : "text-slate-700"
                        }`}
                      >
                        {unit}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(ingredient.name)}
                className="h-8 w-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Common Ingredients */}
      {commonIngredients && commonIngredients.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600">Common Ingredients</h4>
          <div className="grid grid-cols-2 gap-2">
            {commonIngredients.map((ingredient) => {
              const isSelected = selectedIngredients.some((item) => item.name === ingredient.name)
              return (
                <Button
                  key={ingredient.name}
                  variant="outline"
                  onClick={() => handleSelect(ingredient)}
                  disabled={isSelected}
                  className={`justify-start h-auto p-3 rounded-2xl border-slate-200 ${
                    isSelected
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ingredient.emoji}</span>
                    <span className="text-sm font-medium">{ingredient.name}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom Ingredient Input */}
      {showCustomInput ? (
        <div className="flex gap-2">
          <Input
            value={customIngredient}
            onChange={(e) => setCustomIngredient(e.target.value)}
            placeholder="Enter ingredient name..."
            className="rounded-2xl border-slate-200"
          />
          <Button
            onClick={handleCustomAdd}
            disabled={!customIngredient.trim()}
            className="rounded-2xl bg-purple-600 hover:bg-purple-700"
          >
            Add
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowCustomInput(false)
              setCustomIngredient("")
            }}
            className="rounded-2xl"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowCustomInput(true)}
          className="w-full justify-center rounded-2xl border-dashed border-slate-300 text-slate-600 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Ingredient
        </Button>
      )}
    </div>
  )
}
