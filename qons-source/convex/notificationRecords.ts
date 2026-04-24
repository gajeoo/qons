import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const channelValidator = v.union(
  v.literal("in_app"),
  v.literal("email"),
  v.literal("sms"),
  v.literal("push"),
);

const notificationTypeValidator = v.union(
  v.literal("rent_reminder"),
  v.literal("rent_overdue"),
  v.literal("lease_expiry"),
  v.literal("maintenance_update"),
  v.literal("shift_change"),
  v.literal("task_assigned"),
  v.literal("general"),
  v.literal("payment_received"),
  v.literal("system"),
);

/**
 * List notifications for current user (as target)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 200;

    // Get notifications targeted to this user
    let notifications = await ctx.db
      .query("notificationRecords")
      .withIndex("by_targetUserId", (q) => q.eq("targetUserId", userId))
      .take(take);

    if (args.unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }

    return notifications.sort((a, b) => b.sentAt - a.sentAt);
  },
});

/**
 * Mark a notification as read
 */
export const markRead = mutation({
  args: { id: v.id("notificationRecords") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.id);
    if (!notification) throw new Error("Not found");

    // Must be either the owner or target
    if (notification.userId !== userId && notification.targetUserId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, { read: true });
  },
});

/**
 * Mark all notifications as read for the current user
 */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notificationRecords")
      .withIndex("by_targetUserId", (q) => q.eq("targetUserId", userId))
      .take(500);

    const unreadItems = unread.filter((n) => !n.read);
    await Promise.all(
      unreadItems.map((n) => ctx.db.patch(n._id, { read: true })),
    );
  },
});

/**
 * Create a notification record (internal use — called by other functions)
 */
export const create = mutation({
  args: {
    targetUserId: v.optional(v.id("users")),
    targetEmail: v.optional(v.string()),
    targetPhone: v.optional(v.string()),
    channel: channelValidator,
    type: notificationTypeValidator,
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("notificationRecords", {
      ...args,
      userId,
      read: false,
      sentAt: Date.now(),
    });
  },
});

/**
 * Get unread notification count for the current user
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const notifications = await ctx.db
      .query("notificationRecords")
      .withIndex("by_targetUserId", (q) => q.eq("targetUserId", userId))
      .take(500);

    return notifications.filter((n) => !n.read).length;
  },
});
