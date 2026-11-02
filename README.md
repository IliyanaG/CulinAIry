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

Recipe generation uses Gemini when configured. Transient Gemini HTTP errors (429 and 5xx) are retried up to three total attempts with exponential backoff and jitter; if those attempts fail, the app generates a local recipe and identifies it in the UI. Other errors are surfaced without retries. The app does not use a backend or user session. Favorite recipes are stored in the current browser's LocalStorage.

## Gemini recipe generation

Install the Gemini SDK:

```sh
npm install @google/generative-ai
```

Copy `.env.example` to `.env` in the project root and replace the placeholder:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Restart the Vite dev server after changing environment variables. Vite embeds all `VITE_` variables in the client bundle, so this key is visible to users and may be abused. Restrict its usage and quotas in Google AI Studio; use a server-side proxy with a server-only key for production. Only exhausted transient Gemini errors trigger local fallback; authentication, configuration, response-validation, and other non-transient errors are surfaced to the user.
