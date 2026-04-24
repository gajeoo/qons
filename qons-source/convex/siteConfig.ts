/**
 * Site Configuration — admin-editable settings that propagate across the entire app.
 * Single "site" record pattern: one row keyed by "site".
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** Public — read site config (no auth required, used on landing page etc.) */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .first();
    if (!config) {
      // Return defaults
      return {
        companyName: "QonsApp",
        tagline: "AI-Powered Property Management",
        supportEmail: "support@quonsapp.com",
        supportPhone: "",
        primaryColor: "#14b8a6",
        logoUrl: "",
        faviconUrl: "",
        enableEmailNotifications: false,
        enableSmsNotifications: false,
        enablePushNotifications: false,
        enableEsignature: false,
        enableTenantScreening: false,
        landingHeroTitle: "",
        landingHeroSubtitle: "",
        announcementBanner: "",
      };
    }
    // Strip sensitive keys from public response
    const { sendgridApiKey, twilioAccountSid, twilioAuthToken, twilioPhoneNumber, vapidPrivateKey, ...publicConfig } = config;
    return publicConfig;
  },
});

/** Internal — full config with secrets (for backend use only) */
export const getInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .first();
  },
});

/** Admin-only — full config including integration keys (masked) */
export const getAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (profile?.role !== "admin") throw new Error("Admin only");

    const config = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .first();

    if (!config) return null;

    // Mask sensitive values but indicate if they're set
    return {
      ...config,
      sendgridApiKey: config.sendgridApiKey ? "••••" + config.sendgridApiKey.slice(-4) : "",
      twilioAccountSid: config.twilioAccountSid ? "••••" + config.twilioAccountSid.slice(-4) : "",
      twilioAuthToken: config.twilioAuthToken ? "••••" + config.twilioAuthToken.slice(-4) : "",
      twilioPhoneNumber: config.twilioPhoneNumber || "",
      vapidPublicKey: config.vapidPublicKey || "",
      vapidPrivateKey: config.vapidPrivateKey ? "••••" + config.vapidPrivateKey.slice(-4) : "",
    };
  },
});

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Admin-only — update site configuration */
export const update = mutation({
  args: {
    companyName: v.optional(v.string()),
    tagline: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    sendgridApiKey: v.optional(v.string()),
    twilioAccountSid: v.optional(v.string()),
    twilioAuthToken: v.optional(v.string()),
    twilioPhoneNumber: v.optional(v.string()),
    vapidPublicKey: v.optional(v.string()),
    vapidPrivateKey: v.optional(v.string()),
    enableEmailNotifications: v.optional(v.boolean()),
    enableSmsNotifications: v.optional(v.boolean()),
    enablePushNotifications: v.optional(v.boolean()),
    enableEsignature: v.optional(v.boolean()),
    enableTenantScreening: v.optional(v.boolean()),
    landingHeroTitle: v.optional(v.string()),
    landingHeroSubtitle: v.optional(v.string()),
    announcementBanner: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (profile?.role !== "admin") throw new Error("Admin only");

    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .first();

    // Build update, skipping masked/unchanged values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value === undefined) continue;
      // Don't overwrite with masked placeholder
      if (typeof value === "string" && value.startsWith("••••")) continue;
      updates[key] = value;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("siteConfig", {
        key: "site",
        companyName: "QonsApp",
        ...updates,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }
  },
});
