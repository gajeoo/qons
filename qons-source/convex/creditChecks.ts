/**
 * Credit / Background Check Module — request, track, and review tenant screening results.
 * Supports TransUnion & Experian APIs (when keys configured) + manual entry fallback.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** List credit checks for the organization */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("creditChecks")
      .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", userId))
      .order("desc")
      .collect();
  },
});

/** Get a specific credit check */
export const get = query({
  args: { id: v.id("creditChecks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const check = await ctx.db.get(args.id);
    if (!check) return null;
    // Only allow owner or the applicant to view
    if (check.organizationUserId !== userId && check.applicantUserId !== userId) {
      return null;
    }
    return check;
  },
});

/** Get checks for a specific application */
export const getByApplication = query({
  args: { applicationId: v.id("renterApplications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("creditChecks")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .collect();
  },
});

/** Get stats for the organization */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, pending: 0, completed: 0, avgScore: 0 };
    const checks = await ctx.db
      .query("creditChecks")
      .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", userId))
      .collect();

    const completed = checks.filter((c) => c.status === "completed");
    const scores = completed.filter((c) => c.creditScore).map((c) => c.creditScore!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      total: checks.length,
      pending: checks.filter((c) => c.status === "pending" || c.status === "processing").length,
      completed: completed.length,
      avgScore,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Request a new credit/background check */
export const request = mutation({
  args: {
    applicantUserId: v.id("users"),
    applicationId: v.optional(v.id("renterApplications")),
    provider: v.union(v.literal("transunion"), v.literal("experian"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("creditChecks", {
      applicantUserId: args.applicantUserId,
      organizationUserId: userId,
      applicationId: args.applicationId,
      provider: args.provider,
      status: args.provider === "manual" ? "completed" : "pending",
      requestedAt: Date.now(),
      fee: args.provider === "manual" ? 0 : 2500, // $25 per check
    });
  },
});

/** Update credit check with results (manual entry or webhook callback) */
export const updateResults = mutation({
  args: {
    id: v.id("creditChecks"),
    creditScore: v.optional(v.number()),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    reportSummary: v.optional(v.string()),
    criminalClear: v.optional(v.boolean()),
    evictionClear: v.optional(v.boolean()),
    incomeVerified: v.optional(v.boolean()),
    monthlyIncome: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const check = await ctx.db.get(id);
    if (!check || check.organizationUserId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(id, {
      ...updates,
      status: "completed",
      completedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  },
});

/** Mark a check as failed */
export const markFailed = mutation({
  args: { id: v.id("creditChecks"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, { status: "failed", notes: args.notes });
  },
});
