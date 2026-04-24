import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

/**
 * List tasks (for current user or their org)
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      userId: v.id("users"),
      assignedToUserId: v.optional(v.id("users")),
      assignedToStaffId: v.optional(v.id("staff")),
      propertyId: v.optional(v.id("properties")),
      title: v.string(),
      description: v.optional(v.string()),
      priority: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
      status: v.union(
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
      dueDate: v.optional(v.string()),
      completedAt: v.optional(v.number()),
      category: v.optional(
        v.union(
          v.literal("maintenance"),
          v.literal("inspection"),
          v.literal("cleaning"),
          v.literal("administrative"),
          v.literal("hoa"),
          v.literal("other"),
        ),
      ),
      assigneeName: v.optional(v.string()),
      propertyName: v.optional(v.string()),
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get tasks created by user OR assigned to user
    const createdTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(500);

    const assignedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignedToUserId", q => q.eq("assignedToUserId", userId))
      .take(500);

    // Merge and deduplicate
    const taskMap = new Map<string, any>();
    for (const t of [...createdTasks, ...assignedTasks]) {
      taskMap.set(t._id, t);
    }

    const tasks = Array.from(taskMap.values());

    // Enrich with names
    const enriched = await Promise.all(
      tasks.map(async task => {
        let assigneeName: string | undefined;
        if (task.assignedToUserId) {
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", q => q.eq("userId", task.assignedToUserId!))
            .unique();
          assigneeName = profile?.email ?? undefined;
        } else if (task.assignedToStaffId) {
          const staff = await ctx.db.get(task.assignedToStaffId);
          assigneeName = (staff as any)?.name ?? undefined;
        }

        let propertyName: string | undefined;
        if (task.propertyId) {
          const prop = await ctx.db.get(task.propertyId);
          propertyName = (prop as any)?.name ?? undefined;
        }

        return { ...task, assigneeName, propertyName };
      }),
    );

    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/**
 * Create a new task
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    assignedToUserId: v.optional(v.id("users")),
    assignedToStaffId: v.optional(v.id("staff")),
    propertyId: v.optional(v.id("properties")),
    dueDate: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("maintenance"),
        v.literal("inspection"),
        v.literal("cleaning"),
        v.literal("administrative"),
        v.literal("hoa"),
        v.literal("other"),
      ),
    ),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const taskId = await ctx.db.insert("tasks", {
      userId,
      ...args,
      status: "todo",
    });

    // Fire automation trigger
    await ctx.scheduler.runAfter(0, internal.automations.evaluateRules, {
      userId,
      trigger: "task_created",
      context: JSON.stringify({
        taskId,
        title: args.title,
        priority: args.priority,
        category: args.category || "other",
        propertyId: args.propertyId,
      }),
    });

    return taskId;
  },
});

/**
 * Update task status
 */
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { taskId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    const patch: Record<string, any> = { status };
    if (status === "completed") {
      patch.completedAt = Date.now();
    }

    await ctx.db.patch(taskId, patch);

    // Fire automation trigger for status change
    await ctx.scheduler.runAfter(0, internal.automations.evaluateRules, {
      userId,
      trigger: "task_status_changed",
      context: JSON.stringify({
        taskId,
        title: task.title,
        oldStatus: task.status,
        newStatus: status,
        priority: task.priority,
        category: task.category || "other",
        propertyId: task.propertyId,
      }),
    });

    return null;
  },
});

/**
 * Delete a task
 */
export const remove = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, { taskId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.delete(taskId);
    return null;
  },
});
