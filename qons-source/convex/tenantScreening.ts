import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const screeningStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("expired"),
);

const creditStatusValidator = v.union(
  v.literal("excellent"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("poor"),
  v.literal("unavailable"),
);

const backgroundStatusValidator = v.union(
  v.literal("clear"),
  v.literal("flags_found"),
  v.literal("pending"),
  v.literal("unavailable"),
);

const recommendationValidator = v.union(
  v.literal("approve"),
  v.literal("conditional"),
  v.literal("deny"),
  v.literal("review"),
);

/**
 * List tenant screenings with optional filters
 */
export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    status: v.optional(screeningStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 500;

    if (args.propertyId) {
      let screenings = await ctx.db
        .query("tenantScreenings")
        .withIndex("by_propertyId", (q) =>
          q.eq("propertyId", args.propertyId!),
        )
        .take(take);
      screenings = screenings.filter((s) => s.userId === userId);
      if (args.status) {
        screenings = screenings.filter((s) => s.status === args.status);
      }
      return screenings.sort((a, b) => b.requestedAt - a.requestedAt);
    }

    let screenings = await ctx.db
      .query("tenantScreenings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(take);

    if (args.status) {
      screenings = screenings.filter((s) => s.status === args.status);
    }

    return screenings.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

/**
 * Initiate a new tenant screening
 */
export const create = mutation({
  args: {
    applicantName: v.string(),
    applicantEmail: v.string(),
    applicantPhone: v.optional(v.string()),
    propertyId: v.id("properties"),
    unitNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("tenantScreenings", {
      ...args,
      userId,
      status: "pending",
      requestedAt: Date.now(),
    });
  },
});

/**
 * Update screening results
 */
export const update = mutation({
  args: {
    id: v.id("tenantScreenings"),
    status: v.optional(screeningStatusValidator),
    creditScore: v.optional(v.number()),
    creditStatus: v.optional(creditStatusValidator),
    backgroundStatus: v.optional(backgroundStatusValidator),
    incomeVerified: v.optional(v.boolean()),
    monthlyIncome: v.optional(v.number()),
    employerName: v.optional(v.string()),
    evictionHistory: v.optional(v.boolean()),
    recommendation: v.optional(recommendationValidator),
    notes: v.optional(v.string()),
    reportUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const screening = await ctx.db.get(args.id);
    if (!screening || screening.userId !== userId) throw new Error("Not found");

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    // If status is completed, set completedAt
    if (updates.status === "completed") {
      (filtered as any).completedAt = Date.now();
    }

    await ctx.db.patch(args.id, filtered);
  },
});

/**
 * Get a full screening report
 */
export const getReport = query({
  args: { id: v.id("tenantScreenings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const screening = await ctx.db.get(args.id);
    if (!screening || screening.userId !== userId) return null;

    // Enrich with property info
    const property = await ctx.db.get(screening.propertyId);

    return {
      ...screening,
      propertyName: property?.name ?? "Unknown",
      propertyAddress: property?.address ?? "",
    };
  },
});
