import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.propertyId) {
      const amenities = await ctx.db
        .query("amenities")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      return amenities.filter((a) => a.userId === userId);
    }
    return await ctx.db
      .query("amenities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    type: v.union(v.literal("pool"), v.literal("gym"), v.literal("party_room"), v.literal("rooftop"), v.literal("tennis_court"), v.literal("parking"), v.literal("bbq_area"), v.literal("other")),
    capacity: v.number(),
    requiresApproval: v.boolean(),
    maxDurationMinutes: v.optional(v.number()),
    rules: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("amenities", { ...args, userId, status: "available" });
  },
});

export const update = mutation({
  args: {
    id: v.id("amenities"),
    name: v.optional(v.string()),
    capacity: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("maintenance"), v.literal("closed"))),
    requiresApproval: v.optional(v.boolean()),
    maxDurationMinutes: v.optional(v.number()),
    rules: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const amenity = await ctx.db.get(args.id);
    if (!amenity || amenity.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(args.id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("amenities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const amenity = await ctx.db.get(args.id);
    if (!amenity || amenity.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});

// ========== BOOKINGS ==========

export const listBookings = query({
  args: {
    amenityId: v.optional(v.id("amenities")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.amenityId) {
      const bookings = await ctx.db
        .query("amenityBookings")
        .withIndex("by_amenityId", (q) => q.eq("amenityId", args.amenityId!))
        .collect();
      return bookings.filter((b) => b.userId === userId);
    }
    const bookings = await ctx.db
      .query("amenityBookings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    if (args.status) return bookings.filter((b) => b.status === args.status);
    return bookings;
  },
});

export const createBooking = mutation({
  args: {
    amenityId: v.id("amenities"),
    residentName: v.string(),
    residentEmail: v.string(),
    residentUnit: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    guestCount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const amenity = await ctx.db.get(args.amenityId);
    if (!amenity || amenity.userId !== userId) throw new Error("Amenity not found");

    // Check for conflicts
    const existing = await ctx.db
      .query("amenityBookings")
      .withIndex("by_amenityId", (q) => q.eq("amenityId", args.amenityId))
      .collect();
    // Check capacity
    const sameDayBookings = existing.filter(
      (b) => b.date === args.date && b.status !== "cancelled" && b.status !== "rejected"
    );
    if (sameDayBookings.length >= amenity.capacity) {
      throw new Error("Amenity is fully booked for this date");
    }

    return await ctx.db.insert("amenityBookings", {
      ...args,
      userId,
      status: amenity.requiresApproval ? "pending" : "approved",
    });
  },
});

export const updateBookingStatus = mutation({
  args: {
    id: v.id("amenityBookings"),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: args.status });
  },
});
