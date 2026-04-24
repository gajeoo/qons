import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const getExecutiveDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Properties
    const properties = await ctx.db.query("properties")
      .withIndex("by_userId", (q) => q.eq("userId", userId)).collect();

    // Staff
    const staff = await ctx.db.query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", userId)).collect();

    // Shifts
    const shifts = await ctx.db.query("shifts")
      .withIndex("by_userId", (q) => q.eq("userId", userId)).collect();

    // Time entries
    const timeEntries = await ctx.db.query("timeEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId)).collect();

    // Payroll
    const payrolls = await ctx.db.query("payrollExports")
      .withIndex("by_userId", (q) => q.eq("userId", userId)).collect();

    const bookkeepingEntries = await ctx.db
      .query("bookkeepingEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const rentInvoices = await ctx.db
      .query("rentInvoices")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const activeStaff = staff.filter((s) => s.status === "active");
    const activeProperties = properties.filter((p) => p.status === "active");

    // Utilization rate: shifts filled vs total shifts this month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthShifts = shifts.filter((s) => s.date >= monthStart);
    const filledShifts = monthShifts.filter((s) => s.staffId && s.status !== "cancelled" && s.status !== "open");
    const utilizationRate = monthShifts.length > 0
      ? Math.round((filledShifts.length / monthShifts.length) * 100)
      : 0;

    // Total hours this month
    const monthStart_ts = new Date(monthStart).getTime();
    const monthEntries = timeEntries.filter((e) => e.clockIn >= monthStart_ts);
    const totalHoursThisMonth = monthEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);

    const currentMonthTag = monthStart.slice(0, 7);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthTag = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const revenueThisMonth = rentInvoices
      .filter((i) => (i.period || "").startsWith(currentMonthTag))
      .reduce((sum, i) => sum + (i.paidCents || 0), 0) / 100;
    const expensesThisMonth = bookkeepingEntries
      .filter((e) => (e.date || "").startsWith(currentMonthTag) && e.type === "expense")
      .reduce((sum, e) => sum + e.amountCents, 0) / 100;

    const revenuePrevMonth = rentInvoices
      .filter((i) => (i.period || "").startsWith(prevMonthTag))
      .reduce((sum, i) => sum + (i.paidCents || 0), 0) / 100;
    const expensesPrevMonth = bookkeepingEntries
      .filter((e) => (e.date || "").startsWith(prevMonthTag) && e.type === "expense")
      .reduce((sum, e) => sum + e.amountCents, 0) / 100;

    const noiThisMonth = revenueThisMonth - expensesThisMonth;
    const noiPrevMonth = revenuePrevMonth - expensesPrevMonth;

    // Cost per building (this month)
    const totalPayroll = payrolls
      .filter((p) => p.periodStart >= monthStart)
      .reduce((sum, p) => sum + p.totalAmount, 0);
    const costPerBuilding = activeProperties.length > 0
      ? Math.round(totalPayroll / activeProperties.length)
      : 0;

    // Shift coverage by property
    const propertyStats = activeProperties.map((p) => {
      const propShifts = monthShifts.filter((s) => s.propertyId === p._id);
      const filled = propShifts.filter((s) => s.staffId && s.status !== "cancelled" && s.status !== "open");
      return {
        id: p._id,
        name: p.name,
        totalShifts: propShifts.length,
        filledShifts: filled.length,
        coverageRate: propShifts.length > 0 ? Math.round((filled.length / propShifts.length) * 100) : 100,
      };
    });

    const propertyFinancials = properties.map((p) => {
      const revenue = rentInvoices
        .filter((i) => i.propertyId === p._id)
        .reduce((sum, i) => sum + (i.paidCents || 0), 0) / 100;
      const expenses = bookkeepingEntries
        .filter((e) => e.propertyId === p._id && e.type === "expense")
        .reduce((sum, e) => sum + e.amountCents, 0) / 100;
      return {
        propertyId: p._id,
        propertyName: p.name,
        revenue: Math.round(revenue * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        noi: Math.round((revenue - expenses) * 100) / 100,
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
      const dayEntries = timeEntries.filter((e) => e.clockIn >= dayStart && e.clockIn < dayEnd);
      const dayHours = dayEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
      weekTrend.push({
        date: dayStr,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        hours: Math.round(dayHours * 10) / 10,
        shifts: shifts.filter((s) => s.date === dayStr).length,
      });
    }

    return {
      overview: {
        totalProperties: properties.length,
        activeProperties: activeProperties.length,
        totalStaff: staff.length,
        activeStaff: activeStaff.length,
        totalUnits: properties.reduce((sum, p) => sum + p.units, 0),
      },
      performance: {
        utilizationRate,
        totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
        costPerBuilding,
        totalPayrollThisMonth: Math.round(totalPayroll * 100) / 100,
        shiftsThisMonth: monthShifts.length,
        openShifts: monthShifts.filter((s) => s.status === "open").length,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
        expensesThisMonth: Math.round(expensesThisMonth * 100) / 100,
        noiThisMonth: Math.round(noiThisMonth * 100) / 100,
      },
      trendComparison: {
        revenue: {
          current: Math.round(revenueThisMonth * 100) / 100,
          previous: Math.round(revenuePrevMonth * 100) / 100,
          delta: Math.round((revenueThisMonth - revenuePrevMonth) * 100) / 100,
        },
        expenses: {
          current: Math.round(expensesThisMonth * 100) / 100,
          previous: Math.round(expensesPrevMonth * 100) / 100,
          delta: Math.round((expensesThisMonth - expensesPrevMonth) * 100) / 100,
        },
        noi: {
          current: Math.round(noiThisMonth * 100) / 100,
          previous: Math.round(noiPrevMonth * 100) / 100,
          delta: Math.round((noiThisMonth - noiPrevMonth) * 100) / 100,
        },
      },
      propertyStats,
      propertyFinancials,
      roleDistribution,
      weekTrend,
    };
  },
});

export const getPropertyFinancials = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const properties = await ctx.db
      .query("properties")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const bookkeepingEntries = await ctx.db
      .query("bookkeepingEntries")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const rentInvoices = await ctx.db
      .query("rentInvoices")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return properties.map((p) => {
      const revenue = rentInvoices
        .filter((i) => i.propertyId === p._id)
        .reduce((sum, i) => sum + (i.paidCents || 0), 0) / 100;
      const expenses = bookkeepingEntries
        .filter((e) => e.propertyId === p._id && e.type === "expense")
        .reduce((sum, e) => sum + e.amountCents, 0) / 100;
      return {
        propertyId: p._id,
        propertyName: p.name,
        revenue: Math.round(revenue * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        noi: Math.round((revenue - expenses) * 100) / 100,
      };
    });
  },
});
