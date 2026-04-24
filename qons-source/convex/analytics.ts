import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const getExecutiveDashboard = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Properties
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(1000);

    // Staff
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(1000);

    // Shifts
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(1000);

    // Time entries
    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(1000);

    // Payroll
    const payrolls = await ctx.db
      .query("payrollExports")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(1000);

    // Residents
    const residents = await ctx.db
      .query("residents")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(2000);

    // Rent payments
    const rentPayments = await ctx.db
      .query("rentPayments")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(2000);

    // Maintenance requests
    const maintenance = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(2000);

    // Leases
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .take(2000);

    const activeStaff = staff.filter(s => s.status === "active");
    const activeProperties = properties.filter(p => p.status === "active");

    // Utilization rate: shifts filled vs total shifts this month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthShifts = shifts.filter(s => s.date >= monthStart);
    const filledShifts = monthShifts.filter(
      s => s.staffId && s.status !== "cancelled" && s.status !== "open",
    );
    const utilizationRate =
      monthShifts.length > 0
        ? Math.round((filledShifts.length / monthShifts.length) * 100)
        : 0;

    // Total hours this month
    const monthStart_ts = new Date(monthStart).getTime();
    const monthEntries = timeEntries.filter(e => e.clockIn >= monthStart_ts);
    const totalHoursThisMonth = monthEntries.reduce(
      (sum, e) => sum + (e.totalHours || 0),
      0,
    );

    // Cost per building (this month)
    const totalPayroll = payrolls
      .filter(p => p.periodStart >= monthStart)
      .reduce((sum, p) => sum + p.totalAmount, 0);
    const costPerBuilding =
      activeProperties.length > 0
        ? Math.round(totalPayroll / activeProperties.length)
        : 0;

    // Shift coverage by property
    const propertyStats = activeProperties.map(p => {
      const propShifts = monthShifts.filter(s => s.propertyId === p._id);
      const filled = propShifts.filter(
        s => s.staffId && s.status !== "cancelled" && s.status !== "open",
      );
      return {
        id: p._id,
        name: p.name,
        totalShifts: propShifts.length,
        filledShifts: filled.length,
        coverageRate:
          propShifts.length > 0
            ? Math.round((filled.length / propShifts.length) * 100)
            : 100,
      };
    });

    // Staff role distribution
    const roleDistribution: Record<string, number> = {};
    for (const s of activeStaff) {
      roleDistribution[s.role] = (roleDistribution[s.role] || 0) + 1;
    }

    // Recent week trend (hours per day for last 7 days)
    const weekTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split("T")[0];
      const dayStart = new Date(dayStr).getTime();
      const dayEnd = dayStart + 86400000;
      const dayEntries = timeEntries.filter(
        e => e.clockIn >= dayStart && e.clockIn < dayEnd,
      );
      const dayHours = dayEntries.reduce(
        (sum, e) => sum + (e.totalHours || 0),
        0,
      );
      weekTrend.push({
        date: dayStr,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        hours: Math.round(dayHours * 10) / 10,
        shifts: shifts.filter(s => s.date === dayStr).length,
      });
    }

    // Rent & financial stats
    const now2 = new Date();
    const thisMonth = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, "0")}`;
    const monthRentPayments = rentPayments.filter(p => p.dueDate?.startsWith(thisMonth));
    const collectedThisMonth = monthRentPayments.filter(p => p.status === "completed").reduce((s, p) => s + (p.amount || 0), 0);
    const pendingThisMonth = monthRentPayments.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0);
    const overduePayments = rentPayments.filter(p => p.status === "pending" && p.dueDate && p.dueDate < now2.toISOString().split("T")[0]);

    // Maintenance stats
    const openMaintenance = maintenance.filter(m => m.status === "open" || m.status === "in_progress");
    const completedMaintenance = maintenance.filter(m => m.status === "completed");
    const monthMaintenance = maintenance.filter(m => {
      const created = new Date(m._creationTime);
      return created.getMonth() === now2.getMonth() && created.getFullYear() === now2.getFullYear();
    });

    // Lease stats
    const activeLeases = leases.filter(l => l.status === "active");
    const expiringLeases = leases.filter(l => {
      if (l.status !== "active") return false;
      const end = new Date(l.endDate + "T00:00:00");
      const daysUntil = (end.getTime() - now2.getTime()) / 86400000;
      return daysUntil <= 60 && daysUntil > 0;
    });

    return {
      overview: {
        totalProperties: properties.length,
        activeProperties: activeProperties.length,
        totalStaff: staff.length,
        activeStaff: activeStaff.length,
        totalUnits: properties.reduce((sum, p) => sum + p.units, 0),
        totalResidents: residents.length,
        activeResidents: residents.filter(r => r.status === "active").length,
      },
      performance: {
        utilizationRate,
        totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
        costPerBuilding,
        totalPayrollThisMonth: Math.round(totalPayroll * 100) / 100,
        shiftsThisMonth: monthShifts.length,
        openShifts: monthShifts.filter(s => s.status === "open").length,
      },
      financial: {
        collectedThisMonth: Math.round(collectedThisMonth * 100) / 100,
        pendingThisMonth: Math.round(pendingThisMonth * 100) / 100,
        overdueCount: overduePayments.length,
        overdueAmount: Math.round(overduePayments.reduce((s, p) => s + (p.amount || 0), 0) * 100) / 100,
        totalPayments: rentPayments.length,
        collectionRate: monthRentPayments.length > 0
          ? Math.round((monthRentPayments.filter(p => p.status === "completed").length / monthRentPayments.length) * 100)
          : 0,
      },
      maintenance: {
        open: openMaintenance.length,
        completed: completedMaintenance.length,
        thisMonth: monthMaintenance.length,
        total: maintenance.length,
      },
      leasing: {
        activeLeases: activeLeases.length,
        expiringSoon: expiringLeases.length,
        totalLeases: leases.length,
        occupancyRate: properties.reduce((sum, p) => sum + p.units, 0) > 0
          ? Math.round((activeLeases.length / properties.reduce((sum, p) => sum + p.units, 0)) * 100)
          : 0,
      },
      propertyStats,
      roleDistribution,
      weekTrend,
    };
  },
});
