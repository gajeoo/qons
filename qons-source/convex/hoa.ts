import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ========== VIOLATIONS ==========
export const listViolations = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let violations: any[];
    if (args.propertyId) {
      violations = await ctx.db
        .query("hoaViolations")
        .withIndex("by_propertyId", q => q.eq("propertyId", args.propertyId!))
        .take(500);
      violations = violations.filter(v => v.userId === userId);
    } else {
      violations = await ctx.db
        .query("hoaViolations")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .take(500);
    }
    if (args.status)
      violations = violations.filter(v => v.status === args.status);
    return violations;
  },
});

export const createViolation = mutation({
  args: {
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    type: v.union(
      v.literal("noise"),
      v.literal("parking"),
      v.literal("maintenance"),
      v.literal("pet"),
      v.literal("trash"),
      v.literal("unauthorized_modification"),
      v.literal("other"),
    ),
    description: v.string(),
    fineAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("hoaViolations", {
      ...args,
      userId,
      status: "reported",
      reportedDate: new Date().toISOString().split("T")[0],
    });
  },
});

export const updateViolation = mutation({
  args: {
    id: v.id("hoaViolations"),
    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("warning_sent"),
        v.literal("fine_issued"),
        v.literal("resolved"),
        v.literal("escalated"),
      ),
    ),
    fineAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    resolvedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const v = await ctx.db.get(args.id);
    if (!v || v.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
  },
});

// ========== DUES ==========
export const listDues = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let dues: any[];
    if (args.propertyId) {
      dues = await ctx.db
        .query("hoaDues")
        .withIndex("by_propertyId", q => q.eq("propertyId", args.propertyId!))
        .take(500);
      dues = dues.filter(d => d.userId === userId);
    } else {
      dues = await ctx.db
        .query("hoaDues")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .take(500);
    }
    if (args.status) dues = dues.filter(d => d.status === args.status);
    return dues;
  },
});

export const createDue = mutation({
  args: {
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    amount: v.number(),
    dueDate: v.string(),
    period: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("hoaDues", {
      ...args,
      userId,
      status: "pending",
    });
  },
});

export const updateDue = mutation({
  args: {
    id: v.id("hoaDues"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("overdue"),
        v.literal("waived"),
      ),
    ),
    paidDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const d = await ctx.db.get(args.id);
    if (!d || d.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
  },
});

// ========== BOARD VOTES ==========
export const listVotes = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.propertyId) {
      const votes = await ctx.db
        .query("boardVotes")
        .withIndex("by_propertyId", q => q.eq("propertyId", args.propertyId!))
        .take(500);
      return votes.filter(v => v.userId === userId);
    }
    return await ctx.db
      .query("boardVotes")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
  },
});

export const createVote = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    description: v.string(),
    options: v.array(v.string()),
    deadline: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("boardVotes", {
      ...args,
      userId,
      status: "open",
      votes: [],
    });
  },
});

export const castVote = mutation({
  args: {
    id: v.id("boardVotes"),
    voterName: v.string(),
    voterUnit: v.string(),
    option: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const vote = await ctx.db.get(args.id);
    if (!vote || vote.userId !== userId) throw new Error("Not found");
    if (vote.status !== "open") throw new Error("Voting is closed");
    // Check if already voted
    const alreadyVoted = vote.votes.find(v => v.voterUnit === args.voterUnit);
    if (alreadyVoted) throw new Error("This unit has already voted");
    await ctx.db.patch(args.id, {
      votes: [
        ...vote.votes,
        {
          voterName: args.voterName,
          voterUnit: args.voterUnit,
          option: args.option,
          timestamp: Date.now(),
        },
      ],
    });
  },
});

export const closeVote = mutation({
  args: { id: v.id("boardVotes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const vote = await ctx.db.get(args.id);
    if (!vote || vote.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: "closed" });
  },
});

// ========== ARC REQUESTS ==========
export const listArcRequests = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.propertyId) {
      const reqs = await ctx.db
        .query("arcRequests")
        .withIndex("by_propertyId", q => q.eq("propertyId", args.propertyId!))
        .take(500);
      return reqs.filter(r => r.userId === userId);
    }
    return await ctx.db
      .query("arcRequests")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
  },
});

export const createArcRequest = mutation({
  args: {
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    requestType: v.union(
      v.literal("exterior_modification"),
      v.literal("landscaping"),
      v.literal("fence"),
      v.literal("paint"),
      v.literal("addition"),
      v.literal("other"),
    ),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("arcRequests", {
      ...args,
      userId,
      status: "submitted",
      submittedDate: new Date().toISOString().split("T")[0],
    });
  },
});

export const updateArcRequest = mutation({
  args: {
    id: v.id("arcRequests"),
    status: v.optional(
      v.union(
        v.literal("submitted"),
        v.literal("under_review"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("completed"),
      ),
    ),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const req = await ctx.db.get(args.id);
    if (!req || req.userId !== userId) throw new Error("Not found");
    const updates: Record<string, unknown> = {};
    if (args.status) {
      updates.status = args.status;
      if (["approved", "denied"].includes(args.status)) {
        updates.reviewedDate = new Date().toISOString().split("T")[0];
      }
    }
    if (args.reviewNotes) updates.reviewNotes = args.reviewNotes;
    await ctx.db.patch(args.id, updates);
  },
});

// ========== RESIDENT MESSAGES ==========
export const listMessages = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (args.propertyId) {
      const msgs = await ctx.db
        .query("residentMessages")
        .withIndex("by_propertyId", q => q.eq("propertyId", args.propertyId!))
        .take(500);
      return msgs
        .filter(m => m.userId === userId)
        .sort((a, b) => b.sentAt - a.sentAt);
    }
    const msgs = await ctx.db
      .query("residentMessages")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);
    return msgs.sort((a, b) => b.sentAt - a.sentAt);
  },
});

export const sendMessage = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("announcement"),
      v.literal("alert"),
      v.literal("maintenance_notice"),
      v.literal("event"),
      v.literal("general"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    targetUnits: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("residentMessages", {
      ...args,
      userId,
      sentAt: Date.now(),
    });
  },
});

export const removeMessage = mutation({
  args: { id: v.id("residentMessages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const msg = await ctx.db.get(args.id);
    if (!msg || msg.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
