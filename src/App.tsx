import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChefHat,
  Clock3,
  CookingPot,
  Heart,
  LoaderCircle,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { IngredientInput } from './components/IngredientInput'
import { RecipeCard } from './components/RecipeCard'
import { useFavorites } from './hooks/useFavorites'
import {
  generateRecipe,
  normalizeIngredient,
} from './services/mockRecipeGenerator'
import type { Recipe, RecipeGenerationResult, TimeFilter } from './types/recipe'

const ingredientSuggestions = ['tomato', 'chicken', 'garlic', 'pasta', 'chickpea']

const timeFilters: { id: TimeFilter; label: string; detail: string }[] = [
  { id: 'fast', label: 'Fast', detail: 'Under 15 min' },
  { id: 'medium', label: 'Medium', detail: 'Under 30 min' },
  { id: 'all', label: 'Any time', detail: 'No limit' },
]

type GenerationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; result: RecipeGenerationResult }
  | { status: 'error'; message: string }

function App() {
  const [ingredients, setIngredients] = useState<string[]>([])
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [generation, setGeneration] = useState<GenerationState>({ status: 'idle' })
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

  const invalidateGeneration = () => {
    generationRequestId.current += 1
    setGeneration((current) =>
      current.status === 'loading' ? { status: 'idle' } : current,
    )
  }

  const addIngredients = (newIngredients: string[]) => {
    invalidateGeneration()
    setIngredients((current) => {
      const currentNames = new Set(current.map(normalizeIngredient))
      const uniqueAdditions = newIngredients.filter((item) => {
        const key = normalizeIngredient(item)
        if (!key || currentNames.has(key)) return false
        currentNames.add(key)
        return true
      })
      return [...current, ...uniqueAdditions]
    })
  }

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      generationRequestId.current += 1
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
    setGeneration({ status: 'loading' })
    try {
      const generated = await generateRecipe([...ingredients], timeFilter)
      if (requestId === generationRequestId.current) {
        setGeneration({ status: 'result', result: generated })
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
    }
  }

  const showFavorite = (recipe: Recipe) => {
    invalidateGeneration()
    setGeneration({
      status: 'result',
      result: { status: 'success', recipe },
    })
    document.getElementById('recipe-result')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="app-shell min-h-screen bg-cream text-ink">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="culinAIry home">
          <span className="brand-mark">
            <CookingPot size={20} strokeWidth={1.8} />
          </span>
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
              Let’s make something <ArrowDown size={15} />
            </a>
          </div>
          <div className="hero-visual">
            <img
              className="hero-image"
              src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85"
              alt="A colorful, fresh bowl of vegetables and greens"
            />
            <div className="hero-image-shade" />
            <div className="hero-image-caption">
              <span className="caption-kicker">A little inspiration</span>
              <span className="caption-title">Made for real life.</span>
            </div>
            <span className="hero-image-index">01 <span>/</span> 03</span>
          </div>
        </section>

        <section className="generator-section page-width" id="create">
          <div className="section-heading">
            <div>
              <span className="section-kicker">START WITH YOUR STASH</span>
              <h2>What’s in your kitchen?</h2>
            </div>
            <span className="section-aside"><span className="status-dot" /> No grocery run required</span>
          </div>

          <div className="generator-panel">
            <div className="ingredient-field">
              <label className="field-label" htmlFor="ingredient-entry">
                Your ingredients <span>· add a few or use what’s left</span>
              </label>
              <IngredientInput
                ingredients={ingredients}
                onAddIngredients={addIngredients}
                onRemoveIngredient={(ingredient) => {
                  invalidateGeneration()
                  setIngredients((current) =>
                    current.filter((item) => item !== ingredient),
                  )
                }}
              />
              <div className="suggestion-row">
                <span>Try</span>
                {ingredientSuggestions.map((ingredient) => (
                  <button
                    className="suggestion-chip transition-colors duration-200"
                    key={ingredient}
                    onClick={() => addIngredients([ingredient])}
                    type="button"
                  >
                    + {ingredient}
                  </button>
                ))}
              </div>
            </div>

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
                      <span>{filter.label}</span>
                      <small>{filter.detail}</small>
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="generate-button transition-all duration-200"
                disabled={generation.status === 'loading'}
                onClick={handleGenerate}
                type="button"
              >
                {generation.status === 'loading' ? (
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
            </div>
          </div>
        </section>

        <section
          aria-busy={generation.status === 'loading'}
          aria-live="polite"
          className="result-section page-width"
          id="recipe-result"
        >
          {generation.status === 'loading' ? (
            <div className="result-placeholder loading-state">
              <span className="loading-icon"><LoaderCircle className="spin" size={23} /></span>
              <div>
                <h3>Finding the delicious in your ingredients…</h3>
                <p>Give us a moment to put something lovely together.</p>
              </div>
            </div>
          ) : generatedRecipe ? (
            <RecipeCard
              isFavorite={favorites.some(
                (recipe) => recipe.id === generatedRecipe.id,
              )}
              onToggleFavorite={() => toggleFavorite(generatedRecipe)}
              recipe={generatedRecipe}
            />
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
          ) : generation.status === 'idle' ? (
            <div className="result-placeholder idle-state">
              <span className="placeholder-icon"><CookingPot size={23} /></span>
              <div>
                <h3>Your next favorite is one ingredient away.</h3>
                <p>Add what you have, choose your time, and let the kitchen inspiration begin.</p>
              </div>
              <div className="idle-details">
                <span><Clock3 size={14} /> Your pace</span>
                <span><UsersRound size={14} /> Your pantry</span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="favorites-section page-width" id="favorites">
          <div className="favorites-heading">
            <div>
              <span className="section-kicker">KEEP THE GOOD ONES</span>
              <h2>Your saved recipes <span className="saved-total">{favorites.length}</span></h2>
            </div>
            <Heart className="favorites-heading-icon" size={22} />
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
                    onClick={() => showFavorite(recipe)}
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
          <span className="brand-mark"><CookingPot size={17} strokeWidth={1.8} /></span>
          <span>culin<span className="brand-ai">AI</span>ry</span>
        </a>
        <span>Cook a little more creatively.</span>
        <a href="#create">Back to the kitchen <ArrowRight size={14} /></a>
      </footer>
    </div>
  )
}

export default App
