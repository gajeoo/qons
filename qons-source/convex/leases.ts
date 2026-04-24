import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const leaseTypeValidator = v.union(
  v.literal("fixed"),
  v.literal("month_to_month"),
  v.literal("commercial"),
);

const leaseStatusValidator = v.union(
  v.literal("active"),
  v.literal("expiring_soon"),
  v.literal("expired"),
  v.literal("renewed"),
  v.literal("terminated"),
);

const signatureStatusValidator = v.union(
  v.literal("unsigned"),
  v.literal("pending"),
  v.literal("signed"),
  v.literal("declined"),
);

/**
 * List leases with optional filters
 */
export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    residentId: v.optional(v.id("residents")),
    status: v.optional(leaseStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 500;

    if (args.residentId) {
      const leases = await ctx.db
        .query("leases")
        .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId!))
        .take(take);
      return leases.filter((l) => l.userId === userId);
    }

    if (args.propertyId) {
      const leases = await ctx.db
        .query("leases")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .take(take);
      return leases
        .filter((l) => l.userId === userId)
        .filter((l) => (args.status ? l.status === args.status : true));
    }

    let leases = await ctx.db
      .query("leases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(take);

    if (args.status) {
      leases = leases.filter((l) => l.status === args.status);
    }

    return leases;
  },
});

/**
 * Create a new lease
 */
export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    unitNumber: v.optional(v.string()),
    leaseType: leaseTypeValidator,
    startDate: v.string(),
    endDate: v.string(),
    monthlyRent: v.number(),
    securityDeposit: v.optional(v.number()),
    autoRenew: v.optional(v.boolean()),
    renewalTermMonths: v.optional(v.number()),
    terms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("leases", {
      ...args,
      userId,
      status: "active",
      signatureStatus: "unsigned",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a lease
 */
export const update = mutation({
  args: {
    id: v.id("leases"),
    unitNumber: v.optional(v.string()),
    leaseType: v.optional(leaseTypeValidator),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    monthlyRent: v.optional(v.number()),
    securityDeposit: v.optional(v.number()),
    status: v.optional(leaseStatusValidator),
    autoRenew: v.optional(v.boolean()),
    renewalTermMonths: v.optional(v.number()),
    terms: v.optional(v.string()),
    signatureStatus: v.optional(signatureStatusValidator),
    signedAt: v.optional(v.number()),
    documentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== userId) throw new Error("Not found");

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, { ...filtered, updatedAt: Date.now() });
  },
});

/**
 * Get leases expiring within N days
 */
export const getExpiringSoon = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const daysAhead = args.days ?? 60;
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const nowStr = now.toISOString().split("T")[0];
    const futureStr = future.toISOString().split("T")[0];

    const leases = await ctx.db
      .query("leases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2000);

    return leases.filter(
      (l) =>
        (l.status === "active" || l.status === "expiring_soon") &&
        l.endDate >= nowStr &&
        l.endDate <= futureStr,
    );
  },
});

/**
 * Renew a lease
 */
export const renew = mutation({
  args: {
    id: v.id("leases"),
    newEndDate: v.string(),
    newMonthlyRent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== userId) throw new Error("Not found");

    const patch: Record<string, any> = {
      status: "renewed" as const,
      endDate: args.newEndDate,
      updatedAt: Date.now(),
    };
    if (args.newMonthlyRent !== undefined) {
      patch.monthlyRent = args.newMonthlyRent;
    }

    await ctx.db.patch(args.id, patch);

    // Create a new active lease record for the renewal
    const now = Date.now();
    return await ctx.db.insert("leases", {
      userId: lease.userId,
      propertyId: lease.propertyId,
      residentId: lease.residentId,
      unitNumber: lease.unitNumber,
      leaseType: lease.leaseType,
      startDate: lease.endDate, // new lease starts when old ends
      endDate: args.newEndDate,
      monthlyRent: args.newMonthlyRent ?? lease.monthlyRent,
      securityDeposit: lease.securityDeposit,
      status: "active",
      autoRenew: lease.autoRenew,
      renewalTermMonths: lease.renewalTermMonths,
      terms: lease.terms,
      signatureStatus: "unsigned",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Terminate a lease
 */
export const terminate = mutation({
  args: { id: v.id("leases") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.id, {
      status: "terminated",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Generate an upload URL for lease document
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
