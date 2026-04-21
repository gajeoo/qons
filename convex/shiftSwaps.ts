import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("shiftSwaps")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const swaps = await ctx.db
      .query("shiftSwaps")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return swaps.filter((s) => s.status === "pending");
  },
});

export const create = mutation({
  args: {
    shiftId: v.id("shifts"),
    requestedByStaffId: v.id("staff"),
    targetStaffId: v.optional(v.id("staff")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("shiftSwaps", {
      ...args,
      userId,
      status: "pending",
    });
  },
});

export const approve = mutation({
  args: { id: v.id("shiftSwaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const swap = await ctx.db.get(args.id);
    if (!swap || swap.userId !== userId) throw new Error("Not found");

    const user = await ctx.db.get(userId);

    // If there's a target staff, swap the assignment
    if (swap.targetStaffId) {
      await ctx.db.patch(swap.shiftId, { staffId: swap.targetStaffId });
    } else {
      // Open the shift for anyone
      await ctx.db.patch(swap.shiftId, { status: "open", staffId: undefined });
    }

    await ctx.db.patch(args.id, {
      status: "approved",
      resolvedAt: Date.now(),
      resolvedBy: user?.name || "Manager",
    });
  },
});

export const reject = mutation({
  args: { id: v.id("shiftSwaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const swap = await ctx.db.get(args.id);
    if (!swap || swap.userId !== userId) throw new Error("Not found");
    const user = await ctx.db.get(userId);
    await ctx.db.patch(args.id, {
      status: "rejected",
      resolvedAt: Date.now(),
      resolvedBy: user?.name || "Manager",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("shiftSwaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const swap = await ctx.db.get(args.id);
    if (!swap || swap.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
