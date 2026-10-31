import type { RecipeIngredient } from '../types/recipe'

const fractionValues: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
}

const formattedFractions: Record<number, string> = {
  1: '⅛',
  2: '¼',
  3: '⅜',
  4: '½',
  5: '⅝',
  6: '¾',
  7: '⅞',
}

const unitForms: Record<string, [string, string]> = {
  cup: ['cup', 'cups'],
  can: ['can', 'cans'],
  clove: ['clove', 'cloves'],
  wedge: ['wedge', 'wedges'],
  handful: ['handful', 'handfuls'],
  portion: ['portion', 'portions'],
}

function parseAmount(amount: string): { quantity: number; unit: string } | null {
  const match = amount.trim().match(
    /^((?:\d+\s*[½⅓⅔¼¾⅛⅜⅝⅞])|(?:[½⅓⅔¼¾⅛⅜⅝⅞])|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?))(?:\s+(.*))?$/u,
  )

  if (!match) return null

  const token = match[1]
  let quantity: number

  if (token.includes('/')) {
    const [numerator, denominator] = token.split('/').map(Number)
    if (!denominator) return null
    quantity = numerator / denominator
  } else {
    const fraction = Object.keys(fractionValues).find((key) => token.endsWith(key))
    if (fraction) {
      const whole = Number.parseInt(token.slice(0, -fraction.length).trim(), 10) || 0
      quantity = whole + fractionValues[fraction]
    } else {
      quantity = Number(token)
    }
  }

  return Number.isFinite(quantity)
    ? { quantity, unit: match[2] ?? '' }
    : null
}

export function withBaseQuantity(
  ingredient: RecipeIngredient,
): RecipeIngredient {
  const parsed = parseAmount(ingredient.amount)
  return parsed
    ? { ...ingredient, baseQuantity: parsed.quantity }
    : ingredient
}

function formatQuantity(quantity: number): string {
  const roundedEighths = Math.round(quantity * 8)
  const whole = Math.floor(roundedEighths / 8)
  const fraction = roundedEighths % 8
  const formattedFraction = formattedFractions[fraction]

  if (!fraction) return String(whole)
  return `${whole ? `${whole} ` : ''}${formattedFraction}`
}

function formatUnit(unit: string, quantity: number): string {
  const form = Object.values(unitForms).find(([singular, plural]) =>
    [singular, plural].includes(unit.toLowerCase()),
  )

  if (form) return quantity <= 1 ? form[0] : form[1]
  if (quantity <= 1 && unit.endsWith('s')) return unit.slice(0, -1)
  return unit
}

export function scaleIngredientAmount(
  ingredient: RecipeIngredient,
  servings: number,
  baseServings = 2,
): string {
  const parsed = parseAmount(ingredient.amount)
  const baseQuantity = ingredient.baseQuantity ?? parsed?.quantity

  if (
    baseQuantity === undefined ||
    !Number.isFinite(baseQuantity) ||
    !Number.isFinite(servings) ||
    !Number.isFinite(baseServings) ||
    baseServings <= 0
  ) {
    return ingredient.amount
  }

  const scaledQuantity = (baseQuantity * servings) / baseServings
  const formatted = formatQuantity(scaledQuantity)
  const unit = parsed?.unit ? formatUnit(parsed.unit, scaledQuantity) : ''
  return unit ? `${formatted} ${unit}` : formatted
}
