import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const subscriptionValidator = v.object({
  _id: v.id("subscriptions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.string(),
  stripePriceId: v.string(),
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
});

/**
 * Get current user's subscription
 */
export const getMine = query({
  args: {},
  returns: v.union(subscriptionValidator, v.null()),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

/**
 * List all subscriptions (admin only)
 */
export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("subscriptions"),
      _creationTime: v.number(),
      userId: v.id("users"),
      stripeCustomerId: v.string(),
      stripeSubscriptionId: v.string(),
      stripePriceId: v.string(),
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
      userName: v.optional(v.string()),
      userEmail: v.optional(v.string()),
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") return [];

    const subs = await ctx.db.query("subscriptions").order("desc").take(1000);

    // Enrich with user info
    const enriched = await Promise.all(
      subs.map(async sub => {
        const user = await ctx.db.get(sub.userId);
        return {
          ...sub,
          userName: user?.name ?? undefined,
          userEmail: user?.email ?? undefined,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Get subscription stats for admin dashboard
 */
export const getStats = query({
  args: {},
  returns: v.object({
    totalSubscribers: v.number(),
    activeSubscribers: v.number(),
    starterCount: v.number(),
    proCount: v.number(),
    enterpriseCount: v.number(),
    mrr: v.number(),
    canceledCount: v.number(),
    pastDueCount: v.number(),
  }),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        totalSubscribers: 0,
        activeSubscribers: 0,
        starterCount: 0,
        proCount: 0,
        enterpriseCount: 0,
        mrr: 0,
        canceledCount: 0,
        pastDueCount: 0,
      };

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin")
      return {
        totalSubscribers: 0,
        activeSubscribers: 0,
        starterCount: 0,
        proCount: 0,
        enterpriseCount: 0,
        mrr: 0,
        canceledCount: 0,
        pastDueCount: 0,
      };

    const allSubs = await ctx.db.query("subscriptions").take(1000);
    const active = allSubs.filter(s => s.status === "active");

    // Calculate MRR based on plan prices
    const planPrices: Record<string, number> = {
      starter: 4599,
      pro: 9599,
      enterprise: 14099,
    };

    const mrr = active.reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);

    return {
      totalSubscribers: allSubs.length,
      activeSubscribers: active.length,
      starterCount: active.filter(s => s.plan === "starter").length,
      proCount: active.filter(s => s.plan === "pro").length,
      enterpriseCount: active.filter(s => s.plan === "enterprise").length,
      mrr,
      canceledCount: allSubs.filter(s => s.status === "canceled").length,
      pastDueCount: allSubs.filter(s => s.status === "past_due").length,
    };
  },
});

/**
 * Internal: Create or update subscription from Stripe webhook
 */
export const upsertFromStripe = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if subscription exists
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", q =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        stripePriceId: args.stripePriceId,
        plan: args.plan,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      });
    } else {
      await ctx.db.insert("subscriptions", args);
    }
    return null;
  },
});

/**
 * Internal: Update subscription status by Stripe subscription ID
 */
export const updateByStripeId = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
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
    cancelAtPeriodEnd: v.optional(v.boolean()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", q =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();

    if (existing) {
      const patch: Record<string, unknown> = { status: args.status };
      if (args.cancelAtPeriodEnd !== undefined)
        patch.cancelAtPeriodEnd = args.cancelAtPeriodEnd;
      if (args.currentPeriodStart !== undefined)
        patch.currentPeriodStart = args.currentPeriodStart;
      if (args.currentPeriodEnd !== undefined)
        patch.currentPeriodEnd = args.currentPeriodEnd;
      await ctx.db.patch(existing._id, patch);
    }
    return null;
  },
});
