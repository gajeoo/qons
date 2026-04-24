import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const PAYPAL_SETTING_KEYS = {
  clientId: "PAYPAL_CLIENT_ID",
  clientSecret: "PAYPAL_CLIENT_SECRET",
  monthlyPlanId: "PAYPAL_PLAN_MONTHLY",
  annualPlanId: "PAYPAL_PLAN_ANNUAL",
  mode: "PAYPAL_MODE",
} as const;

// ========== Internal helpers to read config from DB ==========

export const _getSettingByKey = internalQuery({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key }) => {
    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return setting?.value ?? null;
  },
});

export const _upsertSetting = internalMutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("appSettings", { key, value, updatedAt: Date.now() });
    }
  },
});

/**
 * Simple base64 encode that works in any JS runtime
 */
function toBase64(str: string): string {
  if (typeof btoa === "function") {
    return btoa(str);
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    result += i + 2 < bytes.length ? chars[b3 & 63] : "=";
  }
  return result;
}

async function getPayPalCredentials(_ctx: any): Promise<{
  clientId: string;
  clientSecret: string;
  monthlyPlanId: string;
  annualPlanId: string;
  mode: "sandbox" | "live";
}> {
  const getSetting = async (key: string) => {
    const value = await _ctx.runQuery(internal.paypal._getSettingByKey, { key });
    return value?.trim() || null;
  };

  const clientId =
    (await getSetting(PAYPAL_SETTING_KEYS.clientId)) ??
    process.env.PAYPAL_CLIENT_ID?.trim() ??
    "";
  const clientSecret =
    (await getSetting(PAYPAL_SETTING_KEYS.clientSecret)) ??
    process.env.PAYPAL_CLIENT_SECRET?.trim() ??
    "";
  const monthlyPlanId =
    (await getSetting(PAYPAL_SETTING_KEYS.monthlyPlanId)) ??
    process.env.PAYPAL_PLAN_MONTHLY?.trim() ??
    "";
  const annualPlanId =
    (await getSetting(PAYPAL_SETTING_KEYS.annualPlanId)) ??
    process.env.PAYPAL_PLAN_ANNUAL?.trim() ??
    "";
  const modeValue =
    (await getSetting(PAYPAL_SETTING_KEYS.mode)) ??
    process.env.PAYPAL_MODE?.trim() ??
    "live";

  return {
    clientId,
    clientSecret,
    monthlyPlanId,
    annualPlanId,
    mode: modeValue === "sandbox" ? "sandbox" : "live",
  };
}

function hasConfiguredValue(value: string | null | undefined) {
  return !!value && !value.startsWith("YOUR_PAYPAL_");
}

/**
 * Helper: get PayPal access token
 * Uses both Authorization header AND body params for maximum compatibility
 */
async function getPayPalAccessToken(ctx: any): Promise<{ accessToken: string; mode: string }> {
  const { clientId, clientSecret, monthlyPlanId, annualPlanId, mode } =
    await getPayPalCredentials(ctx);

  if (
    !hasConfiguredValue(clientId) ||
    !hasConfiguredValue(clientSecret) ||
    !hasConfiguredValue(monthlyPlanId) ||
    !hasConfiguredValue(annualPlanId)
  ) {
    throw new Error(
      "PayPal is not configured. Add the client ID, client secret, monthly plan ID, and annual plan ID in Admin > Subscribers.",
    );
  }

  const baseUrl = mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const authBase64 = toBase64(`${clientId}:${clientSecret}`);
  const url = `${baseUrl}/v1/oauth2/token`;

  // Method 1: Authorization header (standard)
  let response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Accept-Language": "en_US",
      "Authorization": `Basic ${authBase64}`,
    },
    body: "grant_type=client_credentials",
  });

  // Method 2: If header auth fails, try body params
  if (response.status === 401) {
    console.log("[PayPal] Header auth failed, trying body params...");
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Accept-Language": "en_US",
      },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PayPal] Token error (${response.status}):`, errorText);
    // v7 marker: confirms this exact code is running
    throw new Error(
      `[v7] PayPal auth failed (${response.status}) cid=${clientId.substring(0, 6)}: ${errorText.substring(0, 150)}`
    );
  }

  const data = (await response.json()) as { access_token: string };
  return { accessToken: data.access_token, mode };
}

function getBaseUrl(mode: string): string {
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPeriodEndFromBillingCycle(
  billingCycle: "monthly" | "annual",
  now = Date.now(),
) {
  const days = billingCycle === "annual" ? 365 : 30;
  return now + days * 24 * 60 * 60 * 1000;
}

function mapBillingCycleToPlan(): "starter" | "pro" | "enterprise" {
  return "starter";
}

/**
 * Create a recurring PayPal subscription
 */
export const createSubscription = action({
  args: {
    billingCycle: v.union(v.literal("monthly"), v.literal("annual")),
  },
  returns: v.object({
    subscriptionId: v.union(v.string(), v.null()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { billingCycle }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { subscriptionId: null, error: "Not authenticated" };

    try {
      const { accessToken, mode, monthlyPlanId, annualPlanId } =
        await getPayPalAccessToken(ctx).then(async (tokenRes) => {
          const creds = await getPayPalCredentials(ctx);
          return { ...tokenRes, ...creds };
        });
      const baseUrl = getBaseUrl(mode);
      const planId = billingCycle === "annual" ? annualPlanId : monthlyPlanId;

      if (!hasConfiguredValue(planId)) {
        return {
          subscriptionId: null,
          error:
            "PayPal plan IDs are not configured. Add the monthly and annual plan IDs in Admin > Subscribers.",
        };
      }

      const response = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Prefer: "return=representation",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: `${userId}|${billingCycle}`,
          application_context: {
            brand_name: "QuonsApp",
            user_action: "SUBSCRIBE_NOW",
            payment_method: {
              payer_selected: "PAYPAL",
              payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[PayPal] Create subscription error:", errorText);
        return {
          subscriptionId: null,
          error: `Subscription failed: ${errorText.substring(0, 200)}`,
        };
      }

      const subscription = (await response.json()) as { id: string };
      return { subscriptionId: subscription.id };
    } catch (e: any) {
      console.error("[PayPal] Error:", e);
      return { subscriptionId: null, error: e.message || "PayPal error" };
    }
  },
});

/**
 * Confirm an approved PayPal subscription and store it in Convex.
 */
export const confirmSubscription = action({
  args: {
    subscriptionId: v.string(),
    billingCycle: v.union(v.literal("monthly"), v.literal("annual")),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { subscriptionId, billingCycle }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    try {
      const { accessToken, mode } = await getPayPalAccessToken(ctx);
      const baseUrl = getBaseUrl(mode);

      const response = await fetch(
        `${baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[PayPal] Confirm subscription error:", errorText);
        return {
          success: false,
          error: `Confirm failed (${response.status}): ${errorText.substring(0, 200)}`,
        };
      }

      const subscriptionData = (await response.json()) as {
        status: string;
        id: string;
        subscriber?: {
          payer_id?: string;
          email_address?: string;
        };
        billing_info?: {
          next_billing_time?: string;
        };
      };

      if (
        subscriptionData.status !== "ACTIVE" &&
        subscriptionData.status !== "APPROVAL_PENDING"
      ) {
        return {
          success: false,
          error: `Subscription status: ${subscriptionData.status}`,
        };
      }

      const now = Date.now();
      const nextBillingTime = subscriptionData.billing_info?.next_billing_time
        ? new Date(subscriptionData.billing_info.next_billing_time).getTime()
        : null;
      const periodEnd =
        Number.isFinite(nextBillingTime) && nextBillingTime
          ? nextBillingTime
          : getPeriodEndFromBillingCycle(billingCycle, now);
      const plan = mapBillingCycleToPlan();

      await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
        userId,
        stripeCustomerId:
          subscriptionData.subscriber?.payer_id ||
          `paypal_customer_${userId}`,
        stripeSubscriptionId: `paypal_sub_${subscriptionData.id}`,
        stripePriceId: `paypal_${billingCycle}`,
        billingProvider: "paypal",
        billingCycle,
        plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });

      return { success: true };
    } catch (e: any) {
      console.error("[PayPal] Confirm subscription error:", e);
      return { success: false, error: e.message || "PayPal error" };
    }
  },
});

/**
 * Cancel current user's PayPal subscription at period end.
 */
export const cancelMySubscription = action({
  args: {},
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const sub = await ctx.runQuery(internal.paypal._getLatestSubscriptionByUser, {
      userId,
    });
    if (!sub) return { success: false, error: "No subscription found" };

    if (!sub.stripeSubscriptionId.startsWith("paypal_sub_")) {
      return {
        success: false,
        error: "This subscription is managed outside PayPal",
      };
    }

    const paypalSubscriptionId = sub.stripeSubscriptionId.replace("paypal_sub_", "");

    try {
      const { accessToken, mode } = await getPayPalAccessToken(ctx);
      const baseUrl = getBaseUrl(mode);

      // Request cancellation on PayPal side.
      await fetch(`${baseUrl}/v1/billing/subscriptions/${paypalSubscriptionId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });

      // Keep local access until the current paid cycle ends.
      await ctx.runMutation(internal.subscriptions.updateByStripeId, {
        stripeSubscriptionId: sub.stripeSubscriptionId,
        status: "active",
        cancelAtPeriodEnd: true,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to cancel" };
    }
  },
});

export const _getLatestSubscriptionByUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("subscriptions"),
      _creationTime: v.number(),
      userId: v.id("users"),
      stripeCustomerId: v.string(),
      stripeSubscriptionId: v.string(),
      stripePriceId: v.string(),
      billingProvider: v.optional(
        v.union(v.literal("stripe"), v.literal("paypal"), v.literal("admin")),
      ),
      billingCycle: v.optional(
        v.union(v.literal("monthly"), v.literal("annual")),
      ),
      plan: v.union(
        v.literal("starter"),
        v.literal("pro"),
        v.literal("enterprise"),
      ),
      status: v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("incomplete"),
        v.literal("trialing"),
        v.literal("incomplete_expired"),
        v.literal("unpaid"),
        v.literal("paused"),
      ),
      currentPeriodStart: v.number(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      pausedAt: v.optional(v.number()),
      pausedByAdmin: v.optional(v.boolean()),
      assignedByAdmin: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

/**
 * Check if PayPal is configured
 */
export const isConfigured = action({
  args: {},
  returns: v.object({
    configured: v.boolean(),
    clientId: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    try {
      const { clientId, clientSecret, monthlyPlanId, annualPlanId } =
        await getPayPalCredentials(ctx);
      const configured =
        hasConfiguredValue(clientId) &&
        hasConfiguredValue(clientSecret) &&
        hasConfiguredValue(monthlyPlanId) &&
        hasConfiguredValue(annualPlanId);
      return {
        configured,
        clientId: configured ? clientId : null,
      };
    } catch {
      return { configured: false, clientId: null };
    }
  },
});

export const getAdminConfig = query({
  args: {},
  returns: v.object({
    configured: v.boolean(),
    clientId: v.string(),
    hasClientSecret: v.boolean(),
    monthlyPlanId: v.string(),
    annualPlanId: v.string(),
    mode: v.union(v.literal("sandbox"), v.literal("live")),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.runQuery(internal.admin.getProfileInternal, {
      userId,
    });
    if (!profile || profile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const { clientId, clientSecret, monthlyPlanId, annualPlanId, mode } =
      await getPayPalCredentials(ctx);

    return {
      configured:
        hasConfiguredValue(clientId) &&
        hasConfiguredValue(clientSecret) &&
        hasConfiguredValue(monthlyPlanId) &&
        hasConfiguredValue(annualPlanId),
      clientId: hasConfiguredValue(clientId) ? clientId : "",
      hasClientSecret: hasConfiguredValue(clientSecret),
      monthlyPlanId: hasConfiguredValue(monthlyPlanId) ? monthlyPlanId : "",
      annualPlanId: hasConfiguredValue(annualPlanId) ? annualPlanId : "",
      mode,
    };
  },
});

/**
 * Admin: store PayPal credentials in the database
 * Use this to update credentials without redeploying
 */
export const setCredentials = action({
  args: {
    clientId: v.string(),
    clientSecret: v.optional(v.string()),
    monthlyPlanId: v.string(),
    annualPlanId: v.string(),
    mode: v.union(v.literal("sandbox"), v.literal("live")),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, { clientId, clientSecret, monthlyPlanId, annualPlanId, mode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const profile = await ctx.runQuery(internal.admin.getProfileInternal, { userId });
    if (!profile || profile.role !== "admin") {
      return { success: false, error: "Admin access required" };
    }

    const existingSecret = await ctx.runQuery(internal.paypal._getSettingByKey, {
      key: PAYPAL_SETTING_KEYS.clientSecret,
    });

    if (!clientId.trim() || !monthlyPlanId.trim() || !annualPlanId.trim()) {
      return {
        success: false,
        error: "Client ID, monthly plan ID, and annual plan ID are required.",
      };
    }

    if (!clientSecret?.trim() && !hasConfiguredValue(existingSecret)) {
      return {
        success: false,
        error: "Client secret is required the first time you configure PayPal.",
      };
    }

    await ctx.runMutation(internal.paypal._upsertSetting, {
      key: PAYPAL_SETTING_KEYS.clientId,
      value: clientId.trim(),
    });
    if (clientSecret?.trim()) {
      await ctx.runMutation(internal.paypal._upsertSetting, {
        key: PAYPAL_SETTING_KEYS.clientSecret,
        value: clientSecret.trim(),
      });
    }
    await ctx.runMutation(internal.paypal._upsertSetting, {
      key: PAYPAL_SETTING_KEYS.monthlyPlanId,
      value: monthlyPlanId.trim(),
    });
    await ctx.runMutation(internal.paypal._upsertSetting, {
      key: PAYPAL_SETTING_KEYS.annualPlanId,
      value: annualPlanId.trim(),
    });
    await ctx.runMutation(internal.paypal._upsertSetting, {
      key: PAYPAL_SETTING_KEYS.mode,
      value: mode,
    });

    return { success: true };
  },
});
