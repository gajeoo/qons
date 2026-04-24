import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

// Tiered plan configuration
const PLANS = {
  starter: {
    name: "QonsApp Starter",
    priceId:
      process.env.STRIPE_PRICE_STARTER || "price_1TNQm3HNPILwM73cSjWRwYac",
    monthlyAmount: 4599, // $45.99/mo
  },
  pro: {
    name: "QonsApp Professional",
    priceId:
      process.env.STRIPE_PRICE_PRO || "price_1TNQm3HNPILwM73cSjWRwYac",
    monthlyAmount: 9599, // $95.99/mo
  },
  enterprise: {
    name: "QonsApp Business",
    priceId:
      process.env.STRIPE_PRICE_ENTERPRISE || "price_1TNQm3HNPILwM73cSjWRwYac",
    monthlyAmount: 14099, // $140.99/mo
  },
} as const;

/**
 * Make a Stripe API request
 */
async function stripeRequest(
  endpoint: string,
  method: string,
  body?: Record<string, string>,
): Promise<Response> {
  // Use env var if set, otherwise fall back to test key
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey)
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  if (!secretKey) throw new Error("Stripe is not configured yet");

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  return fetch(`https://api.stripe.com/v1${endpoint}`, options);
}

/**
 * Create a Stripe Checkout Session for a subscription
 */
export const createCheckoutSession = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
  },
  returns: v.object({
    url: v.union(v.string(), v.null()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { plan }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { url: null, error: "Please sign in first" };
    }

    // Get user details
    const user = await ctx.runQuery(internal.stripe.getUserForCheckout, {
      userId,
    });
    if (!user) {
      return { url: null, error: "User not found" };
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];
    const priceId = planConfig?.priceId;
    if (!priceId) {
      return {
        url: null,
        error: "Stripe pricing not configured. Please contact support.",
      };
    }

    const siteUrl =
      process.env.SITE_URL || "https://qonsapp-website-d44d7bda.viktor.space";

    try {
      // Check if user already has a Stripe customer
      const existingSub = await ctx.runQuery(
        internal.stripe.getExistingSubscription,
        { userId },
      );

      const params: Record<string, string> = {
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing`,
        "metadata[userId]": userId,
        "metadata[plan]": plan,
        allow_promotion_codes: "true",
      };

      if (existingSub?.stripeCustomerId) {
        params.customer = existingSub.stripeCustomerId;
      } else if (user.email) {
        params.customer_email = user.email;
      }

      const response = await stripeRequest(
        "/checkout/sessions",
        "POST",
        params,
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("Stripe checkout error:", err);
        return { url: null, error: "Failed to create checkout session" };
      }

      const session = (await response.json()) as {
        url: string;
        id: string;
      };

      // Track the checkout session
      await ctx.runMutation(internal.stripe.trackCheckoutSession, {
        userId,
        stripeSessionId: session.id,
        plan,
      });

      return { url: session.url };
    } catch (e) {
      console.error("Stripe error:", e);
      return { url: null, error: "Payment system error. Please try again." };
    }
  },
});

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export const createPortalSession = action({
  args: {},
  returns: v.object({
    url: v.union(v.string(), v.null()),
    error: v.optional(v.string()),
  }),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { url: null, error: "Not authenticated" };
    }

    const sub = await ctx.runQuery(internal.stripe.getExistingSubscription, {
      userId,
    });
    if (!sub?.stripeCustomerId) {
      return { url: null, error: "No active subscription found" };
    }

    const siteUrl =
      process.env.SITE_URL || "https://qonsapp-website-d44d7bda.viktor.space";

    try {
      const response = await stripeRequest("/billing_portal/sessions", "POST", {
        customer: sub.stripeCustomerId,
        return_url: `${siteUrl}/dashboard`,
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Stripe portal error:", err);
        return { url: null, error: "Failed to create portal session" };
      }

      const session = (await response.json()) as { url: string };
      return { url: session.url };
    } catch (e) {
      console.error("Stripe portal error:", e);
      return { url: null, error: "Payment system error. Please try again." };
    }
  },
});

/**
 * Check Stripe configuration status
 */
export const getConfig = action({
  args: {},
  returns: v.object({
    isConfigured: v.boolean(),
    hasStarterPrice: v.boolean(),
    hasProPrice: v.boolean(),
    hasEnterprisePrice: v.boolean(),
  }),
  handler: async () => {
    return {
      isConfigured: !!process.env.STRIPE_SECRET_KEY,
      hasStarterPrice: !!PLANS.starter.priceId,
      hasProPrice: !!PLANS.pro.priceId,
      hasEnterprisePrice: !!PLANS.enterprise.priceId,
    };
  },
});

/**
 * Handle Stripe webhook events
 */
export const handleWebhook = internalAction({
  args: {
    eventType: v.string(),
    data: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { eventType, data }) => {
    console.log(`Processing Stripe webhook: ${eventType}`);

    switch (eventType) {
      case "checkout.session.completed": {
        const session = data as {
          id: string;
          customer: string;
          subscription: string;
          metadata: { userId: string; plan: string };
        };

        if (session.subscription && session.metadata?.userId) {
          // Fetch subscription details from Stripe
          const subResponse = await stripeRequest(
            `/subscriptions/${session.subscription}`,
            "GET",
          );

          if (subResponse.ok) {
            const sub = (await subResponse.json()) as {
              id: string;
              customer: string;
              status: string;
              current_period_start: number;
              current_period_end: number;
              cancel_at_period_end: boolean;
              items: {
                data: Array<{ price: { id: string } }>;
              };
            };

            const plan = (session.metadata.plan || "starter") as
              | "starter"
              | "pro"
              | "enterprise";

            await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
              userId: session.metadata.userId as any,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id ?? "",
              plan,
              status: sub.status as any,
              currentPeriodStart: sub.current_period_start * 1000,
              currentPeriodEnd: sub.current_period_end * 1000,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            });

            // Ensure user profile exists
            await ctx.runMutation(internal.stripe.ensureCustomerProfile, {
              userId: session.metadata.userId as any,
            });
          }

          // Update checkout session status
          await ctx.runMutation(internal.stripe.updateCheckoutSession, {
            stripeSessionId: session.id,
            status: "completed",
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = data as {
          id: string;
          status: string;
          cancel_at_period_end: boolean;
          current_period_start: number;
          current_period_end: number;
        };

        await ctx.runMutation(internal.subscriptions.updateByStripeId, {
          stripeSubscriptionId: sub.id,
          status: sub.status as any,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodStart: sub.current_period_start * 1000,
          currentPeriodEnd: sub.current_period_end * 1000,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = data as { id: string };
        await ctx.runMutation(internal.subscriptions.updateByStripeId, {
          stripeSubscriptionId: sub.id,
          status: "canceled",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = data as { subscription: string };
        if (invoice.subscription) {
          await ctx.runMutation(internal.subscriptions.updateByStripeId, {
            stripeSubscriptionId: invoice.subscription,
            status: "past_due",
          });
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return null;
  },
});

// Internal helpers

import { internalMutation, internalQuery } from "./_generated/server";

export const getUserForCheckout = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { name: user.name ?? undefined, email: user.email ?? undefined };
  },
});

export const getExistingSubscription = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      stripeCustomerId: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .first();
    if (!sub) return null;
    return { stripeCustomerId: sub.stripeCustomerId };
  },
});

export const trackCheckoutSession = internalMutation({
  args: {
    userId: v.id("users"),
    stripeSessionId: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("pro"),
      v.literal("enterprise"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("checkoutSessions", {
      userId: args.userId,
      stripeSessionId: args.stripeSessionId,
      plan: args.plan,
      status: "pending",
    });
    return null;
  },
});

export const updateCheckoutSession = internalMutation({
  args: {
    stripeSessionId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { stripeSessionId, status }) => {
    const session = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_stripeSessionId", q =>
        q.eq("stripeSessionId", stripeSessionId),
      )
      .unique();
    if (session) {
      await ctx.db.patch(session._id, { status });
    }
    return null;
  },
});

export const ensureCustomerProfile = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (existing) return null;

    const user = await ctx.db.get(userId);
    if (!user?.email) return null;

    const role = user.email === "gajeo21@gmail.com" ? "admin" : "customer";
    await ctx.db.insert("userProfiles", {
      userId,
      email: user.email,
      role,
    });
    return null;
  },
});
