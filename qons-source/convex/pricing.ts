/**
 * Pricing & Discount Management — admin can change plan prices and manage discount codes.
 * Changes propagate to the pricing page, landing page, and checkout flow.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/* ------------------------------------------------------------------ */
/*  Helper: verify admin                                               */
/* ------------------------------------------------------------------ */
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
  if (profile?.role !== "admin") throw new Error("Admin only");
  return userId;
}

/* ------------------------------------------------------------------ */
/*  Default pricing (used as fallback when no admin overrides exist)    */
/* ------------------------------------------------------------------ */
const DEFAULT_PLANS = [
  {
    plan: "starter" as const,
    name: "Starter",
    monthlyPrice: 4599,
    annualPrice: 45999,
    unitLimit: "Up to 50 units",
    subAccountLimit: "Up to 3 sub-accounts",
    description: "Perfect for small landlords and single-building managers",
  },
  {
    plan: "pro" as const,
    name: "Professional",
    monthlyPrice: 9599,
    annualPrice: 95999,
    unitLimit: "Up to 200 units",
    subAccountLimit: "Up to 10 sub-accounts",
    description: "For growing portfolios that need automation and AI",
  },
  {
    plan: "enterprise" as const,
    name: "Business",
    monthlyPrice: 14099,
    annualPrice: 140999,
    unitLimit: "Unlimited units",
    subAccountLimit: "Unlimited sub-accounts",
    description: "For large operations with advanced needs",
  },
];

/* ------------------------------------------------------------------ */
/*  Pricing Queries                                                    */
/* ------------------------------------------------------------------ */

/** Public — get active plan pricing (reads admin overrides, falls back to defaults) */
export const getPlans = query({
  args: {},
  handler: async (ctx) => {
    const overrides = await ctx.db.query("pricingConfig").collect();
    const overrideMap = new Map(overrides.map((o) => [o.plan, o]));

    return DEFAULT_PLANS.map((def) => {
      const override = overrideMap.get(def.plan);
      if (override && override.isActive) {
        return {
          plan: override.plan,
          name: override.name,
          monthlyPrice: override.monthlyPrice,
          annualPrice: override.annualPrice ?? Math.round(override.monthlyPrice * 10),
          unitLimit: override.unitLimit ?? def.unitLimit,
          subAccountLimit: override.subAccountLimit ?? def.subAccountLimit,
          description: override.description ?? def.description,
        };
      }
      return def;
    });
  },
});

/** Admin — update plan pricing */
export const updatePlan = mutation({
  args: {
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    name: v.optional(v.string()),
    monthlyPrice: v.number(),
    annualPrice: v.optional(v.number()),
    unitLimit: v.optional(v.string()),
    subAccountLimit: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("pricingConfig")
      .withIndex("by_plan", (q) => q.eq("plan", args.plan))
      .first();

    const data = {
      plan: args.plan,
      name: args.name ?? DEFAULT_PLANS.find((p) => p.plan === args.plan)?.name ?? args.plan,
      monthlyPrice: args.monthlyPrice,
      annualPrice: args.annualPrice,
      unitLimit: args.unitLimit,
      subAccountLimit: args.subAccountLimit,
      description: args.description,
      isActive: true,
      updatedAt: Date.now(),
      updatedBy: userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("pricingConfig", data);
  },
});

/** Admin — reset plan to defaults */
export const resetPlan = mutation({
  args: {
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("pricingConfig")
      .withIndex("by_plan", (q) => q.eq("plan", args.plan))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/* ------------------------------------------------------------------ */
/*  Discount Code Queries                                              */
/* ------------------------------------------------------------------ */

/** Public — validate a discount code */
export const validateDiscount = query({
  args: { code: v.string(), plan: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const discount = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!discount || !discount.isActive) {
      return { valid: false, error: "Invalid discount code" };
    }

    const now = Date.now();
    if (discount.validFrom && now < discount.validFrom) {
      return { valid: false, error: "Discount not yet active" };
    }
    if (discount.validUntil && now > discount.validUntil) {
      return { valid: false, error: "Discount has expired" };
    }
    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      return { valid: false, error: "Discount has been fully redeemed" };
    }
    if (
      args.plan &&
      discount.applicablePlans &&
      discount.applicablePlans.length > 0 &&
      !discount.applicablePlans.includes(args.plan)
    ) {
      return { valid: false, error: "Discount not applicable to this plan" };
    }

    return {
      valid: true,
      type: discount.type,
      value: discount.value,
      description: discount.description,
    };
  },
});

/** Admin — list all discount codes */
export const listDiscounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("discountCodes").order("desc").collect();
  },
});

/** Admin — create discount code */
export const createDiscount = mutation({
  args: {
    code: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(),
    applicablePlans: v.optional(v.array(v.string())),
    maxUses: v.optional(v.number()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);

    // Check for duplicate code
    const existing = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();
    if (existing) throw new Error("Discount code already exists");

    return await ctx.db.insert("discountCodes", {
      code: args.code.toUpperCase(),
      description: args.description,
      type: args.type,
      value: args.value,
      applicablePlans: args.applicablePlans,
      maxUses: args.maxUses,
      currentUses: 0,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      isActive: true,
      createdAt: Date.now(),
      createdBy: userId,
    });
  },
});

/** Admin — toggle discount active/inactive */
export const toggleDiscount = mutation({
  args: { id: v.id("discountCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const discount = await ctx.db.get(args.id);
    if (!discount) throw new Error("Not found");
    await ctx.db.patch(args.id, { isActive: !discount.isActive });
  },
});

/** Admin — delete discount code */
export const deleteDiscount = mutation({
  args: { id: v.id("discountCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/** Increment discount usage (called after successful checkout) */
export const useDiscount = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const discount = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();
    if (discount) {
      await ctx.db.patch(discount._id, {
        currentUses: discount.currentUses + 1,
      });
    }
  },
});
