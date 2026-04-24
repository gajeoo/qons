import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// ========== QUERIES ==========

export const list = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rules = await ctx.db
      .query("automationRules")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .take(100);

    return rules;
  },
});

export const getLogs = query({
  args: {
    ruleId: v.optional(v.id("automationRules")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 50;

    if (args.ruleId) {
      return await ctx.db
        .query("automationLogs")
        .withIndex("by_ruleId", q => q.eq("ruleId", args.ruleId!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("automationLogs")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const getStats = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const allRules = await ctx.db
      .query("automationRules")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(200);

    const recentLogs = await ctx.db
      .query("automationLogs")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .take(100);

    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    return {
      totalRules: allRules.length,
      activeRules: allRules.filter(r => r.isActive).length,
      runsLast24h: recentLogs.filter(l => l.executedAt > last24h).length,
      runsLast7d: recentLogs.filter(l => l.executedAt > last7d).length,
      successRate:
        recentLogs.length > 0
          ? Math.round(
              (recentLogs.filter(l => l.status === "success").length /
                recentLogs.length) *
                100,
            )
          : 100,
      totalExecutions: recentLogs.length,
    };
  },
});

// ========== MUTATIONS ==========

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    trigger: v.string(),
    conditions: v.array(
      v.object({
        field: v.string(),
        operator: v.string(),
        value: v.string(),
      }),
    ),
    actions: v.array(
      v.object({
        type: v.string(),
        config: v.string(),
      }),
    ),
    cronExpression: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("automationRules", {
      userId,
      name: args.name,
      description: args.description,
      isActive: true,
      trigger: args.trigger as any,
      conditions: args.conditions as any,
      actions: args.actions as any,
      cronExpression: args.cronExpression,
      propertyId: args.propertyId,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
    });
  },
});

export const update = mutation({
  args: {
    ruleId: v.id("automationRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    trigger: v.optional(v.string()),
    conditions: v.optional(
      v.array(
        v.object({
          field: v.string(),
          operator: v.string(),
          value: v.string(),
        }),
      ),
    ),
    actions: v.optional(
      v.array(
        v.object({
          type: v.string(),
          config: v.string(),
        }),
      ),
    ),
    cronExpression: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rule = await ctx.db.get(args.ruleId);
    if (!rule || rule.userId !== userId) throw new Error("Rule not found");

    const { ruleId, ...updates } = args;
    const patch: Record<string, any> = { updatedAt: Date.now() };

    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined)
      patch.description = updates.description;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    if (updates.trigger !== undefined) patch.trigger = updates.trigger;
    if (updates.conditions !== undefined) patch.conditions = updates.conditions;
    if (updates.actions !== undefined) patch.actions = updates.actions;
    if (updates.cronExpression !== undefined)
      patch.cronExpression = updates.cronExpression;
    if (updates.propertyId !== undefined) patch.propertyId = updates.propertyId;

    await ctx.db.patch(args.ruleId, patch);
    return null;
  },
});

export const remove = mutation({
  args: { ruleId: v.id("automationRules") },
  handler: async (ctx, { ruleId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rule = await ctx.db.get(ruleId);
    if (!rule || rule.userId !== userId) throw new Error("Rule not found");

    // Delete associated logs
    const logs = await ctx.db
      .query("automationLogs")
      .withIndex("by_ruleId", q => q.eq("ruleId", ruleId))
      .take(500);

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    await ctx.db.delete(ruleId);
    return null;
  },
});

export const toggle = mutation({
  args: { ruleId: v.id("automationRules") },
  handler: async (ctx, { ruleId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rule = await ctx.db.get(ruleId);
    if (!rule || rule.userId !== userId) throw new Error("Rule not found");

    await ctx.db.patch(ruleId, {
      isActive: !rule.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ========== AUTOMATION ENGINE (Internal) ==========

/**
 * Evaluate and run automation rules for a given trigger event.
 * Called internally when events happen (task created, status changed, etc.)
 */
export const evaluateRules = internalMutation({
  args: {
    userId: v.id("users"),
    trigger: v.string(),
    context: v.string(), // JSON context about the event
  },
  handler: async (ctx, args) => {
    const rules = await ctx.db
      .query("automationRules")
      .withIndex("by_userId_isActive", q =>
        q.eq("userId", args.userId).eq("isActive", true),
      )
      .take(50);

    const matchingRules = rules.filter(r => r.trigger === args.trigger);
    const eventContext = JSON.parse(args.context);

    for (const rule of matchingRules) {
      try {
        // Check conditions
        const conditionsMet = rule.conditions.every(condition => {
          const fieldValue = eventContext[condition.field];
          switch (condition.operator) {
            case "equals":
              return String(fieldValue) === condition.value;
            case "not_equals":
              return String(fieldValue) !== condition.value;
            case "contains":
              return String(fieldValue ?? "")
                .toLowerCase()
                .includes(condition.value.toLowerCase());
            case "greater_than":
              return Number(fieldValue) > Number(condition.value);
            case "less_than":
              return Number(fieldValue) < Number(condition.value);
            default:
              return true;
          }
        });

        if (!conditionsMet) {
          await ctx.db.insert("automationLogs", {
            userId: args.userId,
            ruleId: rule._id,
            ruleName: rule.name,
            trigger: args.trigger,
            status: "skipped",
            actionsExecuted: 0,
            details: JSON.stringify({ reason: "Conditions not met" }),
            executedAt: Date.now(),
          });
          continue;
        }

        // Execute actions
        let actionsExecuted = 0;
        const actionResults: string[] = [];

        for (const action of rule.actions) {
          const config = JSON.parse(action.config);

          switch (action.type) {
            case "create_task": {
              await ctx.db.insert("tasks", {
                userId: args.userId,
                title: config.title || `Auto: ${rule.name}`,
                description:
                  config.description ||
                  `Automatically created by rule: ${rule.name}`,
                priority: config.priority || "medium",
                status: "todo",
                category: config.category || "administrative",
                propertyId: eventContext.propertyId || rule.propertyId,
                dueDate: config.dueDate,
              });
              actionResults.push("Task created");
              actionsExecuted++;
              break;
            }
            case "update_status": {
              if (eventContext.taskId) {
                await ctx.db.patch(eventContext.taskId, {
                  status: config.status || "in_progress",
                });
                actionResults.push(`Status updated to ${config.status}`);
                actionsExecuted++;
              }
              break;
            }
            case "escalate_priority": {
              if (eventContext.taskId) {
                const priorityOrder = ["low", "medium", "high", "urgent"];
                const task = await ctx.db.get(eventContext.taskId);
                if (task) {
                  const currentIdx = priorityOrder.indexOf(
                    (task as any).priority || "low",
                  );
                  const newPriority =
                    priorityOrder[
                      Math.min(currentIdx + 1, priorityOrder.length - 1)
                    ];
                  await ctx.db.patch(eventContext.taskId, {
                    priority: newPriority as any,
                  });
                  actionResults.push(`Priority escalated to ${newPriority}`);
                  actionsExecuted++;
                }
              }
              break;
            }
            case "assign_staff": {
              if (eventContext.taskId && config.staffId) {
                await ctx.db.patch(eventContext.taskId, {
                  assignedToStaffId: config.staffId,
                });
                actionResults.push("Staff assigned");
                actionsExecuted++;
              }
              break;
            }
            case "add_note": {
              if (eventContext.taskId) {
                const task = await ctx.db.get(eventContext.taskId);
                if (task) {
                  const existingDesc = (task as any).description || "";
                  await ctx.db.patch(eventContext.taskId, {
                    description: `${existingDesc}\n\n[Auto] ${config.note || rule.name}`,
                  });
                  actionResults.push("Note added");
                  actionsExecuted++;
                }
              }
              break;
            }
            case "send_notification": {
              // Log the notification intent (actual email/push would need external service)
              actionResults.push(
                `Notification: ${config.message || rule.name}`,
              );
              actionsExecuted++;
              break;
            }
          }
        }

        // Log success
        await ctx.db.insert("automationLogs", {
          userId: args.userId,
          ruleId: rule._id,
          ruleName: rule.name,
          trigger: args.trigger,
          status: "success",
          actionsExecuted,
          details: JSON.stringify({ actions: actionResults }),
          executedAt: Date.now(),
        });

        // Update rule run count
        await ctx.db.patch(rule._id, {
          runCount: (rule.runCount || 0) + 1,
          lastRunAt: Date.now(),
        });
      } catch (error) {
        await ctx.db.insert("automationLogs", {
          userId: args.userId,
          ruleId: rule._id,
          ruleName: rule.name,
          trigger: args.trigger,
          status: "failed",
          actionsExecuted: 0,
          details: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          executedAt: Date.now(),
        });
      }
    }
  },
});

/**
 * Run scheduled automation checks (lease expiry, overdue rent, etc.)
 * This should be called periodically by a cron job.
 */
export const runScheduledChecks = internalMutation({
  args: {},
  handler: async ctx => {
    // Get all active schedule-trigger rules
    const allActiveRules = await ctx.db
      .query("automationRules")
      .withIndex("by_isActive", q => q.eq("isActive", true))
      .take(200);

    const scheduleRules = allActiveRules.filter(
      r =>
        r.trigger === "schedule" ||
        r.trigger === "lease_expiring" ||
        r.trigger === "rent_overdue",
    );

    const now = Date.now();

    for (const rule of scheduleRules) {
      // Check if enough time has passed since last run
      const interval =
        rule.cronExpression === "daily"
          ? 24 * 60 * 60 * 1000
          : rule.cronExpression === "weekly"
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000; // monthly default

      if (rule.lastRunAt && now - rule.lastRunAt < interval) continue;

      try {
        let actionsExecuted = 0;
        const actionResults: string[] = [];

        if (rule.trigger === "lease_expiring") {
          // Find residents with leases ending soon
          const residents = await ctx.db
            .query("residents")
            .withIndex("by_userId", q => q.eq("userId", rule.userId))
            .take(500);

          const daysThreshold = rule.conditions.find(
            c => c.field === "days_before_expiry",
          );
          const days = daysThreshold
            ? Number.parseInt(daysThreshold.value, 10)
            : 30;
          const thresholdDate = new Date(now + days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

          for (const resident of residents) {
            if (
              resident.status === "active" &&
              resident.leaseEnd &&
              resident.leaseEnd <= thresholdDate
            ) {
              // Execute actions for each matching resident
              for (const action of rule.actions) {
                const config = JSON.parse(action.config);
                if (action.type === "create_task") {
                  await ctx.db.insert("tasks", {
                    userId: rule.userId,
                    title:
                      config.title ||
                      `Lease Expiring: ${resident.name} (Unit ${resident.unit})`,
                    description: `Lease for ${resident.name} in unit ${resident.unit} expires on ${resident.leaseEnd}. Auto-generated by rule: ${rule.name}`,
                    priority: config.priority || "high",
                    status: "todo",
                    category: "administrative",
                    propertyId: resident.propertyId,
                  });
                  actionsExecuted++;
                  actionResults.push(`Task created for ${resident.name}`);
                }
              }
            }
          }
        }

        if (rule.trigger === "rent_overdue") {
          // Check HOA dues that are overdue
          const dues = await ctx.db
            .query("hoaDues")
            .withIndex("by_userId", q => q.eq("userId", rule.userId))
            .take(500);

          const today = new Date().toISOString().split("T")[0];
          const overdueDues = dues.filter(
            d => d.status === "pending" && d.dueDate < today,
          );

          for (const due of overdueDues) {
            await ctx.db.patch(due._id, { status: "overdue" });
            for (const action of rule.actions) {
              const config = JSON.parse(action.config);
              if (action.type === "create_task") {
                await ctx.db.insert("tasks", {
                  userId: rule.userId,
                  title:
                    config.title ||
                    `Overdue Rent: ${due.residentName} (${due.unit})`,
                  description: `HOA dues of $${(due.amount / 100).toFixed(2)} for ${due.residentName} in unit ${due.unit} were due ${due.dueDate}. Auto-generated.`,
                  priority: "high",
                  status: "todo",
                  category: "administrative",
                  propertyId: due.propertyId,
                });
                actionsExecuted++;
                actionResults.push(`Overdue task for ${due.residentName}`);
              }
            }
          }
        }

        // Log the scheduled run
        await ctx.db.insert("automationLogs", {
          userId: rule.userId,
          ruleId: rule._id,
          ruleName: rule.name,
          trigger: rule.trigger,
          status: actionsExecuted > 0 ? "success" : "skipped",
          actionsExecuted,
          details: JSON.stringify({
            actions: actionResults,
            scheduledRun: true,
          }),
          executedAt: now,
        });

        await ctx.db.patch(rule._id, {
          lastRunAt: now,
          runCount: (rule.runCount || 0) + 1,
        });
      } catch (error) {
        await ctx.db.insert("automationLogs", {
          userId: rule.userId,
          ruleId: rule._id,
          ruleName: rule.name,
          trigger: rule.trigger,
          status: "failed",
          actionsExecuted: 0,
          details: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          executedAt: now,
        });
      }
    }
  },
});
