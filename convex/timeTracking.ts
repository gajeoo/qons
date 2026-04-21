import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get effective context — workers/managers belong to org owner's data scope.
 */
async function getEffectiveContext(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile) return null;

  const isWorker = profile.role === "worker";
  const isManager = profile.role === "manager";
  const isSubAccount = (isWorker || isManager) && !!profile.organizationUserId;
  const ownerUserId = isSubAccount ? profile.organizationUserId! : userId;

  // Find linked staff record
  let linkedStaffId: string | null = null;
  if (isSubAccount) {
    const staffRecord = await ctx.db
      .query("staff")
      .withIndex("by_linkedAccountUserId", (q: any) => q.eq("linkedAccountUserId", userId))
      .first();
    if (staffRecord) linkedStaffId = staffRecord._id;
  }

  return { userId, profile, isWorker, isManager, isSubAccount, ownerUserId, linkedStaffId };
}

export const list = query({
  args: {
    staffId: v.optional(v.id("staff")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const context = await getEffectiveContext(ctx);
    if (!context) return [];

    const { ownerUserId, isWorker, linkedStaffId } = context;

    let entries;

    // Workers can only see their own time entries
    if (isWorker && linkedStaffId) {
      entries = await ctx.db
        .query("timeEntries")
        .withIndex("by_staffId", (q: any) => q.eq("staffId", linkedStaffId))
        .collect();
      entries = entries.filter((e: any) => e.userId === ownerUserId);
    } else if (isWorker) {
      return [];
    } else if (args.staffId) {
      entries = await ctx.db
        .query("timeEntries")
        .withIndex("by_staffId", (q: any) => q.eq("staffId", args.staffId!))
        .collect();
      entries = entries.filter((e: any) => e.userId === ownerUserId);
    } else {
      entries = await ctx.db
        .query("timeEntries")
        .withIndex("by_userId", (q: any) => q.eq("userId", ownerUserId))
        .collect();
    }

    if (args.status) {
      entries = entries.filter((e: any) => e.status === args.status);
    }
    return entries.sort((a: any, b: any) => b.clockIn - a.clockIn);
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const context = await getEffectiveContext(ctx);
    if (!context) return [];

    const { ownerUserId, isWorker, linkedStaffId } = context;

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId", (q: any) => q.eq("userId", ownerUserId))
      .collect();

    let active = entries.filter((e: any) => e.status === "clocked_in");

    // Workers only see their own active entries
    if (isWorker && linkedStaffId) {
      active = active.filter((e: any) => e.staffId === linkedStaffId);
    } else if (isWorker) {
      return [];
    }

    return active;
  },
});

export const getStats = query({
  args: {
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const context = await getEffectiveContext(ctx);
    if (!context) return { totalHours: 0, activeNow: 0, entries: 0, avgHoursPerDay: 0 };

    const { ownerUserId, isWorker, linkedStaffId } = context;

    let entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId", (q: any) => q.eq("userId", ownerUserId))
      .collect();

    // Workers only see their own stats
    if (isWorker && linkedStaffId) {
      entries = entries.filter((e: any) => e.staffId === linkedStaffId);
    } else if (isWorker) {
      entries = [];
    }

    let filtered = entries;
    if (args.periodStart) {
      filtered = filtered.filter((e: any) => e.clockIn >= args.periodStart!);
    }
    if (args.periodEnd) {
      filtered = filtered.filter((e: any) => e.clockIn <= args.periodEnd!);
    }

    const totalHours = filtered.reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0);
    const activeNow = entries.filter((e: any) => e.status === "clocked_in").length;
    const uniqueDays = new Set(filtered.map((e: any) => new Date(e.clockIn).toISOString().split("T")[0])).size;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      activeNow,
      entries: filtered.length,
      avgHoursPerDay: uniqueDays > 0 ? Math.round((totalHours / uniqueDays) * 100) / 100 : 0,
    };
  },
});

export const getTimesheetSummary = query({
  args: {
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const context = await getEffectiveContext(ctx);
    if (!context) {
      return {
        periodStart: args.periodStart ?? null,
        periodEnd: args.periodEnd ?? null,
        totalHours: 0,
        totalAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        totalWithTax: 0,
        staffCount: 0,
        staff: [],
      };
    }

    const { ownerUserId, isWorker, linkedStaffId } = context;

    const allEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId", (q: any) => q.eq("userId", ownerUserId))
      .collect();

    let entries = allEntries.filter(
      (e: any) =>
        (e.status === "approved" || e.status === "clocked_out") &&
        e.totalHours != null,
    );

    if (args.periodStart) {
      entries = entries.filter((e: any) => e.clockIn >= args.periodStart!);
    }
    if (args.periodEnd) {
      entries = entries.filter((e: any) => e.clockIn <= args.periodEnd!);
    }

    if (isWorker && linkedStaffId) {
      entries = entries.filter((e: any) => e.staffId === linkedStaffId);
    } else if (isWorker) {
      entries = [];
    }

    const staffIds = [...new Set(entries.map((e: any) => e.staffId.toString()))];
    const staffDocs = await Promise.all(
      staffIds.map(async (id) => {
        const doc = await ctx.db.get(id as any);
        return doc;
      }),
    );

    const staffById = new Map(
      staffDocs
        .filter(Boolean)
        .map((staff: any) => [staff._id.toString(), staff]),
    );

    const aggregates = new Map<string, {
      staffId: any;
      staffName: string;
      hourlyRate: number;
      regularHours: number;
      overtimeHours: number;
      regularPay: number;
      overtimePay: number;
      totalPay: number;
      entries: number;
    }>();

    for (const entry of entries) {
      const staff = staffById.get(entry.staffId.toString());
      if (!staff) continue;

      const key = staff._id.toString();
      const existing = aggregates.get(key) ?? {
        staffId: staff._id,
        staffName: staff.name,
        hourlyRate: staff.hourlyRate,
        regularHours: 0,
        overtimeHours: 0,
        regularPay: 0,
        overtimePay: 0,
        totalPay: 0,
        entries: 0,
      };

      const totalSoFar = existing.regularHours + existing.overtimeHours;
      const hours = entry.totalHours ?? 0;
      const regularRemaining = Math.max(0, 40 - totalSoFar);
      const regularHours = Math.min(hours, regularRemaining);
      const overtimeHours = Math.max(0, hours - regularHours);

      existing.regularHours += regularHours;
      existing.overtimeHours += overtimeHours;
      existing.regularPay += regularHours * existing.hourlyRate;
      existing.overtimePay += overtimeHours * existing.hourlyRate * 1.5;
      existing.totalPay = existing.regularPay + existing.overtimePay;
      existing.entries += 1;

      aggregates.set(key, existing);
    }

    const staff = Array.from(aggregates.values())
      .map((row) => ({
        ...row,
        regularHours: Math.round(row.regularHours * 100) / 100,
        overtimeHours: Math.round(row.overtimeHours * 100) / 100,
        regularPay: Math.round(row.regularPay * 100) / 100,
        overtimePay: Math.round(row.overtimePay * 100) / 100,
        totalPay: Math.round(row.totalPay * 100) / 100,
      }))
      .sort((a, b) => b.totalPay - a.totalPay);

    const totalHours = staff.reduce(
      (sum, row) => sum + row.regularHours + row.overtimeHours,
      0,
    );
    const totalAmount = staff.reduce((sum, row) => sum + row.totalPay, 0);

    const settings = await ctx.db
      .query("payrollSettings")
      .withIndex("by_userId", (q: any) => q.eq("userId", ownerUserId))
      .unique();

    const taxRate = settings?.taxRate ?? 0;
    const taxAmount = Math.round(totalAmount * (taxRate / 100) * 100) / 100;
    const totalWithTax = Math.round((totalAmount + taxAmount) * 100) / 100;

    return {
      periodStart: args.periodStart ?? null,
      periodEnd: args.periodEnd ?? null,
      totalHours: Math.round(totalHours * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      taxRate,
      taxAmount,
      totalWithTax,
      staffCount: staff.length,
      staff,
    };
  },
});

export const clockIn = mutation({
  args: {
    staffId: v.id("staff"),
    propertyId: v.id("properties"),
    shiftId: v.optional(v.id("shifts")),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const context = await getEffectiveContext(ctx);
    if (!context) throw new Error("Not authenticated");

    if (context.isWorker) {
      if (!context.linkedStaffId) {
        throw new Error("Worker account is not linked to a staff profile");
      }
      if (args.staffId !== context.linkedStaffId) {
        throw new Error("Workers can only clock in for their own staff profile");
      }
    }

    const ownerUserId = context.ownerUserId;

    // Check staff is not already clocked in
    const existing = await ctx.db
      .query("timeEntries")
      .withIndex("by_staffId", (q: any) => q.eq("staffId", args.staffId))
      .collect();
    const alreadyClockedIn = existing.find((e: any) => e.status === "clocked_in");
    if (alreadyClockedIn) throw new Error("Staff member is already clocked in");

    const entryId = await ctx.db.insert("timeEntries", {
      userId: ownerUserId,
      staffId: args.staffId,
      propertyId: args.propertyId,
      shiftId: args.shiftId,
      clockIn: Date.now(),
      clockInLat: args.latitude,
      clockInLng: args.longitude,
      status: "clocked_in",
      notes: args.notes,
    });

    // Update shift status if linked
    if (args.shiftId) {
      await ctx.db.patch(args.shiftId, { status: "in_progress" });
    }

    return entryId;
  },
});

export const clockOut = mutation({
  args: {
    id: v.id("timeEntries"),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    breakMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const context = await getEffectiveContext(ctx);
    if (!context) throw new Error("Not authenticated");

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== context.ownerUserId) throw new Error("Not found");

    if (context.isWorker) {
      if (!context.linkedStaffId || entry.staffId !== context.linkedStaffId) {
        throw new Error("Workers can only clock out their own time entries");
      }
    }

    if (entry.status !== "clocked_in") throw new Error("Not clocked in");

    const clockOut = Date.now();
    const rawHours = (clockOut - entry.clockIn) / (1000 * 60 * 60);
    const breakHours = (args.breakMinutes || 0) / 60;
    const totalHours = Math.max(0, rawHours - breakHours);

    await ctx.db.patch(args.id, {
      clockOut,
      clockOutLat: args.latitude,
      clockOutLng: args.longitude,
      breakMinutes: args.breakMinutes,
      totalHours: Math.round(totalHours * 100) / 100,
      status: "clocked_out",
      notes: args.notes || entry.notes,
    });

    // Update linked shift
    if (entry.shiftId) {
      await ctx.db.patch(entry.shiftId, { status: "completed" });
    }
  },
});

export const approve = mutation({
  args: { id: v.id("timeEntries") },
  handler: async (ctx, args) => {
    const context = await getEffectiveContext(ctx);
    if (!context) throw new Error("Not authenticated");

    // Only managers/owners can approve — not workers
    if (context.isWorker) throw new Error("Workers cannot approve time entries");

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== context.ownerUserId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: "approved" });
  },
});
