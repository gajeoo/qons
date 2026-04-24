# Vercel Environment Payload

Copy these values into Vercel Project Settings -> Environment Variables.

## Production

VITE_CONVEX_URL=https://REPLACE_WITH_YOUR_PROD_CONVEX_DEPLOYMENT.convex.cloud
SITE_URL=https://REPLACE_WITH_YOUR_PROD_VERCEL_DOMAIN.vercel.app
CONVEX_SITE_URL=https://REPLACE_WITH_YOUR_PROD_CONVEX_DEPLOYMENT.convex.site
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_IF_USED
VITE_PAYPAL_CLIENT_ID=REPLACE_IF_USED
VITE_IS_PREVIEW=false

## Preview

VITE_CONVEX_URL=https://REPLACE_WITH_YOUR_PREVIEW_OR_DEV_CONVEX_DEPLOYMENT.convex.cloud
SITE_URL=https://REPLACE_WITH_YOUR_PREVIEW_VERCEL_DOMAIN.vercel.app
CONVEX_SITE_URL=https://REPLACE_WITH_YOUR_PREVIEW_OR_DEV_CONVEX_DEPLOYMENT.convex.site
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_IF_USED
VITE_PAYPAL_CLIENT_ID=REPLACE_IF_USED
VITE_IS_PREVIEW=true

## Development (optional in Vercel)

VITE_CONVEX_URL=https://REPLACE_WITH_DEV_CONVEX_DEPLOYMENT.convex.cloud
SITE_URL=http://localhost:5180
CONVEX_SITE_URL=https://REPLACE_WITH_DEV_CONVEX_DEPLOYMENT.convex.site
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_IF_USED
VITE_PAYPAL_CLIENT_ID=REPLACE_IF_USED
VITE_IS_PREVIEW=true

## Notes

- Required for app bootstrap/auth: VITE_CONVEX_URL, SITE_URL, CONVEX_SITE_URL
- Optional: Stripe and PayPal keys only if you want payment UI active.
- Convex backend secrets are NOT Vercel vars; set those with npx convex env set.
- Any env change in Vercel requires a redeploy.
