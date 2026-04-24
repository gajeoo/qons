import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let residents = await ctx.db
      .query("residents")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
    if (args.propertyId) {
      residents = residents.filter(r => r.propertyId === args.propertyId);
    }
    return residents;
  },
});

export const getStats = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, active: 0, pending: 0, inactive: 0 };
    const residents = await ctx.db
      .query("residents")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
    return {
      total: residents.length,
      active: residents.filter(r => r.status === "active").length,
      pending: residents.filter(r => r.status === "pending").length,
      inactive: residents.filter(r => r.status === "inactive").length,
    };
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    unit: v.string(),
    leaseStart: v.optional(v.string()),
    leaseEnd: v.optional(v.string()),
    moveInDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("active"))),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    pets: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("residents", {
      ...args,
      userId,
      status: args.status || "pending",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("residents"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    unit: v.optional(v.string()),
    leaseStart: v.optional(v.string()),
    leaseEnd: v.optional(v.string()),
    moveInDate: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    vehiclePlate: v.optional(v.string()),
    pets: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const resident = await ctx.db.get(args.id);
    if (!resident || resident.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
  },
});

export const approve = mutation({
  args: { id: v.id("residents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const resident = await ctx.db.get(args.id);
    if (!resident || resident.userId !== userId) throw new Error("Not found");

    const user = await ctx.db.get(userId);
    await ctx.db.patch(args.id, {
      status: "active",
      approvedAt: Date.now(),
      approvedBy: user?.name || user?.email || "Manager",
    });
  },
});

export const reject = mutation({
  args: { id: v.id("residents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const resident = await ctx.db.get(args.id);
    if (!resident || resident.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: "rejected" });
  },
});

export const deactivate = mutation({
  args: { id: v.id("residents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const resident = await ctx.db.get(args.id);
    if (!resident || resident.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: "inactive" });
  },
});

export const remove = mutation({
  args: { id: v.id("residents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const resident = await ctx.db.get(args.id);
    if (!resident || resident.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
