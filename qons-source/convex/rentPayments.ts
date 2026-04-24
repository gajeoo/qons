import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List rent payments with optional filters
 */
export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    residentId: v.optional(v.id("residents")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("refunded"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 500;

    if (args.residentId) {
      const payments = await ctx.db
        .query("rentPayments")
        .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId!))
        .take(take);
      return payments.filter((p) => p.userId === userId);
    }

    if (args.propertyId) {
      const payments = await ctx.db
        .query("rentPayments")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .take(take);
      return payments
        .filter((p) => p.userId === userId)
        .filter((p) => (args.status ? p.status === args.status : true));
    }

    const payments = await ctx.db
      .query("rentPayments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(take);

    if (args.status) {
      return payments.filter((p) => p.status === args.status);
    }
    return payments;
  },
});

/**
 * Get rent payment statistics
 */
export const getStats = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalCollected: 0, totalPending: 0, totalOverdue: 0, count: 0 };

    let payments = await ctx.db
      .query("rentPayments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2000);

    if (args.propertyId) {
      payments = payments.filter((p) => p.propertyId === args.propertyId);
    }

    const now = new Date().toISOString().split("T")[0];

    const totalCollected = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter((p) => p.status === "pending" || p.status === "processing")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOverdue = payments
      .filter((p) => p.status === "pending" && p.dueDate < now)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalCollected,
      totalPending,
      totalOverdue,
      count: payments.length,
    };
  },
});

/**
 * Create a new rent payment record
 */
export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    amount: v.number(),
    currency: v.optional(v.string()),
    type: v.union(
      v.literal("rent"),
      v.literal("late_fee"),
      v.literal("deposit"),
      v.literal("other"),
    ),
    paymentMethod: v.union(
      v.literal("ach"),
      v.literal("card"),
      v.literal("cash"),
      v.literal("check"),
      v.literal("other"),
    ),
    dueDate: v.string(),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("rentPayments", {
      ...args,
      userId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Update payment status (mark as paid, failed, refunded)
 */
export const updateStatus = mutation({
  args: {
    id: v.id("rentPayments"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    stripePaymentId: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const payment = await ctx.db.get(args.id);
    if (!payment || payment.userId !== userId) throw new Error("Not found");

    const patch: Record<string, any> = { status: args.status };
    if (args.status === "completed") {
      patch.paidAt = Date.now();
    }
    if (args.stripePaymentId) {
      patch.stripePaymentId = args.stripePaymentId;
    }
    if (args.receiptUrl) {
      patch.receiptUrl = args.receiptUrl;
    }

    await ctx.db.patch(args.id, patch);
  },
});

/**
 * Apply a late fee to a payment
 */
export const applyLateFee = mutation({
  args: {
    id: v.id("rentPayments"),
    lateFee: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const payment = await ctx.db.get(args.id);
    if (!payment || payment.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.id, {
      lateFee: args.lateFee,
      lateFeeAppliedAt: Date.now(),
    });
  },
});

/**
 * Record a manual payment (cash/check)
 */
export const recordPayment = mutation({
  args: {
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    amount: v.number(),
    currency: v.optional(v.string()),
    type: v.union(
      v.literal("rent"),
      v.literal("late_fee"),
      v.literal("deposit"),
      v.literal("other"),
    ),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("check"),
      v.literal("other"),
    ),
    dueDate: v.string(),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("rentPayments", {
      ...args,
      userId,
      status: "completed",
      paidAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

/**
 * Get overdue payments
 */
export const getOverdue = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let payments = await ctx.db
      .query("rentPayments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2000);

    if (args.propertyId) {
      payments = payments.filter((p) => p.propertyId === args.propertyId);
    }

    const now = new Date().toISOString().split("T")[0];
    return payments.filter(
      (p) => p.status === "pending" && p.dueDate < now,
    );
  },
});

/**
 * Get upcoming payments (due within N days)
 */
export const getUpcoming = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let payments = await ctx.db
      .query("rentPayments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2000);

    if (args.propertyId) {
      payments = payments.filter((p) => p.propertyId === args.propertyId);
    }

    const now = new Date();
    const daysAhead = args.daysAhead ?? 30;
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const nowStr = now.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    return payments.filter(
      (p) => p.status === "pending" && p.dueDate >= nowStr && p.dueDate <= futureStr,
    );
  },
});
