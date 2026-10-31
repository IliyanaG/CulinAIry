import { useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Check,
  Clock3,
  Heart,
  UsersRound,
  X,
} from 'lucide-react'
import type { Recipe } from '../types/recipe'

interface RecipeDetailsDialogProps {
  recipe: Recipe
  isFavorite: boolean
  onToggleFavorite: () => void
  onClose: () => void
}

export function RecipeDetailsDialog({
  recipe,
  isFavorite,
  onToggleFavorite,
  onClose,
}: RecipeDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const matchedIngredients = new Set(recipe.matchedIngredients)
  const isGenerated = recipe.id.startsWith('generated-')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const closeDialog = () => dialogRef.current?.close()

  return (
    <dialog
      aria-labelledby="recipe-details-title"
      className="recipe-details-dialog"
      onCancel={(event) => {
        event.preventDefault()
        closeDialog()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeDialog()
      }}
      ref={dialogRef}
    >
      <div className="recipe-details-shell">
        <div className="recipe-details-toolbar">
          <button
            aria-label="Close recipe details"
            className="recipe-details-close"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" size={19} />
            <span>Close</span>
          </button>
          <button
            aria-label={
              isFavorite ? 'Remove recipe from favorites' : 'Save recipe to favorites'
            }
            aria-pressed={isFavorite}
            className={`recipe-details-favorite${isFavorite ? ' is-favorite' : ''}`}
            onClick={onToggleFavorite}
            type="button"
          >
            <Heart fill={isFavorite ? 'currentColor' : 'none'} size={18} />
            <span>{isFavorite ? 'Saved' : 'Save recipe'}</span>
          </button>
        </div>

        <div className="recipe-details-layout">
          <div className="recipe-details-photo">
            <img src={recipe.imageUrl} alt={`Prepared ${recipe.title}`} />
          </div>

          <div className="recipe-details-content">
            <div className="recipe-eyebrow">
              <Check size={13} />
              {isGenerated
                ? 'A NEW RECIPE, MADE FOR YOUR PANTRY'
                : matchedIngredients.size > 0
                  ? 'MADE FROM YOUR INGREDIENTS'
                  : 'A KITCHEN CLASSIC TO TRY'}
            </div>
            <h2 id="recipe-details-title">{recipe.title}</h2>
            <p className="recipe-description">{recipe.description}</p>

            <div className="recipe-meta">
              <span><Clock3 size={16} /> {recipe.prepTimeMinutes} min</span>
              <span><UsersRound size={16} /> Serves {recipe.servings}</span>
              <span className="difficulty-pill">{recipe.difficulty}</span>
            </div>

            <div className="recipe-content-divider" />

            <div className="recipe-lists">
              <section className="recipe-ingredients">
                <div className="recipe-list-heading">
                  <h3>Gather your ingredients</h3>
                  <span>{recipe.ingredients.length} items</span>
                </div>
                <ul>
                  {recipe.ingredients.map((ingredient) => {
                    const isInPantry = matchedIngredients.has(ingredient.name)
                    return (
                      <li
                        className={isInPantry ? 'is-in-pantry' : ''}
                        key={`${ingredient.name}-${ingredient.amount}`}
                      >
                        <span className="ingredient-check">
                          {isInPantry && <Check size={11} />}
                        </span>
                        <span>{ingredient.name}</span>
                        <span className="ingredient-amount">{ingredient.amount}</span>
                      </li>
                    )
                  })}
                </ul>
                {matchedIngredients.size > 0 && (
                  <p className="pantry-legend">
                    <span /> Already in your kitchen
                  </p>
                )}
              </section>

              <section className="recipe-instructions">
                <div className="recipe-list-heading">
                  <h3>Let’s get cooking</h3>
                  <span>{recipe.instructions.length} simple steps</span>
                </div>
                <ol>
                  {recipe.instructions.map((instruction, index) => (
                    <li key={`${index}-${instruction}`}>
                      <span className="step-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p>{instruction}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <button
              className="recipe-details-back"
              onClick={closeDialog}
              type="button"
            >
              <ArrowLeft size={16} /> Back to recipes
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
