import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getEffectivePayrollUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();

  if (!profile) return userId;

  const isSubAccount =
    (profile.role === "worker" || profile.role === "manager") &&
    !!profile.organizationUserId;

  return isSubAccount ? profile.organizationUserId : userId;
}

async function getViewerProfile(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();

  return { userId, profile };
}

export const getTaxSettings = query({
  args: {},
  returns: v.object({
    taxRate: v.number(),
    canEdit: v.boolean(),
  }),
  handler: async (ctx) => {
    const ownerUserId = await getEffectivePayrollUserId(ctx);
    const viewer = await getViewerProfile(ctx);

    if (!ownerUserId || !viewer?.profile) {
      return { taxRate: 0, canEdit: false };
    }

    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_userId", (q: any) => q.eq("userId", ownerUserId))
      .unique();

    const isPrimary =
      viewer.profile.role !== "worker" &&
      viewer.profile.role !== "manager" &&
      !viewer.profile.organizationUserId;

    return {
      taxRate: settings?.taxRate ?? 0,
      canEdit: isPrimary,
    };
  },
});

export const setTaxSettings = mutation({
  args: {
    taxRate: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    taxRate: v.number(),
  }),
  handler: async (ctx, args) => {
    const viewer = await getViewerProfile(ctx);
    if (!viewer?.userId || !viewer.profile) throw new Error("Not authenticated");

    const isPrimary =
      viewer.profile.role !== "worker" &&
      viewer.profile.role !== "manager" &&
      !viewer.profile.organizationUserId;

    if (!isPrimary) {
      throw new Error("Only primary accounts can update payroll taxes");
    }

    const nextRate = Math.max(0, Math.min(100, args.taxRate));

    const existing = await ctx.db
      .query("payrollSettings")
      .withIndex("by_userId", (q: any) => q.eq("userId", viewer.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        taxRate: nextRate,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("payrollSettings", {
        userId: viewer.userId,
        taxRate: nextRate,
        updatedAt: Date.now(),
      });
    }

    return { success: true, taxRate: nextRate };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getEffectivePayrollUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("payrollExports")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const generate = mutation({
  args: {
    periodStart: v.string(),
    periodEnd: v.string(),
    format: v.union(v.literal("csv"), v.literal("adp"), v.literal("paychex"), v.literal("quickbooks"), v.literal("excel")),
  },
  handler: async (ctx, args) => {
    const userId = await getEffectivePayrollUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();
    const taxRate = settings?.taxRate ?? 0;

    // Get all approved time entries in this period
    const startTs = new Date(args.periodStart).getTime();
    const endTs = new Date(`${args.periodEnd}T23:59:59`).getTime();

    const allEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const periodEntries = allEntries.filter(
      (e) =>
        (e.status === "approved" || e.status === "clocked_out") &&
        e.clockIn >= startTs &&
        e.clockIn <= endTs &&
        e.totalHours != null
    );

    // Get staff details
    const staffIds = [...new Set(periodEntries.map((e) => e.staffId))];
    const staffMap = new Map<string, { name: string; hourlyRate: number }>();
    for (const id of staffIds) {
      const s = await ctx.db.get(id);
      if (s) staffMap.set(id.toString(), { name: s.name, hourlyRate: s.hourlyRate });
    }

    // Aggregate by staff
    const staffHours = new Map<string, { regular: number; overtime: number; staffId: typeof staffIds[0] }>();
    for (const entry of periodEntries) {
      const key = entry.staffId.toString();
      const current = staffHours.get(key) || { regular: 0, overtime: 0, staffId: entry.staffId };
      const hours = entry.totalHours || 0;
      // Simple overtime: >40hrs/week = overtime (simplification for period)
      const totalSoFar = current.regular + current.overtime;
      if (totalSoFar + hours > 40) {
        const regularRemaining = Math.max(0, 40 - totalSoFar);
        current.regular += regularRemaining;
        current.overtime += hours - regularRemaining;
      } else {
        current.regular += hours;
      }
      staffHours.set(key, current);
    }

    // Build payroll entries
    const entries = [];
    let totalHours = 0;
    let totalAmount = 0;

    for (const [staffIdStr, hours] of staffHours) {
      const staffInfo = staffMap.get(staffIdStr);
      if (!staffInfo) continue;
      const regularPay = Math.round(hours.regular * staffInfo.hourlyRate * 100) / 100;
      const overtimePay = Math.round(hours.overtime * staffInfo.hourlyRate * 1.5 * 100) / 100;
      const total = regularPay + overtimePay;
      entries.push({
        staffId: hours.staffId,
        staffName: staffInfo.name,
        regularHours: Math.round(hours.regular * 100) / 100,
        overtimeHours: Math.round(hours.overtime * 100) / 100,
        regularPay,
        overtimePay,
        totalPay: total,
      });
      totalHours += hours.regular + hours.overtime;
      totalAmount += total;
    }

    const taxAmount = Math.round(totalAmount * (taxRate / 100) * 100) / 100;
    const totalWithTax = Math.round((totalAmount + taxAmount) * 100) / 100;

    return await ctx.db.insert("payrollExports", {
      userId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      format: args.format,
      status: "draft",
      totalHours: Math.round(totalHours * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      taxRate,
      taxAmount,
      totalWithTax,
      staffCount: entries.length,
      entries,
    });
  },
});

export const approve = mutation({
  args: { id: v.id("payrollExports") },
  handler: async (ctx, args) => {
    const userId = await getEffectivePayrollUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: "approved" });
  },
});

export const markExported = mutation({
  args: { id: v.id("payrollExports") },
  handler: async (ctx, args) => {
    const userId = await getEffectivePayrollUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: "exported", exportedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("payrollExports") },
  handler: async (ctx, args) => {
    const userId = await getEffectivePayrollUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
