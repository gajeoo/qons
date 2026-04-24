import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List owner statements with optional filters
 */
export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 500;

    if (args.propertyId) {
      let statements = await ctx.db
        .query("ownerStatements")
        .withIndex("by_propertyId", (q) =>
          q.eq("propertyId", args.propertyId!),
        )
        .take(take);
      statements = statements.filter((s) => s.userId === userId);
      if (args.year) {
        statements = statements.filter((s) => s.year === args.year);
      }
      return statements.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month > a.month ? 1 : -1;
      });
    }

    let statements = await ctx.db
      .query("ownerStatements")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(take);

    if (args.year) {
      statements = statements.filter((s) => s.year === args.year);
    }

    return statements.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month > a.month ? 1 : -1;
    });
  },
});

/**
 * Generate an owner statement from accounting data
 */
export const generate = mutation({
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

    // Verify property ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== userId) throw new Error("Property not found");

    // Calculate date range for the month
    const monthNum = parseInt(args.month, 10);
    const startDate = `${args.year}-${args.month.padStart(2, "0")}-01`;
    const lastDay = new Date(args.year, monthNum, 0).getDate();
    const endDate = `${args.year}-${args.month.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Fetch all accounting transactions for this property in the date range
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

    // Check if a statement already exists for this property/month/year
    const existing = await ctx.db
      .query("ownerStatements")
      .withIndex("by_propertyId", (q) => q.eq("propertyId", args.propertyId))
      .take(500);

    const existingStatement = existing.find(
      (s) =>
        s.userId === userId &&
        s.month === args.month &&
        s.year === args.year,
    );

    if (existingStatement) {
      // Update existing statement
      await ctx.db.patch(existingStatement._id, {
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        managementFee: args.managementFee,
        ownerDraw: args.ownerDraw,
        notes: args.notes,
        generatedAt: Date.now(),
      });
      return existingStatement._id;
    }

    // Create new statement
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

/**
 * Get a single statement detail
 */
export const getStatement = query({
  args: { id: v.id("ownerStatements") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const statement = await ctx.db.get(args.id);
    if (!statement || statement.userId !== userId) return null;

    // Enrich with property info
    const property = await ctx.db.get(statement.propertyId);

    return {
      ...statement,
      propertyName: property?.name ?? "Unknown",
      propertyAddress: property?.address ?? "",
    };
  },
});
