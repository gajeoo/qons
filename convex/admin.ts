import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

const ADMIN_EMAIL = "gajeo21@gmail.com";
const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// ============================================================
// AUTH & PROFILE HELPERS
// ============================================================

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!profile || profile.role !== "admin") throw new Error("Admin access required");
  return { userId, profile };
}

/**
 * Check if current user is admin
 */
export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return profile?.role === "admin";
  },
});

/**
 * Get current user's profile
 */
export const getMyProfile = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("userProfiles"),
      _creationTime: v.number(),
      userId: v.id("users"),
      email: v.string(),
      role: v.union(v.literal("admin"), v.literal("customer"), v.literal("manager"), v.literal("worker")),
      trialStartDate: v.optional(v.number()),
      trialEndDate: v.optional(v.number()),
      invitedBy: v.optional(v.id("users")),
      organizationUserId: v.optional(v.id("users")),
      isActive: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

/**
 * Get trial status for current user
 */
export const getTrialStatus = query({
  args: {},
  returns: v.union(
    v.object({
      isOnTrial: v.boolean(),
      trialExpired: v.boolean(),
      daysRemaining: v.number(),
      trialEndDate: v.optional(v.number()),
      hasSubscription: v.boolean(),
      plan: v.optional(v.string()),
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
      return { isOnTrial: false, trialExpired: false, daysRemaining: 999, hasSubscription: true, plan: "enterprise" };
    }

    // Check subscription
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    const now = Date.now();
    const hasSub =
      !!sub &&
      (sub.status === "active" || sub.status === "trialing") &&
      !(sub.cancelAtPeriodEnd && sub.currentPeriodEnd <= now);

    // Workers/managers inherit from their organization
    if (profile.role === "worker" || profile.role === "manager") {
      if (profile.organizationUserId) {
        const orgSub = await ctx.db
          .query("subscriptions")
          .withIndex("by_userId", (q) => q.eq("userId", profile.organizationUserId!))
          .order("desc")
          .first();
        const orgHasSub =
          !!orgSub &&
          (orgSub.status === "active" || orgSub.status === "trialing") &&
          !(orgSub.cancelAtPeriodEnd && orgSub.currentPeriodEnd <= now);
        return { isOnTrial: false, trialExpired: !orgHasSub, daysRemaining: orgHasSub ? 999 : 0, hasSubscription: orgHasSub, plan: orgSub?.plan };
      }
    }

    if (hasSub) {
      return { isOnTrial: false, trialExpired: false, daysRemaining: 999, hasSubscription: true, plan: sub?.plan };
    }

    // Trial check
    const trialEnd = profile.trialEndDate || 0;
    if (trialEnd > 0) {
      const remaining = Math.max(0, Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000)));
      return { isOnTrial: remaining > 0, trialExpired: remaining <= 0, daysRemaining: remaining, trialEndDate: trialEnd, hasSubscription: false };
    }

    // No trial started yet (shouldn't happen for new users)
    return { isOnTrial: false, trialExpired: true, daysRemaining: 0, hasSubscription: false };
  },
});

/**
 * Ensure user profile exists + start trial for new users.
 * Invited users (workers/managers) do NOT get a trial — they're sub-accounts
 * tied to the inviter's organization and inherit that subscription.
 */
export const ensureProfile = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) return null;

    const user = await ctx.db.get(userId);
    if (!user?.email) return null;

    const isAdminEmail = user.email === ADMIN_EMAIL;

    // Check if this user has a pending or recently-accepted invitation
    const pendingInvite = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "accepted"),
        ),
      )
      .first();

    const now = Date.now();

    if (pendingInvite && !isAdminEmail) {
      // Invited user → sub-account, NO trial, linked to org
      await ctx.db.insert("userProfiles", {
        userId,
        email: user.email,
        role: pendingInvite.role,
        invitedBy: pendingInvite.invitedByUserId,
        organizationUserId: pendingInvite.invitedByUserId,
        isActive: true,
        // No trialStartDate or trialEndDate — they inherit from org
      });
    } else {
      // Independent user → gets a 14-day trial (one trial per account)
      await ctx.db.insert("userProfiles", {
        userId,
        email: user.email,
        role: isAdminEmail ? "admin" : "customer",
        trialStartDate: isAdminEmail ? undefined : now,
        trialEndDate: isAdminEmail ? undefined : now + TRIAL_DURATION_MS,
        isActive: true,
        hasUsedTrial: isAdminEmail ? undefined : true, // mark trial as used
      });
    }

    return null;
  },
});

// ============================================================
// ADMIN: USER MANAGEMENT
// ============================================================

/**
 * List all users with full details (admin only)
 */
export const listUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.string()),
      _creationTime: v.number(),
      hasSubscription: v.boolean(),
      plan: v.optional(v.string()),
      subscriptionStatus: v.optional(v.string()),
      isOnTrial: v.boolean(),
      trialDaysRemaining: v.number(),
      isActive: v.boolean(),
      teamSize: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") return [];

    const users = await ctx.db.query("users").order("desc").collect();
    const now = Date.now();

    const enriched = await Promise.all(
      users.map(async (user) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique();

        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .order("desc")
          .first();

        // Count team members (workers/managers under this user)
        const teamMembers = await ctx.db
          .query("userProfiles")
          .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", user._id))
          .collect();

        const trialEnd = userProfile?.trialEndDate || 0;
        const trialDays = trialEnd > 0 ? Math.max(0, Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000))) : 0;

        return {
          _id: user._id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          role: userProfile?.role ?? undefined,
          _creationTime: user._creationTime,
          hasSubscription: !!subscription && (subscription.status === "active" || subscription.status === "trialing"),
          plan: subscription?.plan ?? undefined,
          subscriptionStatus: subscription?.status ?? undefined,
          isOnTrial: trialDays > 0 && (!subscription || subscription.status !== "active"),
          trialDaysRemaining: trialDays,
          isActive: userProfile?.isActive !== false,
          teamSize: teamMembers.length,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Set user role (admin only)
 */
export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("customer"), v.literal("manager"), v.literal("worker")),
  },
  returns: v.null(),
  handler: async (ctx, { targetUserId, role }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { role });
    } else {
      const user = await ctx.db.get(targetUserId);
      if (user?.email) {
        const now = Date.now();
        await ctx.db.insert("userProfiles", {
          userId: targetUserId,
          email: user.email,
          role,
          trialStartDate: now,
          trialEndDate: now + TRIAL_DURATION_MS,
          isActive: true,
        });
      }
    }
    return null;
  },
});

/**
 * Toggle user active status (admin only)
 */
export const toggleUserActive = mutation({
  args: {
    targetUserId: v.id("users"),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { targetUserId, isActive }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { isActive });
    }
    return null;
  },
});

/**
 * Admin: assign subscription plan to user (without Stripe)
 */
export const adminAssignPlan = mutation({
  args: {
    targetUserId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
  },
  returns: v.null(),
  handler: async (ctx, { targetUserId, plan }) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const thirtyDaysLater = now + 30 * 24 * 60 * 60 * 1000;

    // Check for existing subscription
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: thirtyDaysLater,
        cancelAtPeriodEnd: false,
        assignedByAdmin: true,
        pausedAt: undefined,
        pausedByAdmin: undefined,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: targetUserId,
        stripeCustomerId: `admin_assigned_${targetUserId}`,
        stripeSubscriptionId: `admin_sub_${targetUserId}_${now}`,
        stripePriceId: `admin_price_${plan}`,
        plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: thirtyDaysLater,
        cancelAtPeriodEnd: false,
        assignedByAdmin: true,
      });
    }
    return null;
  },
});

/**
 * Admin: pause subscription
 */
export const adminPauseSubscription = mutation({
  args: { targetUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { targetUserId }) => {
    await requireAdmin(ctx);

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .order("desc")
      .first();

    if (sub && sub.status === "active") {
      await ctx.db.patch(sub._id, {
        status: "paused",
        pausedAt: Date.now(),
        pausedByAdmin: true,
      });
    }
    return null;
  },
});

/**
 * Admin: resume subscription
 */
export const adminResumeSubscription = mutation({
  args: { targetUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { targetUserId }) => {
    await requireAdmin(ctx);

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .order("desc")
      .first();

    if (sub && sub.status === "paused") {
      await ctx.db.patch(sub._id, {
        status: "active",
        pausedAt: undefined,
        pausedByAdmin: undefined,
      });
    }
    return null;
  },
});

/**
 * Admin: delete subscription
 */
export const adminDeleteSubscription = mutation({
  args: { targetUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { targetUserId }) => {
    await requireAdmin(ctx);

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .order("desc")
      .first();

    if (sub) {
      await ctx.db.delete(sub._id);
    }
    return null;
  },
});

/**
 * Admin: delete user and all their data
 */
export const adminDeleteUser = mutation({
  args: { targetUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { targetUserId }) => {
    await requireAdmin(ctx);

    // Delete profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);

    // Delete subscriptions
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const sub of subs) await ctx.db.delete(sub._id);

    // Delete onboarding
    const onboarding = await ctx.db
      .query("onboarding")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .unique();
    if (onboarding) await ctx.db.delete(onboarding._id);

    // Note: We don't delete the auth user record itself (Convex Auth manages that)
    return null;
  },
});

/**
 * Get overall admin dashboard stats
 */
export const getDashboardStats = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    newUsersThisWeek: v.number(),
    totalLeads: v.number(),
    newLeadsThisWeek: v.number(),
    activeSubscriptions: v.number(),
    mrr: v.number(),
    demoRequests: v.number(),
    activeTrials: v.number(),
    totalWorkers: v.number(),
    totalManagers: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return { totalUsers: 0, newUsersThisWeek: 0, totalLeads: 0, newLeadsThisWeek: 0, activeSubscriptions: 0, mrr: 0, demoRequests: 0, activeTrials: 0, totalWorkers: 0, totalManagers: 0 };

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin")
      return { totalUsers: 0, newUsersThisWeek: 0, totalLeads: 0, newLeadsThisWeek: 0, activeSubscriptions: 0, mrr: 0, demoRequests: 0, activeTrials: 0, totalWorkers: 0, totalManagers: 0 };

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const users = await ctx.db.query("users").collect();
    const leads = await ctx.db.query("leads").collect();
    const subs = await ctx.db.query("subscriptions").collect();
    const profiles = await ctx.db.query("userProfiles").collect();

    const activeSubs = subs.filter((s) => s.status === "active");
    const planPrices: Record<string, number> = { starter: 4900, pro: 14900, enterprise: 29900 };
    const mrr = activeSubs.reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);

    const activeTrials = profiles.filter((p) => p.trialEndDate && p.trialEndDate > now && p.role !== "admin").length;

    return {
      totalUsers: users.length,
      newUsersThisWeek: users.filter((u) => u._creationTime > weekAgo).length,
      totalLeads: leads.length,
      newLeadsThisWeek: leads.filter((l) => l._creationTime > weekAgo).length,
      activeSubscriptions: activeSubs.length,
      mrr,
      demoRequests: leads.filter((l) => l.inquiryType === "demo").length,
      activeTrials,
      totalWorkers: profiles.filter((p) => p.role === "worker").length,
      totalManagers: profiles.filter((p) => p.role === "manager").length,
    };
  },
});

// Internal helpers
export const setRole = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("customer"), v.literal("manager"), v.literal("worker")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, role }) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { role });
    } else {
      const user = await ctx.db.get(userId);
      if (user?.email) {
        await ctx.db.insert("userProfiles", {
          userId,
          email: user.email,
          role,
          isActive: true,
        });
      }
    }
    return null;
  },
});

// Internal query for other modules to check user profile
export const getProfileInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      role: v.string(),
      email: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;
    return {
      role: profile.role,
      email: profile.email,
    };
  },
});
