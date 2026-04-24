import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("properties")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
  },
});

export const get = query({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const property = await ctx.db.get(args.id);
    if (!property || property.userId !== userId) return null;
    return property;
  },
});

export const getStats = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, active: 0, inactive: 0, totalUnits: 0 };
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
    return {
      total: properties.length,
      active: properties.filter(p => p.status === "active").length,
      inactive: properties.filter(p => p.status === "inactive").length,
      totalUnits: properties.reduce((sum, p) => sum + p.units, 0),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    type: v.union(
      v.literal("residential"),
      v.literal("commercial"),
      v.literal("mixed"),
      v.literal("hoa"),
    ),
    units: v.number(),
    sqft: v.optional(v.number()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("properties", {
      ...args,
      userId,
      status: "active",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("properties"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("residential"),
        v.literal("commercial"),
        v.literal("mixed"),
        v.literal("hoa"),
      ),
    ),
    units: v.optional(v.number()),
    sqft: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("onboarding"),
      ),
    ),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const property = await ctx.db.get(args.id);
    if (!property || property.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const property = await ctx.db.get(args.id);
    if (!property || property.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
