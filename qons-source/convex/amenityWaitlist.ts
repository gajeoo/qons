import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { amenityId: v.optional(v.id("amenities")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.amenityId) {
      return await ctx.db
        .query("amenityWaitlist")
        .withIndex("by_amenityId", q => q.eq("amenityId", args.amenityId!))
        .take(500);
    }
    return await ctx.db
      .query("amenityWaitlist")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
  },
});

export const add = mutation({
  args: {
    amenityId: v.id("amenities"),
    residentName: v.string(),
    residentEmail: v.string(),
    preferredDate: v.string(),
    preferredTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("amenityWaitlist", {
      ...args,
      userId,
      status: "waiting",
      addedAt: Date.now(),
    });
  },
});

export const notify = mutation({
  args: { id: v.id("amenityWaitlist") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    await ctx.db.patch(args.id, {
      status: "notified",
      notifiedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("amenityWaitlist") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
