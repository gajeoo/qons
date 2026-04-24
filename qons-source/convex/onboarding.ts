import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get current user's onboarding data
 */
export const getMine = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("onboarding"),
      _creationTime: v.number(),
      userId: v.id("users"),
      companyName: v.optional(v.string()),
      numberOfProperties: v.optional(v.string()),
      teamSize: v.optional(v.string()),
      useCases: v.optional(v.array(v.string())),
      completed: v.boolean(),
      completedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("onboarding")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
  },
});

/**
 * Save onboarding data (partial or complete)
 */
export const save = mutation({
  args: {
    companyName: v.optional(v.string()),
    numberOfProperties: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    useCases: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("onboarding", {
        userId,
        ...args,
        completed: false,
      });
    }
    return null;
  },
});

/**
 * Complete onboarding
 */
export const complete = mutation({
  args: {
    companyName: v.optional(v.string()),
    numberOfProperties: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    useCases: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        completed: true,
        completedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("onboarding", {
        userId,
        ...args,
        completed: true,
        completedAt: Date.now(),
      });
    }
    return null;
  },
});
