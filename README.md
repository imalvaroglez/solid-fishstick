# Store OS

React + Firebase order management with isolated stores and public catalogs.

## Local setup

1. `npm ci`
2. Copy `.env.example` to `.env.local` and fill the Firebase values.
3. Add the existing admins' Auth UIDs to `VITE_LEGACY_ADMIN_UIDS`.
4. Run `npm run dev`.

Java 21+ is required only for the Firebase emulators.

For a production-free local sandbox, run `npm run emulators` and
`npm run dev:emulator` in separate terminals. Create an account from the login
screen; all data stays in the local emulators.

## Verification

`npm run verify`

This starts fresh Auth, Firestore, and Storage emulators and runs the production
build, rules/migration tests, and Playwright browser flow. It never deploys or
touches production data.
