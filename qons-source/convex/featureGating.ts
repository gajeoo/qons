import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Three-tier plan structure: Starter ($45.99), Professional ($95.99), Business ($140.99)
 * 
 * - Free trial gives FULL access (all features) for 14 days
 * - After trial expires with no paid plan → primary account paused
 * - Pausing primary cascades to ALL sub-accounts
 * - Sub-accounts never see billing/plan selection — their access is tied to primary
 * - Admin always has full access to everything
 */

// Starter tier features ($45.99/mo — up to 50 units)
const STARTER_FEATURES = [
  "dashboard",
  "properties",
  "staff",
  "residents",
  "tasks",
  "amenities",
  "hoa_basic",
  "basic_analytics",
  "map",
  "notifications",
  "settings",
  "team_management",
  "referrals",
  "billing_management",
  "subscription_control",
  "team_invitations",
  "member_permissions",
  "organization_settings",
];

// Professional tier features ($95.99/mo — up to 200 units)
const PROFESSIONAL_FEATURES = [
  ...STARTER_FEATURES,
  "schedule",
  "time_tracking",
  "payroll_csv",
  "payroll_integrations",
  "automations",
  "ai_assistant",
  "executive_analytics",
  "hoa",
  "rent_collection",
  "accounting",
  "leases",
  "maintenance",
  "documents",
  "advanced_exports",
];

// Business tier features ($140.99/mo — unlimited units)
const BUSINESS_FEATURES = [
  ...PROFESSIONAL_FEATURES,
  "tenant_screening",
  "api_access",
  "custom_reports",
  "white_label",
  "priority_support",
];

// Trial gets ALL features (equivalent to Business)
const TRIAL_FEATURES = [...BUSINESS_FEATURES];

// Admin gets everything plus admin panel
const ADMIN_FEATURES = [...BUSINESS_FEATURES, "admin_panel"];

const PLAN_FEATURES: Record<string, string[]> = {
  starter: STARTER_FEATURES,
  pro: PROFESSIONAL_FEATURES,
  enterprise: BUSINESS_FEATURES,
  trial: TRIAL_FEATURES,
  admin: ADMIN_FEATURES,
};

const PLAN_PROPERTY_LIMITS: Record<string, number> = {
  starter: 50,
  pro: 200,
  enterprise: 999999,
  trial: 999999,
  admin: 999999,
};

function defaultSubAccountFeatures(role: string, planFeatures: string[]): string[] {
  // Sub-accounts inherit the plan's features minus billing/subscription controls
  const billingFeatures = [
    "billing_management",
    "subscription_control",
    "organization_settings",
  ];

  if (role === "worker") {
    // Workers get a limited subset
    return ["dashboard", "schedule", "time_tracking", "tasks", "maintenance", "notifications", "settings"].filter(
      f => planFeatures.includes(f)
    );
  }

  if (role === "tenant") {
    // Tenants can: view dashboard, pay rent, submit maintenance, view leases/docs, notifications, settings
    return ["dashboard", "rent_collection", "maintenance", "leases", "documents", "notifications", "settings", "renter_applications"].filter(
      f => planFeatures.includes(f) || f === "renter_applications"
    );
  }

  if (role === "maintenance") {
    // Maintenance staff can: view dashboard, maintenance requests, tasks, schedule, time tracking, docs, notifications
    return ["dashboard", "maintenance", "tasks", "schedule", "time_tracking", "documents", "notifications", "settings"].filter(
      f => planFeatures.includes(f)
    );
  }

  // Managers get most features minus billing controls
  return planFeatures.filter(f => !billingFeatures.includes(f));
}

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
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile) return null;

    // Admin always has full access
    if (profile.role === "admin") {
      return {
        plan: "admin",
        features: ADMIN_FEATURES,
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
      (profile.role === "worker" || profile.role === "manager" || profile.role === "tenant" || profile.role === "maintenance") &&
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
      if (
        !isSubAccount ||
        !profile.allowedFeatures ||
        profile.allowedFeatures.length === 0
      ) {
        return planFeatures;
      }
      return planFeatures.filter(f => profile.allowedFeatures!.includes(f));
    };

    // Check if primary account is paused (for sub-accounts)
    if (isSubAccount) {
      const primaryProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", q => q.eq("userId", effectiveUserId))
        .unique();
      
      if (primaryProfile) {
        // Check if primary's trial has expired AND no active subscription
        const primarySub = await ctx.db
          .query("subscriptions")
          .withIndex("by_userId", q => q.eq("userId", effectiveUserId))
          .order("desc")
          .first();
        
        const now = Date.now();
        const primaryTrialEnd = primaryProfile.trialEndDate || 0;
        const primaryHasPaidAccess =
          !!primarySub &&
          (primarySub.status === "active" || primarySub.status === "trialing") &&
          !(primarySub.cancelAtPeriodEnd && primarySub.currentPeriodEnd <= now);
        const primaryOnTrial = primaryTrialEnd > now;

        // If primary has no access, sub-account is also paused
        if (!primaryHasPaidAccess && !primaryOnTrial) {
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
      }
    }

    // Check subscription
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", q => q.eq("userId", effectiveUserId))
      .order("desc")
      .first();

    const now = Date.now();
    const hasPaidAccess =
      !!sub &&
      (sub.status === "active" || sub.status === "trialing") &&
      !(sub.cancelAtPeriodEnd && sub.currentPeriodEnd <= now);

    if (hasPaidAccess) {
      const planKey = sub!.plan;
      const planFeatures = PLAN_FEATURES[planKey] || STARTER_FEATURES;
      const propertyLimit = PLAN_PROPERTY_LIMITS[planKey] || 50;
      
      const features = isSubAccount
        ? applyMemberRestrictions(defaultSubAccountFeatures(profile.role, planFeatures))
        : planFeatures;
      return {
        plan: planKey,
        features,
        propertyLimit,
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
        .withIndex("by_userId", q => q.eq("userId", effectiveUserId))
        .unique();
      if (orgProfile) trialProfile = orgProfile;
    }

    const trialEnd = trialProfile.trialEndDate || 0;
    if (trialEnd > now) {
      const daysRemaining = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
      // Trial gets ALL features (Business tier equivalent)
      const trialFeatures = TRIAL_FEATURES;
      const features = isSubAccount
        ? applyMemberRestrictions(defaultSubAccountFeatures(profile.role, trialFeatures))
        : trialFeatures;
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

    // No access — trial expired and no subscription
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
 * Route-to-feature mapping — maps routes to required features for access control
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
  "/settings": "settings",
  "/tasks": "tasks",
  "/residents": "residents",
  "/map": "map",
  "/pricing": "billing_management",
  "/team": "team_management",
  "/rent": "rent_collection",
  "/accounting": "accounting",
  "/leases": "leases",
  "/maintenance": "maintenance",
  "/documents": "documents",
  "/tenant-screening": "tenant_screening",
  "/notifications": "notifications",
  "/automations": "automations",
  "/referrals": "referrals",
};
