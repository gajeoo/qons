import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const transactionCategoryValidator = v.union(
  v.literal("rent_income"),
  v.literal("late_fee_income"),
  v.literal("deposit_income"),
  v.literal("other_income"),
  v.literal("maintenance_expense"),
  v.literal("insurance_expense"),
  v.literal("tax_expense"),
  v.literal("utility_expense"),
  v.literal("management_fee"),
  v.literal("repair_expense"),
  v.literal("legal_expense"),
  v.literal("other_expense"),
);

const transactionTypeValidator = v.union(v.literal("income"), v.literal("expense"));

/**
 * List accounting transactions with filters
 */
export const listTransactions = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 500;

    let transactions = await ctx.db
      .query("accountingTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(take);

    if (args.propertyId) {
      transactions = transactions.filter((t) => t.propertyId === args.propertyId);
    }
    if (args.type) {
      transactions = transactions.filter((t) => t.type === args.type);
    }
    if (args.startDate) {
      transactions = transactions.filter((t) => t.date >= args.startDate!);
    }
    if (args.endDate) {
      transactions = transactions.filter((t) => t.date <= args.endDate!);
    }

    return transactions.sort((a, b) => (b.date > a.date ? 1 : -1));
  },
});

/**
 * Create a new accounting transaction
 */
export const createTransaction = mutation({
  args: {
    propertyId: v.optional(v.id("properties")),
    category: transactionCategoryValidator,
    type: transactionTypeValidator,
    amount: v.number(),
    description: v.string(),
    date: v.string(),
    vendor: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    attachmentUrl: v.optional(v.string()),
    rentPaymentId: v.optional(v.id("rentPayments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("accountingTransactions", {
      ...args,
      userId,
      reconciled: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update an accounting transaction
 */
export const updateTransaction = mutation({
  args: {
    id: v.id("accountingTransactions"),
    category: v.optional(transactionCategoryValidator),
    type: v.optional(transactionTypeValidator),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    vendor: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    attachmentUrl: v.optional(v.string()),
    reconciled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const txn = await ctx.db.get(args.id);
    if (!txn || txn.userId !== userId) throw new Error("Not found");

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
  },
});

/**
 * Delete an accounting transaction
 */
export const deleteTransaction = mutation({
  args: { id: v.id("accountingTransactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const txn = await ctx.db.get(args.id);
    if (!txn || txn.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(args.id);
  },
});

/**
 * Get P&L for a specific property over a date range
 */
export const getPropertyPnL = query({
  args: {
    propertyId: v.id("properties"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        incomeByCategory: {},
        expenseByCategory: {},
      };

    const transactions = await ctx.db
      .query("accountingTransactions")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .take(5000);

    const filtered = transactions.filter(
      (t) =>
        t.userId === userId && t.date >= args.startDate && t.date <= args.endDate,
    );

    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of filtered) {
      if (t.type === "income") {
        totalIncome += t.amount;
        incomeByCategory[t.category] =
          (incomeByCategory[t.category] || 0) + t.amount;
      } else {
        totalExpenses += t.amount;
        expenseByCategory[t.category] =
          (expenseByCategory[t.category] || 0) + t.amount;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      incomeByCategory,
      expenseByCategory,
    };
  },
});

/**
 * Get portfolio-level summary of income/expenses
 */
export const getPortfolioSummary = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 };

    let transactions = await ctx.db
      .query("accountingTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(5000);

    if (args.startDate) {
      transactions = transactions.filter((t) => t.date >= args.startDate!);
    }
    if (args.endDate) {
      transactions = transactions.filter((t) => t.date <= args.endDate!);
    }

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      if (t.type === "income") {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      transactionCount: transactions.length,
    };
  },
});

/**
 * Generate an owner statement for a property/month
 */
export const generateOwnerStatement = mutation({
  args: {
    propertyId: v.id("properties"),
    month: v.string(), // "01"-"12"
    year: v.number(),
    managementFee: v.optional(v.number()),
    ownerDraw: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Calculate date range for the month
    const monthNum = parseInt(args.month, 10);
    const startDate = `${args.year}-${args.month.padStart(2, "0")}-01`;
    const lastDay = new Date(args.year, monthNum, 0).getDate();
    const endDate = `${args.year}-${args.month.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const transactions = await ctx.db
      .query("accountingTransactions")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .take(5000);

    const filtered = transactions.filter(
      (t) =>
        t.userId === userId && t.date >= startDate && t.date <= endDate,
    );

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of filtered) {
      if (t.type === "income") {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    }

    return await ctx.db.insert("ownerStatements", {
      userId,
      propertyId: args.propertyId,
      month: args.month,
      year: args.year,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      managementFee: args.managementFee,
      ownerDraw: args.ownerDraw,
      notes: args.notes,
      generatedAt: Date.now(),
    });
  },
});
