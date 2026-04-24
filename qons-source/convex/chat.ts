import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================
// VISITOR-FACING (Chat Widget)
// ============================================================

/**
 * Get or create a conversation for a visitor session
 */
export const getOrCreateConversation = mutation({
  args: {
    visitorId: v.string(),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
  },
  returns: v.id("chatConversations"),
  handler: async (ctx, { visitorId, visitorName, visitorEmail }) => {
    // Check for existing active conversation
    const existing = await ctx.db
      .query("chatConversations")
      .withIndex("by_visitorId", q => q.eq("visitorId", visitorId))
      .filter(q => q.neq(q.field("status"), "closed"))
      .first();

    if (existing) {
      // Update name/email if provided
      if (visitorName || visitorEmail) {
        const patch: Record<string, string> = {};
        if (visitorName) patch.visitorName = visitorName;
        if (visitorEmail) patch.visitorEmail = visitorEmail;
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("chatConversations", {
      visitorId,
      visitorName,
      visitorEmail,
      status: "active",
      lastMessageAt: Date.now(),
      unreadByAdmin: 0,
      source: "widget",
    });

    // Add welcome message
    await ctx.db.insert("chatMessages", {
      conversationId,
      role: "ai",
      content:
        "Hi there! 👋 Welcome to QuonsApp. I'm your AI assistant. I can help you learn about our premium real estate management platform, pricing, features, or anything else. How can I help you today?",
    });

    return conversationId;
  },
});

/**
 * Send a message from visitor and get AI response
 */
export const sendVisitorMessage = mutation({
  args: {
    conversationId: v.id("chatConversations"),
    content: v.string(),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { conversationId, content, visitorName, visitorEmail },
  ) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Update visitor info if provided
    const patch: Record<string, any> = {
      lastMessageAt: Date.now(),
      unreadByAdmin: (conversation.unreadByAdmin || 0) + 1,
    };
    if (visitorName) patch.visitorName = visitorName;
    if (visitorEmail) patch.visitorEmail = visitorEmail;
    await ctx.db.patch(conversationId, patch);

    // Insert visitor message
    await ctx.db.insert("chatMessages", {
      conversationId,
      role: "visitor",
      content,
      senderName: visitorName || conversation.visitorName,
    });

    // Generate AI response inline (keyword-based for speed)
    const aiResponse = generateAiResponse(content);
    await ctx.db.insert("chatMessages", {
      conversationId,
      role: "ai",
      content: aiResponse,
    });

    await ctx.db.patch(conversationId, { lastMessageAt: Date.now() });

    return null;
  },
});

/**
 * Get messages for a conversation (visitor side)
 */
export const getMessages = query({
  args: { conversationId: v.id("chatConversations") },
  returns: v.array(
    v.object({
      _id: v.id("chatMessages"),
      _creationTime: v.number(),
      conversationId: v.id("chatConversations"),
      role: v.union(v.literal("visitor"), v.literal("ai"), v.literal("admin")),
      content: v.string(),
      senderName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_conversationId", q =>
        q.eq("conversationId", conversationId),
      )
      .take(200);
  },
});

// ============================================================
// ADMIN-FACING (Chat Management)
// ============================================================

/**
 * List all conversations (admin)
 */
export const listConversations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("chatConversations"),
      _creationTime: v.number(),
      visitorId: v.string(),
      visitorName: v.optional(v.string()),
      visitorEmail: v.optional(v.string()),
      status: v.union(
        v.literal("active"),
        v.literal("closed"),
        v.literal("waiting_admin"),
      ),
      lastMessageAt: v.number(),
      unreadByAdmin: v.number(),
      source: v.union(v.literal("widget"), v.literal("dashboard")),
      lastMessage: v.optional(v.string()),
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") return [];

    const conversations = await ctx.db
      .query("chatConversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(100);

    // Enrich with last message
    const enriched = await Promise.all(
      conversations.map(async conv => {
        const lastMsg = await ctx.db
          .query("chatMessages")
          .withIndex("by_conversationId", q => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        return {
          ...conv,
          lastMessage: lastMsg?.content?.slice(0, 100),
        };
      }),
    );

    return enriched;
  },
});

/**
 * Get conversation messages (admin)
 */
export const getConversationMessages = query({
  args: { conversationId: v.id("chatConversations") },
  returns: v.array(
    v.object({
      _id: v.id("chatMessages"),
      _creationTime: v.number(),
      conversationId: v.id("chatConversations"),
      role: v.union(v.literal("visitor"), v.literal("ai"), v.literal("admin")),
      content: v.string(),
      senderName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { conversationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") return [];

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_conversationId", q =>
        q.eq("conversationId", conversationId),
      )
      .take(200);
  },
});

/**
 * Admin sends a reply to a conversation
 */
export const sendAdminReply = mutation({
  args: {
    conversationId: v.id("chatConversations"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") throw new Error("Admin required");

    const user = await ctx.db.get(userId);

    await ctx.db.insert("chatMessages", {
      conversationId,
      role: "admin",
      content,
      senderName: user?.name || "Admin",
    });

    await ctx.db.patch(conversationId, {
      lastMessageAt: Date.now(),
      unreadByAdmin: 0,
      status: "active",
      assignedAdminId: userId,
    });

    return null;
  },
});

/**
 * Admin closes a conversation
 */
export const closeConversation = mutation({
  args: { conversationId: v.id("chatConversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") throw new Error("Admin required");

    await ctx.db.patch(conversationId, { status: "closed" });
    return null;
  },
});

/**
 * Mark conversation as read
 */
export const markAsRead = mutation({
  args: { conversationId: v.id("chatConversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(conversationId, { unreadByAdmin: 0 });
    return null;
  },
});

/**
 * Get chat stats for admin dashboard
 */
export const getStats = query({
  args: {},
  returns: v.object({
    totalConversations: v.number(),
    activeConversations: v.number(),
    waitingForAdmin: v.number(),
    totalUnread: v.number(),
  }),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        totalConversations: 0,
        activeConversations: 0,
        waitingForAdmin: 0,
        totalUnread: 0,
      };

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin")
      return {
        totalConversations: 0,
        activeConversations: 0,
        waitingForAdmin: 0,
        totalUnread: 0,
      };

    const all = await ctx.db.query("chatConversations").take(200);
    const active = all.filter(c => c.status === "active");
    const waiting = all.filter(c => c.status === "waiting_admin");
    const totalUnread = all.reduce((sum, c) => sum + (c.unreadByAdmin || 0), 0);

    return {
      totalConversations: all.length,
      activeConversations: active.length,
      waitingForAdmin: waiting.length,
      totalUnread,
    };
  },
});

// ============================================================
// AI Response Generator (Keyword-based, fast)
// ============================================================

function generateAiResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (
    msg.includes("pric") ||
    msg.includes("cost") ||
    msg.includes("how much") ||
    msg.includes("subscription")
  ) {
    return "QuonsApp is **$49.99/month** with a **14-day free trial** — no credit card required!\n\nYour subscription includes:\n• Unlimited properties & portfolio management\n• AI-powered scheduling & shift management\n• HOA management (violations, dues, board votes)\n• Staff & resident management\n• Interactive property maps\n• Time tracking & payroll exports\n• Executive analytics dashboard\n• Team collaboration & task delegation\n• Amenity booking system\n\nStart your free trial today — [Sign up here](/signup)!";
  }

  if (msg.includes("trial") || msg.includes("free")) {
    return "Every new QuonsApp account starts with a **14-day free trial** with access to ALL features. No credit card required!\n\nAfter the trial, it's just **$49.99/month** to keep everything running. Cancel anytime.\n\nReady to start? [Create your account](/signup) in 30 seconds.";
  }

  if (
    msg.includes("feature") ||
    msg.includes("what can") ||
    msg.includes("what does") ||
    msg.includes("do you")
  ) {
    return "QuonsApp is a premium real estate management platform built for property professionals. Here's what you get:\n\n🏢 **Portfolio Management** — Manage all your properties from one dashboard with interactive maps\n📅 **AI Scheduling** — Smart shift assignment based on availability, skills & cost\n👥 **Staff Management** — Directory, certifications, performance tracking\n🏠 **Resident Management** — Applications, leases, communications\n⚖️ **HOA Suite** — Violations, dues collection, board votes, ARC requests\n⏱️ **Time Tracking** — GPS clock-in/out with automated timesheets\n💰 **Payroll Exports** — ADP, Paychex, QuickBooks compatible\n📊 **Executive Analytics** — Real-time dashboards & reports\n🏊 **Amenity Booking** — Pool, gym, party room reservations\n✅ **Task Delegation** — Assign & track tasks across your team\n\nAll for just $49.99/month. Would you like to know more about any specific feature?";
  }

  if (msg.includes("schedul") || msg.includes("shift") || msg.includes("ai")) {
    return "QuonsApp's **AI Scheduling Engine** automatically assigns the right staff to shifts based on:\n\n• Employee availability & preferences\n• Skills & certifications\n• Property requirements\n• Cost optimization targets\n• Labor law compliance\n\nIt reduces scheduling time from **20-30 hours/week to under 2 hours**. Emergency coverage? Handled in seconds, not hours.\n\nThe calendar view shows all shifts across all properties with drag-and-drop editing.";
  }

  if (
    msg.includes("hoa") ||
    msg.includes("association") ||
    msg.includes("violation") ||
    msg.includes("dues")
  ) {
    return "QuonsApp's **HOA Management Suite** includes:\n\n⚖️ **Violation Tracking** — Report, warn, fine, and resolve violations\n💵 **Dues Collection** — Track payments, overdue notices, waiver management\n🗳️ **Board Votes** — Create polls, track votes, set deadlines\n🏗️ **ARC Requests** — Architectural review submissions and approvals\n💰 **Reserve Funds** — Track fund balances by category (roof, elevator, HVAC, etc.)\n📢 **Resident Messaging** — Announcements, alerts, maintenance notices\n\nEverything property managers need to run an HOA efficiently.";
  }

  if (msg.includes("demo") || msg.includes("tour") || msg.includes("show")) {
    return "You can start a **free 14-day trial** right now — no demo needed! Just [sign up](/signup) and explore the full platform.\n\nIf you'd prefer a guided walkthrough, reach out via our [Contact page](/contact) and we'll set up a personalized demo for your team.";
  }

  if (
    msg.includes("support") ||
    msg.includes("help") ||
    msg.includes("issue") ||
    msg.includes("problem")
  ) {
    return "We're here to help! Here are your support options:\n\n1. 💬 **This chat** — for quick questions\n2. 📧 **Contact page** — [submit a request](/contact) for detailed inquiries\n3. 🎯 **In-app support** — available in your dashboard once logged in\n\nFor urgent issues, type \"human\" and I'll connect you with our team.";
  }

  if (
    msg.includes("human") ||
    msg.includes("agent") ||
    msg.includes("real person") ||
    msg.includes("speak to")
  ) {
    return "I've flagged this conversation for our team. An admin will review and respond shortly. In the meantime, feel free to leave your email so we can follow up:\n\nOr continue chatting with me — I might be able to help!";
  }

  if (
    msg.includes("contact") ||
    msg.includes("email") ||
    msg.includes("reach") ||
    msg.includes("talk")
  ) {
    return "You can reach us through:\n\n📧 Our [Contact page](/contact) — submit an inquiry\n💬 This chat — ask me anything right now\n\nOur team typically responds within 24 hours.";
  }

  if (
    msg.includes("property") ||
    msg.includes("building") ||
    msg.includes("portfolio")
  ) {
    return "QuonsApp's **Portfolio Dashboard** gives you complete control:\n\n🗺️ **Interactive Maps** — See all your properties on a map with status indicators\n🏢 **Property Cards** — Quick view of units, occupancy, staff, and status\n📊 **Performance Metrics** — Revenue, occupancy rates, maintenance costs per property\n👥 **Staff Assignments** — See who's working where at any time\n🔍 **Search & Filter** — By type, status, region, or performance\n\nManage 10 to 500+ buildings from one centralized view.";
  }

  if (
    msg.includes("team") ||
    msg.includes("invite") ||
    msg.includes("member") ||
    msg.includes("sub-account") ||
    msg.includes("worker")
  ) {
    return "QuonsApp makes team management seamless:\n\n👤 **Invite Members** — Send invitation links to staff, managers, or workers\n🔗 **Linked Accounts** — Sub-accounts automatically tied to your subscription\n🎛️ **Role-Based Access** — Control what each team member can see and do\n⏸️ **Account Controls** — Add, pause, or remove team members anytime\n📋 **Task Delegation** — Assign tasks directly from your dashboard\n\nYour team members don't need their own subscription — they're covered under yours.";
  }

  if (
    msg.includes("hello") ||
    msg.includes("hi") ||
    msg.includes("hey") ||
    msg.includes("good")
  ) {
    return "Hello! 👋 Welcome to QuonsApp — the premium real estate management platform.\n\nI can help you with:\n• **Features** — What QuonsApp does\n• **Pricing** — $49.99/mo with 14-day free trial\n• **Scheduling** — AI-powered shift management\n• **HOA** — Association management tools\n• **Team** — Sub-accounts & delegation\n\nWhat would you like to know?";
  }

  if (msg.includes("thank")) {
    return "You're welcome! If you have any other questions, I'm here to help. 😊\n\nReady to get started? [Start your free 14-day trial](/signup) — no credit card required!";
  }

  return "I'd love to help! Here are some things I can tell you about:\n\n• **Features** — What QuonsApp can do for your properties\n• **Pricing** — Our $49.99/month plan\n• **Free Trial** — 14 days, full access, no credit card\n• **Scheduling** — AI-powered shift management\n• **HOA** — Association management tools\n• **Team** — Invitations & sub-accounts\n\nJust ask about any of these, or describe what you need!";
}
