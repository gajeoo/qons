import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let funds = await ctx.db
      .query("reserveFund")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    if (args.propertyId) {
      funds = funds.filter((f) => f.propertyId === args.propertyId);
    }
    return funds;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalFunds: 0, totalTarget: 0, totalCurrent: 0, fundedCount: 0 };
    const funds = await ctx.db
      .query("reserveFund")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return {
      totalFunds: funds.length,
      totalTarget: funds.reduce((s, f) => s + f.targetAmount, 0),
      totalCurrent: funds.reduce((s, f) => s + f.currentAmount, 0),
      fundedCount: funds.filter((f) => f.status === "funded").length,
    };
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    description: v.optional(v.string()),
    targetAmount: v.number(),
    currentAmount: v.number(),
    category: v.union(
      v.literal("roof"), v.literal("elevator"), v.literal("hvac"),
      v.literal("parking"), v.literal("landscaping"), v.literal("pool"),
      v.literal("general"), v.literal("emergency"), v.literal("other"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const status = args.currentAmount >= args.targetAmount ? "funded" as const : "active" as const;
    return await ctx.db.insert("reserveFund", {
      ...args,
      userId,
      status,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("reserveFund"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    targetAmount: v.optional(v.number()),
    currentAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const fund = await ctx.db.get(args.id);
    if (!fund || fund.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    // Auto-update status
    const newCurrent = args.currentAmount ?? fund.currentAmount;
    const newTarget = args.targetAmount ?? fund.targetAmount;
    if (newCurrent >= newTarget) {
      (filtered as any).status = "funded";
    } else if (newCurrent <= 0) {
      (filtered as any).status = "depleted";
    } else {
      (filtered as any).status = "active";
    }
    (filtered as any).lastContribution = new Date().toISOString().split("T")[0];
    await ctx.db.patch(args.id, filtered);
  },
});

export const addContribution = mutation({
  args: {
    id: v.id("reserveFund"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const fund = await ctx.db.get(args.id);
    if (!fund || fund.userId !== userId) throw new Error("Not found");
    const newAmount = fund.currentAmount + args.amount;
    await ctx.db.patch(args.id, {
      currentAmount: newAmount,
      status: newAmount >= fund.targetAmount ? "funded" : "active",
      lastContribution: new Date().toISOString().split("T")[0],
    });
  },
});

export const remove = mutation({
  args: { id: v.id("reserveFund") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const fund = await ctx.db.get(args.id);
    if (!fund || fund.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
