import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Single-tier plan: $49.99/mo with ALL features
 */
const ALL_FEATURES = [
  "properties", "staff", "schedule", "time_tracking",
  "payroll_csv", "payroll_integrations", "basic_analytics",
  "executive_analytics", "amenities", "hoa", "dashboard",
  "custom_reports", "api_access", "team_management",
  "residents", "shift_swaps", "reserve_fund", "tasks", "map",
];

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ALL_FEATURES,
  pro: ALL_FEATURES,
  enterprise: ALL_FEATURES,
  trial: ALL_FEATURES,
  admin: [...ALL_FEATURES, "admin_panel"],
};

/**
 * Get the effective plan for the current user
 */
export const getEffectivePlan = query({
  args: {},
  returns: v.union(
    v.object({
      plan: v.string(),
      features: v.array(v.string()),
      propertyLimit: v.number(),
      isOnTrial: v.boolean(),
      trialDaysRemaining: v.number(),
      hasAccess: v.boolean(),
      role: v.string(),
      isSubAccount: v.optional(v.boolean()),
      isPaidSubscriber: v.optional(v.boolean()),
      hasUsedTrial: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;

    // Admin always has full access
    if (profile.role === "admin") {
      return {
        plan: "admin",
        features: PLAN_FEATURES.admin,
        propertyLimit: 999999,
        isOnTrial: false,
        trialDaysRemaining: 0,
        hasAccess: true,
        role: "admin",
        isSubAccount: false,
        isPaidSubscriber: true,
        hasUsedTrial: profile.hasUsedTrial || false,
      };
    }

    // Sub-account check
    const isSubAccount =
      (profile.role === "worker" || profile.role === "manager") &&
      !!profile.organizationUserId;

    // Deactivated sub-accounts have no access
    if (isSubAccount && profile.isActive === false) {
      return {
        plan: "none",
        features: ["dashboard"],
        propertyLimit: 0,
        isOnTrial: false,
        trialDaysRemaining: 0,
        hasAccess: false,
        role: profile.role,
        isSubAccount: true,
        isPaidSubscriber: false,
        hasUsedTrial: profile.hasUsedTrial || false,
      };
    }

    // Workers/managers inherit from org owner
    let effectiveUserId = userId;
    if (isSubAccount) {
      effectiveUserId = profile.organizationUserId!;
    }

    // Apply per-member restrictions if set by manager
    const applyMemberRestrictions = (planFeatures: string[]): string[] => {
      if (!isSubAccount || !profile.allowedFeatures || profile.allowedFeatures.length === 0) {
        return planFeatures;
      }
      return planFeatures.filter((f) => profile.allowedFeatures!.includes(f));
    };

    // Check subscription
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .first();

    const now = Date.now();
    const hasPaidAccess =
      !!sub &&
      (sub.status === "active" || sub.status === "trialing") &&
      !(sub.cancelAtPeriodEnd && sub.currentPeriodEnd <= now);

    if (hasPaidAccess) {
      const features = applyMemberRestrictions(ALL_FEATURES);
      return {
        plan: "premium",
        features,
        propertyLimit: 999999,
        isOnTrial: false,
        trialDaysRemaining: 0,
        hasAccess: true,
        role: profile.role,
        isSubAccount,
        isPaidSubscriber: true,
        hasUsedTrial: profile.hasUsedTrial || false,
      };
    }

    // Check trial
    let trialProfile = profile;
    if (effectiveUserId !== userId) {
      const orgProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
        .unique();
      if (orgProfile) trialProfile = orgProfile;
    }

    const trialEnd = trialProfile.trialEndDate || 0;
    if (trialEnd > now) {
      const daysRemaining = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
      const features = applyMemberRestrictions(ALL_FEATURES);
      return {
        plan: "trial",
        features,
        propertyLimit: 999999,
        isOnTrial: true,
        trialDaysRemaining: daysRemaining,
        hasAccess: true,
        role: profile.role,
        isSubAccount,
        isPaidSubscriber: false,
        hasUsedTrial: profile.hasUsedTrial || false,
      };
    }

    // No access
    return {
      plan: "none",
      features: ["dashboard"],
      propertyLimit: 0,
      isOnTrial: false,
      trialDaysRemaining: 0,
      hasAccess: false,
      role: profile.role,
      isSubAccount,
      isPaidSubscriber: false,
        hasUsedTrial: profile.hasUsedTrial || false,
    };
  },
});

/**
 * Route-to-feature mapping
 */
export const ROUTE_FEATURE_MAP: Record<string, string> = {
  "/properties": "properties",
  "/staff": "staff",
  "/schedule": "schedule",
  "/time-tracking": "time_tracking",
  "/payroll": "payroll_csv",
  "/analytics": "basic_analytics",
  "/amenities": "amenities",
  "/hoa": "hoa",
  "/dashboard": "dashboard",
  "/settings": "dashboard",
  "/tasks": "tasks",
  "/residents": "residents",
};
