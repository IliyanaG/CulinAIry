import {
  ArrowRight,
  Check,
  Clock3,
  Heart,
} from 'lucide-react'
import type { Recipe } from '../types/recipe'

interface RecipeCardProps {
  recipe: Recipe
  isFavorite: boolean
  onToggleFavorite: () => void
  onOpenDetails: () => void
}

export function RecipeCard({
  recipe,
  isFavorite,
  onToggleFavorite,
  onOpenDetails,
}: RecipeCardProps) {
  const isGenerated = recipe.id.startsWith('generated-')

  return (
    <article className="recipe-card">
      <div className="recipe-photo">
        <img
          src={recipe.imageUrl}
          alt={`Prepared ${recipe.title}`}
          decoding="async"
        />
        <span className="photo-label">
          <span /> {isGenerated ? 'A FRESH RECIPE, JUST FOR YOU' : 'YOUR PANTRY, REIMAGINED'}
        </span>
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
        <div className="recipe-eyebrow">
          <Check size={13} />
          {isGenerated
            ? 'A NEW RECIPE, MADE FOR YOUR PANTRY'
            : 'A LITTLE KITCHEN INSPIRATION'}
        </div>
        <h2>{recipe.title}</h2>
        <p className="recipe-description">{recipe.description}</p>

        <div className="recipe-meta">
          <span><Clock3 size={16} /> {recipe.prepTimeMinutes} min</span>
          <span className="difficulty-pill">{recipe.difficulty}</span>
        </div>

        <button
          className="recipe-details-button"
          onClick={onOpenDetails}
          type="button"
        >
          Open recipe details <ArrowRight size={16} />
        </button>
      </div>
    </article>
  )
}
