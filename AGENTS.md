# Repository Guidelines

## Project Structure & Module Organization

This is a React 19, TypeScript, Vite, and Firebase application. Application code lives in `src/`: route-level views are in `screens/`, reusable UI in `components/`, form primitives in `forms/`, shared logic in `lib/`, and domain types in `types/`. Firebase initialization and repository-style data access live under `services/`; keep Firestore calls there rather than in components. Static PWA assets belong in `public/`. Firebase access policies are defined by `firestore.rules` and `storage.rules` at the repository root. Vite outputs disposable build artifacts to `dist/`.

## Build, Test, and Development Commands

- `npm ci` installs the exact versions recorded in `package-lock.json`.
- `npm run dev` starts the local Vite development server with hot reload.
- `npm run build` runs strict TypeScript checks, then creates the production bundle in `dist/`.
- `npm run preview` serves the production bundle for a final local check.

There is currently no automated test or lint command. Treat `npm run build` as the required pre-commit check.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, double quotes, semicolons, and trailing commas in multiline structures. Use `PascalCase` for React components and their files (`OrderCard.tsx`), `camelCase` for functions and hooks (`useAuth`), and descriptive repository names (`orderRepository.ts`). Prefer named exports, `type` imports, small functional components, and shared domain logic in `src/lib/`. Tailwind utility classes are the established styling approach. TypeScript is strict and rejects unused locals, unused parameters, and switch fallthrough.

## Testing Guidelines

No test framework or coverage threshold is configured. For each change, run `npm run build` and manually exercise the affected route in `npm run dev`. If tests are introduced, keep them beside the code as `*.test.ts` or `*.test.tsx`, and add one documented `npm test` script rather than bespoke commands.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-case subjects, such as `Fix unused Order import`. Keep each commit focused. Pull requests should explain the user-visible change, note manual verification, link any issue, and include before/after screenshots for UI work. Call out changes to Firebase rules or environment variables explicitly.

## Security & Configuration

Copy `.env.example` to `.env.local`; never commit credentials or local environment files. When changing admin emails, update `VITE_ADMIN_EMAILS`, `firestore.rules`, and `storage.rules` together before deployment. Do not weaken Firebase rules to work around client-side authorization errors.
