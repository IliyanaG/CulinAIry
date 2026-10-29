import { useState } from 'react'
import { readFavoriteRecipes, writeFavoriteRecipes } from '../services/favoriteStorage'
import type { Recipe } from '../types/recipe'

export function useFavorites() {
  const [initialState] = useState(readFavoriteRecipes)
  const [favorites, setFavorites] = useState(initialState.recipes)
  const [storageMessage, setStorageMessage] = useState(initialState.error)

  const save = (nextFavorites: Recipe[]) => {
    setFavorites(nextFavorites)
    setStorageMessage(writeFavoriteRecipes(nextFavorites))
  }

  const toggleFavorite = (recipe: Recipe) => {
    const alreadySaved = favorites.some((favorite) => favorite.id === recipe.id)
    save(
      alreadySaved
        ? favorites.filter((favorite) => favorite.id !== recipe.id)
        : [recipe, ...favorites],
    )
  }

  const removeFavorite = (recipeId: string) => {
    save(favorites.filter((favorite) => favorite.id !== recipeId))
  }

  return { favorites, storageMessage, toggleFavorite, removeFavorite }
}
