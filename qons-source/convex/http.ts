import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

declare const process: { env: Record<string, string | undefined> };

const http = httpRouter();

// Auth routes
auth.addHttpRoutes(http);

// Stripe webhook endpoint
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // If webhook secret is configured, verify signature
    if (webhookSecret && signature) {
      const body = await req.text();
      const isValid = await verifyStripeSignature(
        body,
        signature,
        webhookSecret,
      );
      if (!isValid) {
        console.error("Invalid Stripe webhook signature");
        return new Response("Invalid signature", { status: 400 });
      }

      const event = JSON.parse(body);
      await ctx.runAction(internal.stripe.handleWebhook, {
        eventType: event.type,
        data: event.data.object,
      });
    } else {
      // Without webhook secret, still process (for development)
      const body = await req.json();
      await ctx.runAction(internal.stripe.handleWebhook, {
        eventType: body.type,
        data: body.data.object,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Health check endpoint
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "QonsApp API",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

/**
 * Verify Stripe webhook signature using Web Crypto API
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = signature.split(",").reduce(
      (acc, part) => {
        const [key, value] = part.split("=");
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const timestamp = parts.t;
    const expectedSig = parts.v1;

    if (!timestamp || !expectedSig) return false;

    // Check timestamp is within tolerance (5 min)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number.parseInt(timestamp, 10)) > 300) return false;

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload),
    );
    const computedSig = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSig === expectedSig;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

// Admin endpoint to configure PayPal credentials in database
// Secured with CONVEX_DEPLOY_KEY or a shared secret
http.route({
  path: "/api/configure-paypal",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const authHeader = req.headers.get("Authorization");
      const expectedSecret =
        process.env.ADMIN_API_SECRET ||
        process.env.VIKTOR_SPACES_PROJECT_SECRET;

      if (
        !authHeader ||
        !expectedSecret ||
        authHeader !== `Bearer ${expectedSecret}`
      ) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = (await req.json()) as {
        clientId: string;
        clientSecret: string;
        mode: string;
      };

      if (!body.clientId || !body.clientSecret) {
        return new Response(
          JSON.stringify({ error: "Missing clientId or clientSecret" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      await ctx.runMutation(internal.paypal._upsertSetting, {
        key: "PAYPAL_CLIENT_ID",
        value: body.clientId,
      });
      await ctx.runMutation(internal.paypal._upsertSetting, {
        key: "PAYPAL_CLIENT_SECRET",
        value: body.clientSecret,
      });
      await ctx.runMutation(internal.paypal._upsertSetting, {
        key: "PAYPAL_MODE",
        value: body.mode || "live",
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
