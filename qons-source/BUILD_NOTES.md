
## CRITICAL: .env.local Required for Builds
The app uses `import.meta.env.VITE_CONVEX_URL` in `src/main.tsx`. Without it, the app shows
"CONFIGURATION REQUIRED" and won't connect to Convex at all.

Before any `vite build`, ensure `.env.local` exists with:
```
VITE_CONVEX_URL=https://glorious-bird-827.convex.cloud
```

This gets baked into the JS bundle at build time by Vite's env replacement.
