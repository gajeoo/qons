# Vercel Deployment Checklist

Use this checklist to deploy the frontend reliably.

## Project Settings

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `dist`
- Root Directory: project root

The SPA rewrite is already configured in `vercel.json`.

## Required Environment Variables (Vercel)

Add these in Vercel Project Settings -> Environment Variables:

- `VITE_CONVEX_URL` (required)
- `SITE_URL` (required for auth callbacks; use your Vercel app URL)
- `CONVEX_SITE_URL` (required for auth provider domain; use your convex.site URL)

Optional frontend variables:

- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_PAYPAL_CLIENT_ID`
- `VITE_IS_PREVIEW` (use `true` only for preview deployments)

Template values are available in `.env.vercel.example`.
Ready-to-paste environment blocks are in `VERCEL_ENV_PAYLOAD.md`.

## Convex Backend Environment (Not in Vercel)

Backend runtime secrets used by Convex functions must be set in Convex, not in Vercel.
Examples include Stripe secret keys, webhook secrets, and Viktor Spaces secrets.

Use:

```bash
npx convex env list
npx convex env set NAME value
```

## Deploy Steps

1. Import the repository into Vercel.
2. Confirm build settings above.
3. Add `VITE_CONVEX_URL` in Vercel env vars.
4. (Optional) Add Stripe/PayPal preview variables.
5. Deploy.
6. After any env var change, redeploy.

## Verification

- Open `/` and confirm app renders (no blank page).
- Open `/pricing` and confirm payment section behavior:
  - Stripe and PayPal paths appear only when configured.
- Verify auth pages load and route fallback works for deep links.
