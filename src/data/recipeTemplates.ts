import type { Recipe } from '../types/recipe'
import { withBaseQuantity } from '../utils/ingredientScaling'

const unsplashImage = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1100&q=85`

export const generatedRecipeImageUrl = unsplashImage(
  'photo-1556911220-bff31c812dba',
)

const recipeDefinitions: Recipe[] = [
  {
    id: 'tomato-garlic-pasta',
    title: 'Jammy Tomato & Garlic Pasta',
    description: 'Sweet, slow-softened tomatoes and golden garlic meet a little pasta water for a silky weeknight sauce.',
    imageUrl: unsplashImage('photo-1551183053-bf91a1d81141'),
    prepTimeMinutes: 12,
    servings: 2,
    difficulty: 'Easy',
    ingredients: [
      { amount: '180 g', name: 'pasta' },
      { amount: '2 cups', name: 'tomato' },
      { amount: '3 cloves', name: 'garlic' },
      { amount: '2 tbsp', name: 'olive oil' },
      { amount: '¼ cup', name: 'parmesan' },
      { amount: 'A handful', name: 'basil' },
    ],
    instructions: [
      'Bring a pot of well-salted water to a boil and cook the pasta until just shy of al dente. Save a mug of pasta water before draining.',
      'Warm the olive oil in a wide pan. Add the sliced garlic and cook gently until fragrant, then tumble in the tomatoes with a pinch of salt.',
      'Let the tomatoes soften and turn jammy, about 5 minutes. Add the pasta and a splash of pasta water, tossing until glossy.',
      'Finish with parmesan and torn basil. Taste, season, and bring the pan straight to the table.',
    ],
    matchedIngredients: [],
  },
  {
    id: 'garlic-chicken-skillet',
    title: 'Golden Garlic Chicken Skillet',
    description: 'A bright, one-pan supper with tender chicken, sweet tomatoes and plenty of garlicky pan juices.',
    imageUrl: unsplashImage('photo-1532550907401-a500c9a57435'),
    prepTimeMinutes: 24,
    servings: 2,
    difficulty: 'Easy',
    ingredients: [
      { amount: '2', name: 'chicken' },
      { amount: '1 cup', name: 'tomato' },
      { amount: '3 cloves', name: 'garlic' },
      { amount: '½', name: 'onion' },
      { amount: '1 tbsp', name: 'olive oil' },
      { amount: 'To finish', name: 'parsley' },
    ],
    instructions: [
      'Pat the chicken dry and season generously with salt and black pepper. Heat the olive oil in a skillet over medium-high heat.',
      'Sear the chicken until golden on both sides and cooked through, about 5–7 minutes per side. Transfer to a plate to rest.',
      'Add the sliced onion to the same pan. Once softened, stir in the garlic and tomatoes and cook until the tomatoes begin to burst.',
      'Return the chicken and any resting juices to the pan. Spoon the glossy sauce over the top and finish with parsley.',
    ],
    matchedIngredients: [],
  },
  {
    id: 'crunchy-chickpea-salad',
    title: 'Crunchy Chickpea & Tomato Salad',
    description: 'Crisp cucumber, juicy tomatoes and creamy feta make this lemony chickpea bowl feel like sunshine.',
    imageUrl: unsplashImage('photo-1512621776951-a57141f2eefd'),
    prepTimeMinutes: 14,
    servings: 2,
    difficulty: 'Easy',
    ingredients: [
      { amount: '1 can', name: 'chickpea' },
      { amount: '1 cup', name: 'tomato' },
      { amount: '½', name: 'cucumber' },
      { amount: '½', name: 'lemon' },
      { amount: '¼ cup', name: 'feta' },
      { amount: 'A handful', name: 'parsley' },
    ],
    instructions: [
      'Drain and rinse the chickpeas, then pat them dry so they stay lovely and firm in the salad.',
      'Chop the tomato and cucumber into bite-sized pieces. Add them to a serving bowl with the chickpeas.',
      'Squeeze over the lemon, drizzle with olive oil, and season with salt and black pepper. Toss gently.',
      'Crumble over the feta and finish with parsley. Let it sit for a few minutes so all the bright flavors mingle.',
    ],
    matchedIngredients: [],
  },
  {
    id: 'tomato-chickpea-curry',
    title: 'Cozy Tomato & Chickpea Curry',
    description: 'A mellow, gently spiced pantry curry that turns a few tins and aromatics into a comforting bowl.',
    imageUrl: unsplashImage('photo-1603894584373-5ac82b2ae398'),
    prepTimeMinutes: 28,
    servings: 3,
    difficulty: 'Easy',
    ingredients: [
      { amount: '1 can', name: 'chickpea' },
      { amount: '1½ cups', name: 'tomato' },
      { amount: '3 cloves', name: 'garlic' },
      { amount: '½', name: 'onion' },
      { amount: '½ cup', name: 'coconut milk' },
      { amount: '1 tsp', name: 'curry powder' },
    ],
    instructions: [
      'Warm a little oil in a saucepan. Add the diced onion and cook until soft and sweet, about 4 minutes.',
      'Stir in the garlic and curry powder for 30 seconds, then add the tomatoes and a good pinch of salt.',
      'Tip in the chickpeas and coconut milk. Simmer gently until thick and fragrant, about 15 minutes.',
      'Taste and adjust the seasoning. Spoon into bowls with rice or warm flatbread if you have some.',
    ],
    matchedIngredients: [],
  },
  {
    id: 'garden-omelette',
    title: 'Soft Herb & Garden Omelette',
    description: 'A tender, golden omelette folded around greens and a little cheese—simple, lovely and ready in minutes.',
    imageUrl: unsplashImage('photo-1525351484163-7529414344d8'),
    prepTimeMinutes: 11,
    servings: 1,
    difficulty: 'Easy',
    ingredients: [
      { amount: '2', name: 'egg' },
      { amount: '1 handful', name: 'spinach' },
      { amount: '¼ cup', name: 'tomato' },
      { amount: '2 tbsp', name: 'feta' },
      { amount: '1 tsp', name: 'butter' },
      { amount: 'A pinch', name: 'herbs' },
    ],
    instructions: [
      'Whisk the eggs with a pinch of salt and a splash of water until just combined.',
      'Melt the butter in a small non-stick pan over medium-low heat. Add the spinach and tomato and cook until the greens wilt.',
      'Pour in the eggs and gently draw the edges toward the center as they set. Scatter over the feta and herbs.',
      'Fold the omelette in half while still a little soft in the middle. Slide onto a warm plate and enjoy right away.',
    ],
    matchedIngredients: [],
  },
  {
    id: 'garlicky-lentil-soup',
    title: 'Garlicky Tomato & Lentil Soup',
    description: 'A hearty, spoonable bowl with soft lentils, sweet carrot and a bright finish of lemon.',
    imageUrl: unsplashImage('photo-1547592180-85f173990554'),
    prepTimeMinutes: 27,
    servings: 3,
    difficulty: 'Easy',
    ingredients: [
      { amount: '¾ cup', name: 'lentil' },
      { amount: '1', name: 'carrot' },
      { amount: '½', name: 'onion' },
      { amount: '2 cloves', name: 'garlic' },
      { amount: '1 cup', name: 'tomato' },
      { amount: '½', name: 'lemon' },
    ],
    instructions: [
      'Rinse the lentils. Dice the carrot and onion, then soften them in a splash of olive oil in a saucepan.',
      'Add the garlic and tomatoes and stir for a minute, scraping up the sweet bits at the bottom of the pan.',
      'Add the lentils and 3 cups of water or stock. Bring to a boil, then lower the heat and simmer until the lentils are tender.',
      'Season to taste and finish with a squeeze of lemon. Add a little water if you prefer a looser soup.',
    ],
    matchedIngredients: [],
  },
]

export const recipeTemplates: Recipe[] = recipeDefinitions.map((recipe) => ({
  ...recipe,
  baseServings: recipe.servings,
  ingredients: recipe.ingredients.map(withBaseQuantity),
}))
