import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

declare const process: { env: Record<string, string | undefined> };

const http = httpRouter();

// Auth routes
auth.addHttpRoutes(http);

const OAUTH_PROVIDERS = ["quickbooks", "yardi", "docusign", "hellosign"] as const;

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

for (const provider of OAUTH_PROVIDERS) {
  http.route({
    path: `/oauth/${provider}/callback`,
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const realmId = url.searchParams.get("realmId") || undefined;
      const error = url.searchParams.get("error") || undefined;

      if (error) {
        const redirect = `${process.env.SITE_URL || "http://127.0.0.1:5173"}/integrations?provider=${provider}&status=error&message=${encodeURIComponent(error)}`;
        return Response.redirect(redirect, 302);
      }

      if (!code || !state) {
        return new Response("Missing OAuth code/state", { status: 400 });
      }

      const result = await ctx.runAction(internal.providerAdapters.handleOAuthCallback, {
        provider,
        code,
        state,
        realmId,
      });
      return Response.redirect(result.redirectUrl, 302);
    }),
  });
}

http.route({
  path: "/webhooks/quickbooks",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = await req.text();
    const signature = req.headers.get("intuit-signature");
    const secret = process.env.QUICKBOOKS_WEBHOOK_SECRET;
    if (secret && signature) {
      const valid = await verifyHmacSignature(payload, signature, secret, "base64");
      if (!valid) return new Response("Invalid signature", { status: 401 });
    }

    const json = safeJson(payload);
    const realmId = json?.eventNotifications?.[0]?.realmId || json?.realmId;
    await ctx.runAction(internal.providerAdapters.handleWebhookSync, {
      provider: "quickbooks",
      payload,
      eventType: "quickbooks.notification",
      externalAccountId: realmId,
    });
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

http.route({
  path: "/webhooks/yardi",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = await req.text();
    const signature = req.headers.get("x-yardi-signature");
    const secret = process.env.YARDI_WEBHOOK_SECRET;
    if (secret && signature) {
      const valid = await verifyHmacSignature(payload, signature, secret, "hex");
      if (!valid) return new Response("Invalid signature", { status: 401 });
    }

    const json = safeJson(payload);
    const accountId = json?.accountId || json?.clientId || json?.realmId;
    await ctx.runAction(internal.providerAdapters.handleWebhookSync, {
      provider: "yardi",
      payload,
      eventType: json?.eventType || json?.type || "yardi.notification",
      externalAccountId: accountId,
    });
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

http.route({
  path: "/webhooks/docusign",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = await req.text();
    const signature = req.headers.get("x-docusign-signature-1");
    const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;
    if (secret && signature) {
      const valid = await verifyHmacSignature(payload, signature, secret, "hexOrBase64");
      if (!valid) return new Response("Invalid signature", { status: 401 });
    }

    const json = safeJson(payload);
    const accountId = json?.accountId || json?.account_id;
    await ctx.runAction(internal.providerAdapters.handleWebhookSync, {
      provider: "docusign",
      payload,
      eventType: json?.event || json?.eventType || "docusign.notification",
      externalAccountId: accountId,
    });
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

http.route({
  path: "/webhooks/hellosign",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = await req.text();
    const signature = req.headers.get("x-hellosign-signature");
    const secret = process.env.HELLOSIGN_WEBHOOK_SECRET;
    if (secret && signature) {
      const valid = await verifyHmacSignature(payload, signature, secret, "hexOrBase64");
      if (!valid) return new Response("Invalid signature", { status: 401 });
    }

    const json = safeJson(payload);
    const accountId = json?.account_id || json?.accountId;
    await ctx.runAction(internal.providerAdapters.handleWebhookSync, {
      provider: "hellosign",
      payload,
      eventType: json?.event?.event_type || json?.eventType || "hellosign.notification",
      externalAccountId: accountId,
    });
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
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
    if (Math.abs(now - Number.parseInt(timestamp)) > 300) return false;

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
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSig === expectedSig;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

function safeJson(payload: string): any {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  mode: "hex" | "base64" | "hexOrBase64",
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const bytes = new Uint8Array(sig);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const base64 = btoa(String.fromCharCode(...bytes));
    const cleaned = signature.trim();
    if (mode === "hex") return cleaned === hex;
    if (mode === "base64") return cleaned === base64;
    return cleaned === hex || cleaned === base64;
  } catch (e) {
    console.error("HMAC verification error", e);
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
      const expectedSecret = process.env.ADMIN_API_SECRET || process.env.VIKTOR_SPACES_PROJECT_SECRET;
      
      if (!authHeader || !expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json() as {
        clientId: string;
        clientSecret: string;
        monthlyPlanId: string;
        annualPlanId: string;
        mode: string;
      };
      
      if (!body.clientId || !body.clientSecret || !body.monthlyPlanId || !body.annualPlanId) {
        return new Response(JSON.stringify({ error: "Missing clientId, clientSecret, monthlyPlanId, or annualPlanId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await ctx.runMutation(internal.paypal._upsertSetting, { key: "PAYPAL_CLIENT_ID", value: body.clientId });
      await ctx.runMutation(internal.paypal._upsertSetting, { key: "PAYPAL_CLIENT_SECRET", value: body.clientSecret });
      await ctx.runMutation(internal.paypal._upsertSetting, { key: "PAYPAL_PLAN_MONTHLY", value: body.monthlyPlanId });
      await ctx.runMutation(internal.paypal._upsertSetting, { key: "PAYPAL_PLAN_ANNUAL", value: body.annualPlanId });
      await ctx.runMutation(internal.paypal._upsertSetting, { key: "PAYPAL_MODE", value: body.mode || "live" });

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
