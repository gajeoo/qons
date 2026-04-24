import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Create an invitation (managers/admins can invite workers and managers)
 */
export const create = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("worker"), v.literal("tenant"), v.literal("maintenance")),
  },
  returns: v.object({
    success: v.boolean(),
    token: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { email, role }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    // Check caller's role — only admin, customer (subscriber), or manager can invite
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (!profile) return { success: false, error: "Profile not found" };
    if (profile.role === "worker")
      return { success: false, error: "Workers cannot send invitations" };

    // Managers can only invite workers
    if (profile.role === "manager" && role !== "worker") {
      return { success: false, error: "Managers can only invite workers" };
    }

    // Check for existing pending invitation
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email", q => q.eq("email", email.toLowerCase()))
      .filter(q => q.eq(q.field("status"), "pending"))
      .first();

    if (existing) {
      return {
        success: false,
        error: "An invitation is already pending for this email",
      };
    }

    // Generate unique token
    const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = Date.now();

    await ctx.db.insert("invitations", {
      invitedByUserId: userId,
      email: email.toLowerCase(),
      role,
      token,
      status: "pending",
      expiresAt: now + INVITE_EXPIRY_MS,
    });

    return { success: true, token };
  },
});

/**
 * List invitations sent by current user
 */
export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      _creationTime: v.number(),
      email: v.string(),
      role: v.union(v.literal("manager"), v.literal("worker"), v.literal("tenant"), v.literal("maintenance")),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("expired"),
        v.literal("revoked"),
      ),
      expiresAt: v.number(),
      acceptedAt: v.optional(v.number()),
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invites = await ctx.db
      .query("invitations")
      .withIndex("by_invitedByUserId", q => q.eq("invitedByUserId", userId))
      .order("desc")
      .take(500);

    return invites.map(inv => ({
      _id: inv._id,
      _creationTime: inv._creationTime,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
    }));
  },
});

/**
 * List all invitations (admin only)
 */
export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      _creationTime: v.number(),
      email: v.string(),
      role: v.union(v.literal("manager"), v.literal("worker"), v.literal("tenant"), v.literal("maintenance")),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("expired"),
        v.literal("revoked"),
      ),
      expiresAt: v.number(),
      invitedByName: v.optional(v.string()),
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") return [];

    const invites = await ctx.db.query("invitations").order("desc").take(500);

    return await Promise.all(
      invites.map(async inv => {
        const inviter = await ctx.db.get(inv.invitedByUserId);
        return {
          _id: inv._id,
          _creationTime: inv._creationTime,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt,
          invitedByName: inviter?.name ?? undefined,
        };
      }),
    );
  },
});

/**
 * Revoke an invitation
 */
export const revoke = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, { invitationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db.get(invitationId);
    if (!invite) throw new Error("Invitation not found");

    // Only the inviter or admin can revoke
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (invite.invitedByUserId !== userId && profile?.role !== "admin") {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(invitationId, { status: "revoked" });
    return null;
  },
});

/**
 * Get invitation by token (for signup page)
 */
export const getByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("invitations"),
      email: v.string(),
      role: v.union(v.literal("manager"), v.literal("worker"), v.literal("tenant"), v.literal("maintenance")),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("expired"),
        v.literal("revoked"),
      ),
      expiresAt: v.number(),
      inviterName: v.optional(v.string()),
      isValid: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("invitations")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();

    if (!invite) return null;

    const inviter = await ctx.db.get(invite.invitedByUserId);
    const now = Date.now();
    const isValid = invite.status === "pending" && invite.expiresAt > now;

    return {
      _id: invite._id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      inviterName: inviter?.name ?? undefined,
      isValid,
    };
  },
});

/**
 * Accept invitation (called after signup with invite token)
 */
export const acceptInvitation = mutation({
  args: { token: v.string() },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const invite = await ctx.db
      .query("invitations")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();

    if (!invite) return { success: false, error: "Invalid invitation" };
    if (invite.status !== "pending")
      return { success: false, error: "Invitation already used" };
    if (invite.expiresAt < Date.now())
      return { success: false, error: "Invitation expired" };

    const now = Date.now();

    // Update invitation
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedByUserId: userId,
      acceptedAt: now,
    });

    // Create/update profile with role and org link
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        role: invite.role,
        invitedBy: invite.invitedByUserId,
        organizationUserId: invite.invitedByUserId,
      });
    } else {
      const user = await ctx.db.get(userId);
      await ctx.db.insert("userProfiles", {
        userId,
        email: user?.email || invite.email,
        role: invite.role,
        invitedBy: invite.invitedByUserId,
        organizationUserId: invite.invitedByUserId,
        isActive: true,
      });
    }

    return { success: true };
  },
});

/**
 * Get team members for current user (workers/managers they invited)
 */
export const getMyTeam = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("userProfiles"),
      userId: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
      role: v.union(
        v.literal("admin"),
        v.literal("customer"),
        v.literal("manager"),
        v.literal("worker"),
        v.literal("tenant"),
        v.literal("maintenance"),
      ),
      isActive: v.boolean(),
      joinedAt: v.number(),
      allowedFeatures: v.optional(v.array(v.string())),
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const teamMembers = await ctx.db
      .query("userProfiles")
      .withIndex("by_organizationUserId", q =>
        q.eq("organizationUserId", userId),
      )
      .take(500);

    return await Promise.all(
      teamMembers.map(async member => {
        const user = await ctx.db.get(member.userId);
        return {
          _id: member._id,
          userId: member.userId,
          email: member.email,
          name: user?.name ?? undefined,
          role: member.role,
          isActive: member.isActive !== false,
          joinedAt: member._creationTime,
          allowedFeatures: member.allowedFeatures ?? undefined,
        };
      }),
    );
  },
});

/**
 * Update which features a team member can access.
 * Only the org owner (or admin) can do this.
 * Pass empty array or null to grant full plan access (no restrictions).
 */
export const updateTeamMemberFeatures = mutation({
  args: {
    memberProfileId: v.id("userProfiles"),
    allowedFeatures: v.union(v.array(v.string()), v.null()),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, { memberProfileId, allowedFeatures }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!callerProfile) return { success: false, error: "Profile not found" };

    const member = await ctx.db.get(memberProfileId);
    if (!member) return { success: false, error: "Member not found" };

    // Only the org owner or admin can update member features
    if (
      member.organizationUserId !== userId &&
      callerProfile.role !== "admin"
    ) {
      return { success: false, error: "Not authorized" };
    }

    await ctx.db.patch(memberProfileId, {
      allowedFeatures:
        allowedFeatures && allowedFeatures.length > 0
          ? allowedFeatures
          : undefined,
    });

    return { success: true };
  },
});

/**
 * Toggle a team member's active status.
 * Only the org owner (or admin) can do this.
 */
export const toggleTeamMemberActive = mutation({
  args: {
    memberProfileId: v.id("userProfiles"),
    isActive: v.boolean(),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, { memberProfileId, isActive }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!callerProfile) return { success: false, error: "Profile not found" };

    const member = await ctx.db.get(memberProfileId);
    if (!member) return { success: false, error: "Member not found" };

    if (
      member.organizationUserId !== userId &&
      callerProfile.role !== "admin"
    ) {
      return { success: false, error: "Not authorized" };
    }

    await ctx.db.patch(memberProfileId, { isActive });
    return { success: true };
  },
});

/**
 * Update a team member's role.
 * Only the org owner (or admin) can do this.
 */
export const updateTeamMemberRole = mutation({
  args: {
    memberProfileId: v.id("userProfiles"),
    role: v.union(v.literal("manager"), v.literal("worker"), v.literal("tenant"), v.literal("maintenance")),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, { memberProfileId, role }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!callerProfile) return { success: false, error: "Profile not found" };

    const member = await ctx.db.get(memberProfileId);
    if (!member) return { success: false, error: "Member not found" };

    if (
      member.organizationUserId !== userId &&
      callerProfile.role !== "admin"
    ) {
      return { success: false, error: "Not authorized" };
    }

    await ctx.db.patch(memberProfileId, { role });
    return { success: true };
  },
});
