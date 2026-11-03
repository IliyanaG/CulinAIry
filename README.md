# culinAIry

culinAIry is a recipe generator built with React, TypeScript, and Vite. Add ingredients, choose a time limit, generate a recipe, adjust servings, and save favorites to browser LocalStorage.

Recipe generation now uses a small Node.js API server and the Groq API. The browser sends ingredient and time-filter data to the local server; only the server reads `GROQ_API_KEY`. The Vite development server proxies `/api` requests to this server.

## Requirements

- Node.js 20.12 or newer
- A Groq API key available to the server process

From the project root, create `.env.local` from the example:

```sh
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Then set your Groq key in `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key
```

`.env.local` is ignored by Git. Never commit real API keys or other secrets, and never use a `VITE_` prefix for this key. Keep `.env.example` limited to placeholder values.

Install dependencies:

```sh
npm install
```

Start the backend and frontend independently in two terminals, from the project root:

Terminal 1:

```sh
npm run dev:api
```

Terminal 2:

```sh
npm run dev:web
```

The frontend is served at `http://localhost:3000` and the API server listens at `http://localhost:5000`. The Groq key is not included in the frontend bundle. Groq credentials and request headers are not logged.

## Recipe generation details

The server calls Groq's Chat Completions API using the official `groq-sdk` package and model [`openai/gpt-oss-20b`](https://console.groq.com/docs/model/openai/gpt-oss-20b). Groq lists the model as a hosted production model and documents strict JSON Schema support for it in its [Structured Outputs guide](https://console.groq.com/docs/structured-outputs). The model page reports high inference throughput; actual availability and rate limits depend on the Groq account and current plan.

Requests have an 8-second timeout and the SDK's automatic retries are disabled. The server retries at most once for transient network failures and HTTP 408, 429, or 5xx responses. A timeout, exhausted transient failure, or network error uses the existing local recipe generator. Recipe response validation, ingredient checks, and time filters are preserved. Obsolete requests are aborted when the user changes ingredients or filters.

The Vite proxy and local API server are development setup. A deployed app must also run or host the API server, configure `GROQ_API_KEY` as a server-side secret, and route `/api` traffic to it.

## Available scripts

- `npm run dev` — start the API server and Vite frontend together.
- `npm run dev:api` — start the API server only.
- `npm run dev:web` — start the Vite frontend only.
- `npm run build` — type-check and create the frontend production build.
- `npm test` — run unit tests.
- `npm run lint` — lint the project.
- `npm run preview` — preview the built frontend (requires a separately running API server for generation).
