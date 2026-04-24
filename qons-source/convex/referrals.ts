import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Generate a simple referral code from user ID
 */
function generateCode(userId: string): string {
  // Use last 8 chars of ID + random suffix for uniqueness
  const base = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QONS-${base}-${suffix}`;
}

/**
 * Get or create the user's referral code
 */
export const getMyCode = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if user already has a referral code (look for an entry where they are the referrer with no referredEmail)
    const existing = await ctx.db
      .query("referrals")
      .withIndex("by_referrerUserId", (q) => q.eq("referrerUserId", userId))
      .take(100);

    // Return the first referral code found
    if (existing.length > 0) {
      return existing[0].referralCode;
    }

    // No code yet — will be generated on first submit
    return null;
  },
});

/**
 * Submit a referral (send invite to an email)
 */
export const submitReferral = mutation({
  args: { referredEmail: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for existing referral to this email by this user
    const existing = await ctx.db
      .query("referrals")
      .withIndex("by_referredEmail", (q) =>
        q.eq("referredEmail", args.referredEmail),
      )
      .take(100);

    const alreadyReferred = existing.find(
      (r) => r.referrerUserId === userId,
    );
    if (alreadyReferred) {
      throw new Error("You have already referred this email");
    }

    // Get or generate referral code
    const userReferrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerUserId", (q) => q.eq("referrerUserId", userId))
      .take(1);

    const referralCode =
      userReferrals.length > 0
        ? userReferrals[0].referralCode
        : generateCode(userId);

    return await ctx.db.insert("referrals", {
      referrerUserId: userId,
      referralCode,
      referredEmail: args.referredEmail,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * List all referrals for the current user
 */
export const listMyReferrals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("referrals")
      .withIndex("by_referrerUserId", (q) => q.eq("referrerUserId", userId))
      .take(500);
  },
});

/**
 * Get referral statistics for the current user
 */
export const getReferralStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, pending: 0, signedUp: 0, converted: 0, rewarded: 0, totalRewards: 0 };

    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerUserId", (q) => q.eq("referrerUserId", userId))
      .take(500);

    const totalRewards = referrals
      .filter((r) => r.status === "rewarded" && r.rewardAmount)
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    return {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === "pending").length,
      signedUp: referrals.filter((r) => r.status === "signed_up").length,
      converted: referrals.filter((r) => r.status === "converted").length,
      rewarded: referrals.filter((r) => r.status === "rewarded").length,
      totalRewards,
    };
  },
});
