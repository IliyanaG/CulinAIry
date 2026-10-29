export type TimeFilter = 'fast' | 'medium' | 'all'

export interface RecipeIngredient {
  amount: string
  name: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  prepTimeMinutes: number
  servings: number
  difficulty: 'Easy' | 'Medium'
  ingredients: RecipeIngredient[]
  instructions: string[]
  imageUrl: string
  matchedIngredients: string[]
}

export type RecipeGenerationResult =
  | { status: 'success'; recipe: Recipe }
  | { status: 'empty'; message: string }
  | { status: 'no-match'; message: string }
