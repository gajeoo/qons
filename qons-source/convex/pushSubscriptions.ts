/**
 * Push Notification Subscriptions — manage browser push notification subscriptions.
 * Works with the service worker registered on the frontend.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Get current user's push subscriptions */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** Subscribe to push notifications */
export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if subscription already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        keys: args.keys,
        lastUsedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: args.endpoint,
      keys: args.keys,
      createdAt: Date.now(),
    });
  },
});

/** Unsubscribe from push notifications */
export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (sub && sub.userId === userId) {
      await ctx.db.delete(sub._id);
    }
  },
});

/** Get all subscriptions for a user (for sending notifications server-side) */
export const getForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
