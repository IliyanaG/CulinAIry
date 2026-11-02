import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'

interface IngredientInputProps {
  ingredients: string[]
  onAddIngredients: (ingredients: string[]) => void
  onRemoveIngredient: (ingredient: string) => void
  suggestionsOpen: boolean
}

export function IngredientInput({
  ingredients,
  onAddIngredients,
  onRemoveIngredient,
  suggestionsOpen,
}: IngredientInputProps) {
  const [value, setValue] = useState('')

  const submitIngredients = (rawValue: string) => {
    const nextIngredients = rawValue
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)

    if (nextIngredients.length > 0) {
      onAddIngredients(nextIngredients)
      setValue('')
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      submitIngredients(value)
    } else if (event.key === 'Backspace' && value === '' && ingredients.length > 0) {
      onRemoveIngredient(ingredients[ingredients.length - 1])
    }
  }

  return (
    <div className="ingredient-input-wrap">
      {ingredients.map((ingredient) => (
        <span className="ingredient-tag" key={ingredient}>
          {ingredient}
          <button
            aria-label={`Remove ${ingredient}`}
            onClick={() => onRemoveIngredient(ingredient)}
            type="button"
          >
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        autoComplete="off"
        id="ingredient-entry"
        aria-controls={suggestionsOpen ? 'ingredient-suggestion-popover' : undefined}
        aria-expanded={suggestionsOpen}
        aria-haspopup="true"
        onChange={(event) => {
          if (event.target.value.includes(',')) {
            submitIngredients(event.target.value)
          } else {
            setValue(event.target.value)
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={ingredients.length === 0 ? 'e.g. tomato, chicken, garlic' : 'Add another…'}
        type="text"
        value={value}
      />
      {value.trim() && (
        <button
          aria-label="Add ingredient"
          className="input-add-button"
          onClick={() => submitIngredients(value)}
          type="button"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  )
}
