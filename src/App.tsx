import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChefHat,
  Clock3,
  CookingPot,
  Flame,
  Heart,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { IngredientInput } from './components/IngredientInput'
import { RecipeCard } from './components/RecipeCard'
import { RecipeDetailsDialog } from './components/RecipeDetailsDialog'
import { useFavorites } from './hooks/useFavorites'
import {
  generateRecipe,
  normalizeIngredient,
} from './services/recipeGenerator'
import type { Recipe, RecipeGenerationResult, TimeFilter } from './types/recipe'
import { cleanIngredientInput } from './utils/ingredientInput'

const ingredientSuggestionGroups = [
  {
    id: 'veggies',
    title: 'Veggies',
    icon: '🥬',
    ingredients: [
      'tomato',
      'garlic',
      'spinach',
      'broccoli',
      'carrot',
      'onion',
      'lemon',
    ],
  },
  {
    id: 'proteins',
    title: 'Proteins',
    icon: '🍗',
    ingredients: ['chicken', 'egg', 'salmon', 'tofu', 'beef', 'lentils'],
  },
  {
    id: 'pantry',
    title: 'Pantry',
    icon: '🌾',
    ingredients: ['pasta', 'rice', 'chickpeas', 'olive oil', 'oats'],
  },
]

const timeFilters: { id: TimeFilter; label: string; detail: string }[] = [
  { id: 'fast', label: 'Fast', detail: 'Under 15 min' },
  { id: 'medium', label: 'Medium', detail: 'Under 30 min' },
  { id: 'all', label: 'Any time', detail: 'No limit' },
]

type GenerationState =
  | { status: 'idle' }
  | { status: 'result'; result: RecipeGenerationResult }
  | { status: 'error'; message: string }

function App() {
  const [ingredients, setIngredients] = useState<string[]>([])
  const [showIngredientSuggestions, setShowIngredientSuggestions] =
    useState(false)
  const ingredientActionAreaRef = useRef<HTMLDivElement>(null)
  const [servings, setServings] = useState(2)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [generation, setGeneration] = useState<GenerationState>({ status: 'idle' })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const generationRequestId = useRef(0)
  const { favorites, storageMessage, toggleFavorite, removeFavorite } =
    useFavorites()
  const generatedRecipe =
    generation.status === 'result' && generation.result.status === 'success'
      ? generation.result.recipe
      : null

  useEffect(
    () => () => {
      generationRequestId.current += 1
    },
    [],
  )

  useEffect(() => {
    if (!showIngredientSuggestions) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const actionArea = ingredientActionAreaRef.current
      if (
        actionArea &&
        event.target instanceof Node &&
        !actionArea.contains(event.target)
      ) {
        setShowIngredientSuggestions(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () =>
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [showIngredientSuggestions])

  const invalidateGeneration = () => {
    generationRequestId.current += 1
    setIsLoading(false)
    setGeneration({ status: 'idle' })
  }

  const addIngredients = (newIngredients: string[]) => {
    const cleanedIngredients = newIngredients
      .map(cleanIngredientInput)
      .filter(Boolean)
    if (cleanedIngredients.length === 0) return

    setError(null)
    invalidateGeneration()
    setIngredients((current) => {
      const currentNames = new Set(current.map(normalizeIngredient))
      const uniqueAdditions = cleanedIngredients.filter((item) => {
        const key = normalizeIngredient(item)
        if (!key || currentNames.has(key)) return false
        currentNames.add(key)
        return true
      })
      return [...current, ...uniqueAdditions]
    })
  }

  const handleGenerate = async () => {
    setShowIngredientSuggestions(false)
    setIsLoading(true)
    setError(null)
    setGeneration({ status: 'idle' })
    setSelectedRecipe(null)
    if (ingredients.length === 0) {
      generationRequestId.current += 1
      setIsLoading(false)
      setGeneration({
        status: 'result',
        result: {
          status: 'empty',
          message: 'Add at least one ingredient to get your recipe started.',
        },
      })
      return
    }
    const requestId = ++generationRequestId.current
    try {
      const generated = await generateRecipe([...ingredients], timeFilter)
      if (requestId === generationRequestId.current) {
        if (generated.status === 'invalidIngredients') {
          setError(generated.message)
          setGeneration({ status: 'idle' })
          setSelectedRecipe(null)
        } else if (generated.status === 'success') {
          setServings(generated.recipe.servings)
          setGeneration({ status: 'result', result: generated })
        } else {
          setGeneration({ status: 'result', result: generated })
        }
      }
    } catch (error) {
      if (requestId === generationRequestId.current) {
        setGeneration({
          status: 'error',
          message:
            error instanceof Error
              ? `We couldn't create that recipe. ${error.message}`
              : "We couldn't create that recipe. Please try again.",
        })
      }
    } finally {
      if (requestId === generationRequestId.current) {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="app-shell min-h-screen bg-cream text-ink">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="culinAIry home">
          <span>culin<span className="brand-ai">AI</span>ry</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-link" href="#create">Create</a>
          <a className="nav-link saved-nav-link" href="#favorites">
            Favorites
            <span className="favorite-count">{favorites.length}</span>
          </a>
        </nav>
        <a className="header-cta" href="#create">
          Find your next meal <ArrowRight size={15} />
        </a>
      </header>

      <main id="top">
        <section className="hero-section page-width">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={14} />
              YOUR EVERYDAY RECIPE STUDIO
            </div>
            <h1>
              Good food starts with <em>what you have.</em>
            </h1>
            <p className="hero-description">
              A few things in your kitchen, one lovely meal on the table.
              Tell us what you have and we’ll find the delicious in it.
            </p>
            <a className="hero-scroll-link" href="#create">
              <span>Open My Fridge</span>
              <svg
                aria-hidden="true"
                className="hero-fridge-icon"
                fill="none"
                viewBox="0 0 28 28"
              >
                <rect
                  className="fridge-interior-light"
                  x="4.5"
                  y="3.5"
                  width="19"
                  height="21"
                  rx="1.5"
                />
                <g className="fridge-door fridge-door--left">
                  <path d="M5.5 3.5h8.5v21H5.5A1.5 1.5 0 0 1 4 23V5a1.5 1.5 0 0 1 1.5-1.5Z" />
                  <path className="fridge-handle" d="M11.5 9v4" />
                </g>
                <g className="fridge-door fridge-door--right">
                  <path d="M14 3.5h8.5A1.5 1.5 0 0 1 24 5v18a1.5 1.5 0 0 1-1.5 1.5H14v-21Z" />
                  <path className="fridge-handle" d="M16.5 9v4" />
                </g>
                <rect
                  className="fridge-frame"
                  x="4"
                  y="3"
                  width="20"
                  height="22"
                  rx="2"
                />
              </svg>
            </a>
          </div>
          <div className="brand-showcase" aria-label="culinAIry recipe studio">
            <div className="showcase-illustration" aria-hidden="true">
              <div className="showcase-pot">
                <svg
                  aria-hidden="true"
                  className="showcase-steam"
                  fill="none"
                  viewBox="0 0 72 56"
                >
                  <path d="M14 52c0-8 8-8 8-16s-8-8-8-16" />
                  <path d="M36 52c0-8 8-8 8-16s-8-8-8-16" />
                  <path d="M58 52c0-8-8-8-8-16s8-8 8-16" />
                </svg>
                <CookingPot size={154} strokeWidth={1.1} />
              </div>
            </div>
            <p className="showcase-wordmark">
              culin<span className="brand-ai">AI</span>ry
            </p>
            <span className="showcase-caption">A recipe studio for every day</span>
          </div>
        </section>

        <section className="generator-section page-width" id="create">
          <div className="section-heading">
            <span className="section-kicker">START WITH YOUR STASH</span>
            <span className="section-aside"><span className="status-dot" /> No grocery run required</span>
          </div>

          <div className="generator-panel">
            <div className="generator-controls">
              <div className="time-filter">
                <span className="field-label">How much time do you have?</span>
                <div className="filter-options" role="group" aria-label="Preparation time">
                  {timeFilters.map((filter) => (
                    <button
                      aria-pressed={timeFilter === filter.id}
                      className={`filter-option${timeFilter === filter.id ? ' is-selected' : ''}`}
                      key={filter.id}
                      onClick={() => {
                        invalidateGeneration()
                        setTimeFilter(filter.id)
                      }}
                      type="button"
                    >
                      {filter.id === 'fast' ? (
                        <Flame className="filter-option-icon" size={20} />
                      ) : filter.id === 'medium' ? (
                        <Clock3 className="filter-option-icon" size={20} />
                      ) : (
                        <Sparkles className="filter-option-icon" size={20} />
                      )}
                      <span className="filter-option-copy">
                        <span>{filter.label}</span>
                        <small>{filter.detail}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="ingredient-action-area"
              ref={ingredientActionAreaRef}
              onBlurCapture={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setShowIngredientSuggestions(false)
                }
              }}
              onFocusCapture={(event) => {
                if (
                  event.target instanceof HTMLInputElement &&
                  event.target.id === 'ingredient-entry'
                ) {
                  setShowIngredientSuggestions(true)
                }
              }}
            >
              <div className="ingredient-field">
                <h2 className="ingredient-heading" id="ingredient-entry-label">
                  What’s in your kitchen?
                </h2>
                <IngredientInput
                  ingredients={ingredients}
                  onAddIngredients={addIngredients}
                  suggestionsOpen={showIngredientSuggestions}
                  onRemoveIngredient={(ingredient) => {
                    invalidateGeneration()
                    setError(null)
                    setIngredients((current) =>
                      current.filter((item) => item !== ingredient),
                    )
                  }}
                />
              </div>

              {error && (
                <div
                  className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm"
                  role="alert"
                >
                  <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-red-600"
                    size={21}
                  />
                  <div>
                    <h3 className="font-semibold">Invalid ingredients</h3>
                    <p className="mt-1 text-sm leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <button
                className="generate-button transition-all duration-200"
                disabled={isLoading}
                onClick={handleGenerate}
                type="button"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Finding your recipe
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    Generate recipe
                    <ArrowRight className="generate-arrow" size={16} />
                  </>
                )}
              </button>

              {showIngredientSuggestions && (
                <div
                  aria-label="Popular ingredient suggestions"
                  className="ingredient-suggestion-popover"
                  id="ingredient-suggestion-popover"
                  role="group"
                >
                  {ingredientSuggestionGroups.map((group) => {
                    const availableIngredients = group.ingredients.filter(
                      (ingredient) =>
                        !ingredients.some(
                          (selected) =>
                            normalizeIngredient(selected) ===
                            normalizeIngredient(ingredient),
                        ),
                    )

                    return (
                      <section
                        aria-label={group.title}
                        className={`suggestion-group suggestion-group--${group.id}`}
                        key={group.id}
                      >
                        <h3>
                          <span aria-hidden="true">{group.icon}</span>
                          {group.title}
                        </h3>
                        <div className="suggestion-chips">
                          {availableIngredients.map((ingredient) => (
                            <button
                              className="suggestion-chip transition-colors duration-200"
                              key={ingredient}
                              onClick={() => {
                                addIngredients([ingredient])
                                setShowIngredientSuggestions(false)
                              }}
                              type="button"
                            >
                              {ingredient}
                            </button>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {(generation.status !== 'idle' || isLoading) && (
          <section
            aria-busy={isLoading}
            aria-live="polite"
            className="result-section page-width"
            id="recipe-result"
          >
            {isLoading ? (
              <div className="mx-auto w-full max-w-4xl">
                <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                  <div className="grid md:grid-cols-[0.85fr_1.15fr]">
                    <div className="min-h-56 animate-pulse bg-stone-200 md:min-h-80" />
                    <div className="space-y-5 p-6 md:p-8">
                      <div className="h-3 w-28 animate-pulse rounded bg-stone-200" />
                      <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200" />
                      <div className="space-y-2">
                        <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
                        <div className="h-3 w-5/6 animate-pulse rounded bg-stone-100" />
                      </div>
                      <div className="space-y-3 pt-3">
                        <div className="h-4 w-36 animate-pulse rounded bg-stone-200" />
                        <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-stone-100" />
                        <div className="h-3 w-11/12 animate-pulse rounded bg-stone-100" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-5 text-center text-sm text-stone-500" role="status">
                  Chef AI is composing your recipe...
                </p>
              </div>
            ) : generatedRecipe ? (
              <>
                <RecipeCard
                  isFavorite={favorites.some(
                    (recipe) => recipe.id === generatedRecipe.id,
                  )}
                  onToggleFavorite={() => toggleFavorite(generatedRecipe)}
                  onOpenDetails={() => setSelectedRecipe(generatedRecipe)}
                  recipe={generatedRecipe}
                />
                {generation.status === 'result' &&
                  generation.result.status === 'success' &&
                  generation.result.source === 'local' && (
                    <p className="mt-4 text-center text-sm text-stone-500" role="status">
                      Gemini is temporarily unavailable, so we generated a local recipe instead.
                    </p>
                  )}
              </>
            ) : generation.status === 'result' &&
              generation.result.status === 'empty' ? (
              <div className="result-placeholder message-state">
                <span className="placeholder-icon"><ChefHat size={23} /></span>
                <div>
                  <h3>Let’s start with an ingredient.</h3>
                  <p>{generation.result.message}</p>
                </div>
              </div>
            ) : generation.status === 'error' ? (
              <div className="result-placeholder message-state">
                <span className="placeholder-icon"><ChefHat size={23} /></span>
                <div>
                  <h3>We hit a snag in the kitchen.</h3>
                  <p>{generation.message}</p>
                </div>
              </div>
            ) : null}
          </section>
        )}

        <section className="favorites-section page-width" id="favorites">
          <div className="favorites-heading">
            <h2>
              <Heart
                aria-hidden="true"
                className="favorites-heading-icon"
                fill="currentColor"
                size={23}
              />
              Keep the Good Ones
              <span className="saved-total">{favorites.length}</span>
            </h2>
          </div>

          {storageMessage && (
            <p className="storage-message" role="status">{storageMessage}</p>
          )}

          {favorites.length > 0 ? (
            <div className="favorite-grid">
              {favorites.map((recipe) => (
                <article className="favorite-card" key={recipe.id}>
                  <button
                    aria-label={`View ${recipe.title}`}
                    className="favorite-card-main"
                    onClick={() => {
                      setServings(recipe.servings)
                      setSelectedRecipe(recipe)
                    }}
                    type="button"
                  >
                    <img src={recipe.imageUrl} alt="" loading="lazy" />
                    <span className="favorite-card-content">
                      <span className="favorite-card-time"><Clock3 size={13} /> {recipe.prepTimeMinutes} min</span>
                      <span className="favorite-card-title">{recipe.title}</span>
                      <span className="favorite-card-link">View recipe <ArrowRight size={13} /></span>
                    </span>
                  </button>
                  <button
                    aria-label={`Remove ${recipe.title} from favorites`}
                    className="remove-favorite-button"
                    onClick={() => removeFavorite(recipe.id)}
                    type="button"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="favorites-empty">
              <span className="empty-heart"><Heart size={18} /></span>
              <div>
                <strong>A little space for your keepers.</strong>
                <p>Tap the heart on a recipe and it’ll be here next time you visit.</p>
              </div>
              <Check className="favorites-empty-check" size={17} />
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer page-width">
        <a className="brand footer-brand" href="#top">
          <span>culin<span className="brand-ai">AI</span>ry</span>
        </a>
        <span>Cook a little more creatively.</span>
        <a href="#create">Back to the kitchen <ArrowRight size={14} /></a>
      </footer>
      {selectedRecipe && (
        <RecipeDetailsDialog
          isFavorite={favorites.some(
            (recipe) => recipe.id === selectedRecipe.id,
          )}
          onClose={() => setSelectedRecipe(null)}
          onServingsChange={setServings}
          onToggleFavorite={() => toggleFavorite(selectedRecipe)}
          recipe={selectedRecipe}
          servings={servings}
        />
      )}
    </div>
  )
}

export default App
