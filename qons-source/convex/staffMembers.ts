import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("staff")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
  },
});

export const get = query({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const staff = await ctx.db.get(args.id);
    if (!staff || staff.userId !== userId) return null;
    return staff;
  },
});

export const getStats = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        total: 0,
        active: 0,
        onLeave: 0,
        roles: {} as Record<string, number>,
      };
    const staffList = await ctx.db
      .query("staff")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
    const roles: Record<string, number> = {};
    for (const s of staffList) {
      roles[s.role] = (roles[s.role] || 0) + 1;
    }
    return {
      total: staffList.length,
      active: staffList.filter(s => s.status === "active").length,
      onLeave: staffList.filter(s => s.status === "on_leave").length,
      roles,
    };
  },
});

const availabilityValidator = v.optional(
  v.object({
    monday: v.optional(v.array(v.string())),
    tuesday: v.optional(v.array(v.string())),
    wednesday: v.optional(v.array(v.string())),
    thursday: v.optional(v.array(v.string())),
    friday: v.optional(v.array(v.string())),
    saturday: v.optional(v.array(v.string())),
    sunday: v.optional(v.array(v.string())),
  }),
);

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(),
    hourlyRate: v.number(),
    certifications: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    availability: availabilityValidator,
    maxHoursPerWeek: v.optional(v.number()),
    hireDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("staff", {
      ...args,
      userId,
      status: "active",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("staff"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("on_leave"),
      ),
    ),
    hourlyRate: v.optional(v.number()),
    certifications: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    availability: availabilityValidator,
    maxHoursPerWeek: v.optional(v.number()),
    assignedPropertyIds: v.optional(v.array(v.id("properties"))),
    hireDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const staff = await ctx.db.get(args.id);
    if (!staff || staff.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const staff = await ctx.db.get(args.id);
    if (!staff || staff.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
