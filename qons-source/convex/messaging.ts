import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** List messages for the current user (sent and received). */
export const list = query({
  args: {
    channel: v.optional(v.string()),
    direction: v.optional(v.union(v.literal("sent"), v.literal("received"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return [];

    const orgId = profile.organizationUserId ?? user._id;

    let messages = await ctx.db
      .query("messages")
      .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", orgId))
      .order("desc")
      .take(200);

    // Filter by direction
    if (args.direction === "sent") {
      messages = messages.filter((m) => m.fromUserId === user._id);
    } else if (args.direction === "received") {
      messages = messages.filter((m) => m.toUserId === user._id || !m.toUserId);
    }

    // Filter by channel
    if (args.channel) {
      messages = messages.filter((m) => m.channel === args.channel);
    }

    return messages;
  },
});

/** Send a message (email, SMS, in-app, push). */
export const send = mutation({
  args: {
    toUserId: v.optional(v.id("users")),
    channel: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("in_app"),
      v.literal("push"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    recipientType: v.optional(v.union(
      v.literal("tenant"),
      v.literal("maintenance"),
      v.literal("staff"),
      v.literal("all"),
    )),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profile not found");

    const orgId = profile.organizationUserId ?? user._id;

    const messageId = await ctx.db.insert("messages", {
      fromUserId: user._id,
      toUserId: args.toUserId,
      organizationUserId: orgId,
      channel: args.channel,
      subject: args.subject,
      body: args.body,
      recipientType: args.recipientType,
      status: "sent",
      relatedEntityType: args.relatedEntityType,
      relatedEntityId: args.relatedEntityId,
      sentAt: Date.now(),
    });

    // Also create a notification record for in-app messages
    if (args.channel === "in_app" && args.toUserId) {
      await ctx.db.insert("notificationRecords", {
        userId: args.toUserId,
        channel: args.channel,
        type: "general",
        title: args.subject ?? "New message",
        message: args.body.substring(0, 200),
        read: false,
        sentAt: Date.now(),
      });
    }

    return messageId;
  },
});

/** Mark a message as read. */
export const markRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { readAt: Date.now() });
  },
});

/** Get unread count for current user. */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return 0;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return 0;

    const orgId = profile.organizationUserId ?? user._id;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", orgId))
      .order("desc")
      .take(100);

    return messages.filter((m) => (m.toUserId === user._id || !m.toUserId) && !m.readAt).length;
  },
});

/** Broadcast message to all users of a specific type in the organization. */
export const broadcast = mutation({
  args: {
    recipientType: v.union(
      v.literal("tenant"),
      v.literal("maintenance"),
      v.literal("staff"),
      v.literal("all"),
    ),
    channel: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("in_app"),
      v.literal("push"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profile not found");

    // Get all sub-users in this org
    const orgMembers = await ctx.db
      .query("userProfiles")
      .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", user._id))
      .collect();

    // Filter by recipient type
    const recipients = args.recipientType === "all"
      ? orgMembers
      : orgMembers.filter((m) => m.role === args.recipientType || (args.recipientType === "staff" && (m.role === "worker" || m.role === "manager")));

    const sentIds: string[] = [];
    for (const recipient of recipients) {
      const id = await ctx.db.insert("messages", {
        fromUserId: user._id,
        toUserId: recipient.userId,
        organizationUserId: user._id,
        channel: args.channel,
        subject: args.subject,
        body: args.body,
        recipientType: args.recipientType,
        status: "sent",
        sentAt: Date.now(),
      });
      sentIds.push(id);

      // Create notification
      if (args.channel === "in_app") {
        await ctx.db.insert("notificationRecords", {
          userId: recipient.userId,
          channel: args.channel,
          type: "general",
          title: args.subject ?? "New message",
          message: args.body.substring(0, 200),
          read: false,
          sentAt: Date.now(),
        });
      }
    }

    return { sentCount: sentIds.length };
  },
});
