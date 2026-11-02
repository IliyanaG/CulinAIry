import { describe, expect, it } from 'vitest'
import { cleanIngredientInput } from './ingredientInput'

describe('cleanIngredientInput', () => {
  it('trims whitespace and accidental special characters around an ingredient', () => {
    expect(cleanIngredientInput('  !!! хляб !!!  ')).toBe('хляб')
  })

  it('preserves meaningful special characters within an ingredient', () => {
    expect(cleanIngredientInput('  salt   & pepper  ')).toBe('salt & pepper')
  })

  it('returns an empty string when input contains only special characters', () => {
    expect(cleanIngredientInput(' -- !! ')).toBe('')
  })
})
