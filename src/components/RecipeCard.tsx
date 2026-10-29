import {
  Check,
  Clock3,
  Heart,
  UsersRound,
} from 'lucide-react'
import type { Recipe } from '../types/recipe'

interface RecipeCardProps {
  recipe: Recipe
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function RecipeCard({
  recipe,
  isFavorite,
  onToggleFavorite,
}: RecipeCardProps) {
  const matchedIngredients = new Set(recipe.matchedIngredients)

  return (
    <article className="recipe-card">
      <div className="recipe-photo">
        <img src={recipe.imageUrl} alt={`Prepared ${recipe.title}`} />
        <span className="photo-label"><span /> YOUR PANTRY, REIMAGINED</span>
        <button
          aria-label={isFavorite ? 'Remove recipe from favorites' : 'Save recipe to favorites'}
          aria-pressed={isFavorite}
          className={`recipe-favorite-button${isFavorite ? ' is-favorite' : ''}`}
          onClick={onToggleFavorite}
          type="button"
        >
          <Heart fill={isFavorite ? 'currentColor' : 'none'} size={19} />
        </button>
        <span className="recipe-photo-caption">A little everyday delicious.</span>
      </div>

      <div className="recipe-content">
        <div className="recipe-eyebrow"><Check size={13} /> MADE FROM YOUR INGREDIENTS</div>
        <h2>{recipe.title}</h2>
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
                  <li className={isInPantry ? 'is-in-pantry' : ''} key={ingredient.name}>
                    <span className="ingredient-check">{isInPantry && <Check size={11} />}</span>
                    <span>{ingredient.name}</span>
                    <span className="ingredient-amount">{ingredient.amount}</span>
                  </li>
                )
              })}
            </ul>
            <p className="pantry-legend"><span /> Already in your kitchen</p>
          </section>

          <section className="recipe-instructions">
            <div className="recipe-list-heading">
              <h3>Let’s get cooking</h3>
              <span>{recipe.instructions.length} simple steps</span>
            </div>
            <ol>
              {recipe.instructions.map((instruction, index) => (
                <li key={instruction}>
                  <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                  <p>{instruction}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </article>
  )
}
