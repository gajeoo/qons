import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ========== VIOLATIONS ==========
export const listViolations = query({
  args: { propertyId: v.optional(v.id("properties")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let violations: any[] = [];
    if (args.propertyId) {
      violations = await ctx.db.query("hoaViolations")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      violations = violations.filter((v) => v.userId === userId);
    } else {
      violations = await ctx.db.query("hoaViolations")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }
    if (args.status) violations = violations.filter((v) => v.status === args.status);
    return await Promise.all(
      violations.map(async (violation) => {
        const attachmentUrls = await Promise.all(
          (violation.attachmentStorageIds ?? []).map(async (storageId: any) => await ctx.storage.getUrl(storageId)),
        );
        return {
          ...violation,
          attachmentUrls: attachmentUrls.filter((url): url is string => Boolean(url)),
        };
      }),
    );
  },
});

export const generateAttachmentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createViolation = mutation({
  args: {
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    type: v.union(v.literal("noise"), v.literal("parking"), v.literal("maintenance"), v.literal("pet"), v.literal("trash"), v.literal("unauthorized_modification"), v.literal("other")),
    description: v.string(),
    fineAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("hoaViolations", {
      ...args, userId, status: "reported",
      reportedDate: new Date().toISOString().split("T")[0],
      noticeHistory: [],
      attachmentStorageIds: args.attachmentStorageIds ?? [],
    });
  },
});

export const updateViolation = mutation({
  args: {
    id: v.id("hoaViolations"),
    status: v.optional(v.union(v.literal("reported"), v.literal("warning_sent"), v.literal("fine_issued"), v.literal("resolved"), v.literal("escalated"))),
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
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, val]) => val !== undefined));
    await ctx.db.patch(args.id, filtered);
  },
});

export const sendViolationNotice = mutation({
  args: {
    id: v.id("hoaViolations"),
    template: v.union(
      v.literal("courtesy_warning"),
      v.literal("fine_notice"),
      v.literal("hearing_notice"),
      v.literal("final_notice"),
    ),
    subject: v.string(),
    message: v.string(),
    deliveryMethod: v.union(
      v.literal("email"),
      v.literal("letter"),
      v.literal("portal"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const violation = await ctx.db.get(args.id);
    if (!violation || violation.userId !== userId) throw new Error("Not found");

    const nextStatus = args.template === "courtesy_warning"
      ? "warning_sent"
      : args.template === "fine_notice"
        ? "fine_issued"
        : "escalated";

    await ctx.db.patch(args.id, {
      status: violation.status === "resolved" ? violation.status : nextStatus,
      noticeHistory: [
        ...(violation.noticeHistory ?? []),
        {
          template: args.template,
          subject: args.subject,
          message: args.message,
          sentAt: Date.now(),
          deliveryMethod: args.deliveryMethod,
        },
      ],
    });
  },
});

// ========== DUES ==========
export const listDues = query({
  args: { propertyId: v.optional(v.id("properties")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let dues: any[] = [];
    if (args.propertyId) {
      dues = await ctx.db.query("hoaDues")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      dues = dues.filter((d) => d.userId === userId);
    } else {
      dues = await ctx.db.query("hoaDues")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }
    if (args.status) dues = dues.filter((d) => d.status === args.status);
    return dues;
  },
});

export const getDueSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalPending: 0,
        totalOverdue: 0,
        totalCollected: 0,
        pendingCount: 0,
        overdueCount: 0,
        collectedCount: 0,
        overdueByProperty: [],
      };
    }

    const dues = await ctx.db.query("hoaDues")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const toSafeAmount = (value: unknown) => {
      const amount = typeof value === "number" ? value : Number(value);
      return Number.isFinite(amount) ? amount : 0;
    };

    const overdueByPropertyMap = new Map<string, { propertyId: string; overdueAmount: number; overdueCount: number }>();

    for (const due of dues) {
      if (due.status !== "overdue") continue;
      const propertyId = String(due.propertyId ?? "unknown");
      const current = overdueByPropertyMap.get(propertyId) ?? {
        propertyId,
        overdueAmount: 0,
        overdueCount: 0,
      };
      current.overdueAmount += toSafeAmount(due.amount);
      current.overdueCount += 1;
      overdueByPropertyMap.set(propertyId, current);
    }

    return {
      totalPending: dues.filter((due) => due.status === "pending").reduce((sum, due) => sum + toSafeAmount(due.amount), 0),
      totalOverdue: dues.filter((due) => due.status === "overdue").reduce((sum, due) => sum + toSafeAmount(due.amount), 0),
      totalCollected: dues.filter((due) => due.status === "paid").reduce((sum, due) => sum + toSafeAmount(due.amount), 0),
      pendingCount: dues.filter((due) => due.status === "pending").length,
      overdueCount: dues.filter((due) => due.status === "overdue").length,
      collectedCount: dues.filter((due) => due.status === "paid").length,
      overdueByProperty: Array.from(overdueByPropertyMap.values()).sort((left, right) => right.overdueAmount - left.overdueAmount),
    };
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
    return await ctx.db.insert("hoaDues", { ...args, userId, status: "pending" });
  },
});

export const updateDue = mutation({
  args: {
    id: v.id("hoaDues"),
    status: v.optional(v.union(v.literal("pending"), v.literal("paid"), v.literal("overdue"), v.literal("waived"))),
    paidDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const d = await ctx.db.get(args.id);
    if (!d || d.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, val]) => val !== undefined));
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
      const votes = await ctx.db.query("boardVotes")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      return votes.filter((v) => v.userId === userId);
    }
    return await ctx.db.query("boardVotes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
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
      ...args, userId, status: "open", votes: [],
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
    const alreadyVoted = vote.votes.find((v) => v.voterUnit === args.voterUnit);
    if (alreadyVoted) throw new Error("This unit has already voted");
    await ctx.db.patch(args.id, {
      votes: [...vote.votes, {
        voterName: args.voterName,
        voterUnit: args.voterUnit,
        option: args.option,
        timestamp: Date.now(),
      }],
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

// ========== BOARD MEETINGS ==========
export const listMeetings = query({
  args: { propertyId: v.optional(v.id("properties")), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let meetings: any[] = [];
    if (args.propertyId) {
      meetings = await ctx.db.query("hoaMeetings")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      meetings = meetings.filter((meeting) => meeting.userId === userId);
    } else {
      meetings = await ctx.db.query("hoaMeetings")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }

    if (args.status) {
      meetings = meetings.filter((meeting) => meeting.status === args.status);
    }

    return meetings.sort((a, b) => {
      const left = `${a.scheduledDate}|${a.scheduledTime ?? ""}`;
      const right = `${b.scheduledDate}|${b.scheduledTime ?? ""}`;
      return left.localeCompare(right);
    });
  },
});

export const createMeeting = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledDate: v.string(),
    scheduledTime: v.optional(v.string()),
    location: v.optional(v.string()),
    agenda: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("hoaMeetings", {
      ...args,
      userId,
      status: "scheduled",
    });
  },
});

export const updateMeeting = mutation({
  args: {
    id: v.id("hoaMeetings"),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    )),
    minutes: v.optional(v.string()),
    attendeeCount: v.optional(v.number()),
    followUpActions: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const meeting = await ctx.db.get(args.id);
    if (!meeting || meeting.userId !== userId) throw new Error("Not found");

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
  },
});

// ========== ARC REQUESTS ==========
export const listArcRequests = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    let requests: any[] = [];
    if (args.propertyId) {
      requests = await ctx.db.query("arcRequests")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      requests = requests.filter((request) => request.userId === userId);
    } else {
      requests = await ctx.db.query("arcRequests")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }

    return await Promise.all(
      requests.map(async (request) => {
        const attachmentUrls = await Promise.all(
          (request.attachmentStorageIds ?? []).map(async (storageId: any) => await ctx.storage.getUrl(storageId)),
        );
        return {
          ...request,
          attachmentUrls: attachmentUrls.filter((url): url is string => Boolean(url)),
        };
      }),
    );
  },
});

export const createArcRequest = mutation({
  args: {
    propertyId: v.id("properties"),
    unit: v.string(),
    residentName: v.string(),
    requestType: v.union(v.literal("exterior_modification"), v.literal("landscaping"), v.literal("fence"), v.literal("paint"), v.literal("addition"), v.literal("other")),
    description: v.string(),
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("arcRequests", {
      ...args, userId, status: "submitted",
      submittedDate: new Date().toISOString().split("T")[0],
      attachmentStorageIds: args.attachmentStorageIds ?? [],
    });
  },
});

export const updateArcRequest = mutation({
  args: {
    id: v.id("arcRequests"),
    status: v.optional(v.union(v.literal("submitted"), v.literal("under_review"), v.literal("approved"), v.literal("denied"), v.literal("completed"))),
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
      const msgs = await ctx.db.query("residentMessages")
        .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      return msgs.filter((m) => m.userId === userId).sort((a, b) => b.sentAt - a.sentAt);
    }
    const msgs = await ctx.db.query("residentMessages")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return msgs.sort((a, b) => b.sentAt - a.sentAt);
  },
});

export const sendMessage = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("announcement"), v.literal("alert"), v.literal("maintenance_notice"), v.literal("event"), v.literal("general")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    targetUnits: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("residentMessages", {
      ...args, userId, sentAt: Date.now(),
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
