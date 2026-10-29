# culinAIry

culinAIry is a frontend-only recipe generator built with Vite, React, TypeScript, and Tailwind CSS. Add ingredients you have on hand, choose how much time you have, and get a recipe from a small local mock collection. Save recipes to browser LocalStorage for your next visit.

## Getting started

```sh
npm install
npm run dev
```

## Available scripts

- `npm run dev` — start the Vite development server.
- `npm run build` — type-check and create a production build.
- `npm run test` — run the recipe and favorite-storage tests.
- `npm run lint` — lint the project with Oxlint.

Recipe generation is simulated locally; the app does not use a backend, account, or user session. Favorite recipes are stored in the current browser's LocalStorage.
