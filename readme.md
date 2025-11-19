# Modelia AI Studio

[![CI](https://github.com/surajsharma/modelia/actions/workflows/ci.yml/badge.svg)](https://github.com/surajsharma/modelia/actions/workflows/ci.yml)

## Running with docker

- start the app:
    ```
    pnpm docker:up
    ```
- the app will be available on [localhost:5173/](127.0.0.1:5173/)
- to stop:
    ```
    pnpm docker:down
    ```

## Backend

### Authentication
- ✅ JWT-based auth with /auth/signup and /auth/login.
- ✅ Password hashing (bcrypt).
- ✅ Token-protected routes for logged-in users.

### Generations API
- ✅ POST /generations: accept { prompt, style, imageUpload }.
- ✅ Simulate a generation delay (1–2 seconds).
- ✅ 20% chance of returning { message: "Model overloaded" }.
- ✅ On success, return { id, imageUrl, prompt, style, createdAt, status }.
- ✅ GET /generations?limit=5: return the last 5 generations for the authenticated user.
- ✅ Validate inputs with zod or joi.
- ✅ Persist users and generations in a simple SQLite or PostgreSQL database.
- ✅ Provide an OpenAPI spec (YAML) describing all endpoints.

### Architecture & Quality
- ✅ Clear folder structure (controllers, routes, models, services).
- ✅ TypeScript strict mode enabled.
- ✅ ESLint + Prettier configured.
- ✅ Docker (optional): docker-compose up starts API + DB + FE.

### Testing

- run `npx jest` to run unit tests

## Frontend

### User Auth
- ✅ Signup and Login forms connected to your backend via JWT.
- ✅ Persist session locally (e.g., localStorage) and handle logout cleanly.

### Image Generation Studio
- ✅ Upload an image (max 10MB, JPEG/PNG), show a live preview.
- ✅ Input field for “Prompt” and dropdown for “Style” (3+ options).
- ✅ On “Generate,” call your backend; show a spinner during processing.
- ✅ Randomly simulate 20% “Model overloaded” errors — user should see a friendly retry message.
- ✅ Allow retry (up to 3 times) and Abort mid-generation.
- ✅ Display last 5 generations (fetched from backend) with preview thumbnails and timestamps.
- ✅ Clicking a past generation restores it into the current workspace.

### Accessibility & UX
- ✅ Keyboard-friendly navigation, focus states, and ARIA roles.
- ✅ Responsive layout that works well on desktop and mobile.
- ✅ Show clear error messages and disabled states during network calls.

### Testing

- run `pnpm test` to run unit tests


## e2e tests with playwright

- in the root directory, this single command - builds, runs tests, exits
  
```
pnpm docker:test
```

## Bonuses (optional)
- ✅ Image resizing before upload (max width 1920px).
- Code splitting and lazy loading.
- Caching static assets and using a CDN.
- ✅ Add a dark mode toggle.
- Small UI animation (Framer Motion or CSS transitions).

## CI/CD

- ✅ runs all unit tests
- ✅ runs all e2e tests
- ✅ ensures both pass

## Other deliverables

- [AI_USAGE](./AI_USAGE.md)
- [EVAL](./EVAL.md)
- [OPENAPI.YAML](./backend/OPENAPI.yaml)
  - API docs are at [localhost:4000/api-docs/](127.0.0.1:4000/api-docs/) while the app is up
