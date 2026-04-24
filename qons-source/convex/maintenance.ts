import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const categoryValidator = v.union(
  v.literal("plumbing"),
  v.literal("electrical"),
  v.literal("hvac"),
  v.literal("appliance"),
  v.literal("structural"),
  v.literal("pest"),
  v.literal("landscaping"),
  v.literal("general"),
  v.literal("emergency"),
);

const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("emergency"),
);

const statusValidator = v.union(
  v.literal("submitted"),
  v.literal("triaged"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

/**
 * List maintenance requests with optional filters
 */
export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 500;

    if (args.propertyId) {
      let requests = await ctx.db
        .query("maintenanceRequests")
        .withIndex("by_propertyId", (q) =>
          q.eq("propertyId", args.propertyId!),
        )
        .take(take);
      requests = requests.filter((r) => r.userId === userId);
      if (args.status) {
        requests = requests.filter((r) => r.status === args.status);
      }
      if (args.priority) {
        requests = requests.filter((r) => r.priority === args.priority);
      }
      return requests.sort((a, b) => b.createdAt - a.createdAt);
    }

    let requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(take);

    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }
    if (args.priority) {
      requests = requests.filter((r) => r.priority === args.priority);
    }

    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Create a maintenance request
 */
export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    residentId: v.optional(v.id("residents")),
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    priority: priorityValidator,
    images: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    residentNotes: v.optional(v.string()),
    unitNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("maintenanceRequests", {
      ...args,
      userId,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a maintenance request
 */
export const update = mutation({
  args: {
    id: v.id("maintenanceRequests"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(categoryValidator),
    priority: v.optional(priorityValidator),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    scheduledDate: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    residentNotes: v.optional(v.string()),
    unitNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.id);
    if (!request || request.userId !== userId) throw new Error("Not found");

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, { ...filtered, updatedAt: Date.now() });
  },
});

/**
 * Update maintenance request status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("maintenanceRequests"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.id);
    if (!request || request.userId !== userId) throw new Error("Not found");

    const patch: Record<string, any> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "completed") {
      patch.completedAt = Date.now();
    }

    await ctx.db.patch(args.id, patch);
  },
});

/**
 * Assign maintenance request to staff or vendor
 */
export const assign = mutation({
  args: {
    id: v.id("maintenanceRequests"),
    assignedStaffId: v.optional(v.id("staff")),
    assignedVendor: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.id);
    if (!request || request.userId !== userId) throw new Error("Not found");

    const patch: Record<string, any> = {
      status: "assigned" as const,
      updatedAt: Date.now(),
    };
    if (args.assignedStaffId !== undefined) {
      patch.assignedStaffId = args.assignedStaffId;
    }
    if (args.assignedVendor !== undefined) {
      patch.assignedVendor = args.assignedVendor;
    }
    if (args.scheduledDate !== undefined) {
      patch.scheduledDate = args.scheduledDate;
    }
    if (args.estimatedCost !== undefined) {
      patch.estimatedCost = args.estimatedCost;
    }

    await ctx.db.patch(args.id, patch);
  },
});

/**
 * Get maintenance request statistics
 */
export const getStats = query({
  args: { propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return { submitted: 0, triaged: 0, assigned: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 };

    let requests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2000);

    if (args.propertyId) {
      requests = requests.filter((r) => r.propertyId === args.propertyId);
    }

    return {
      submitted: requests.filter((r) => r.status === "submitted").length,
      triaged: requests.filter((r) => r.status === "triaged").length,
      assigned: requests.filter((r) => r.status === "assigned").length,
      inProgress: requests.filter((r) => r.status === "in_progress").length,
      completed: requests.filter((r) => r.status === "completed").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
      total: requests.length,
    };
  },
});
