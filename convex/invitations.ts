import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function inviteEmailCopy({
  inviterName,
  inviterEmail,
  role,
  signupUrl,
}: {
  inviterName?: string;
  inviterEmail: string;
  role: "manager" | "worker" | "tenant" | "maintenance";
  signupUrl: string;
}) {
  const roleLabel = {
    manager: "manager",
    worker: "team member",
    tenant: "tenant",
    maintenance: "maintenance team member",
  }[role];

  const senderLabel = inviterName?.trim() || inviterEmail;

  return {
    subject: `You're invited to join QonsApp as a ${roleLabel}`,
    body: [
      `Hello,`,
      "",
      `${senderLabel} invited you to join QonsApp as a ${roleLabel}.`,
      "",
      `Complete your signup here: ${signupUrl}`,
      "",
      "This invitation expires in 7 days.",
      "",
      `If you were not expecting this invitation, you can ignore this email or contact ${inviterEmail}.`,
    ].join("\n"),
    htmlBody: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px; color: #0f766e;">You're invited to join QonsApp</h2>
        <p style="margin: 0 0 16px;">${senderLabel} invited you to join QonsApp as a ${roleLabel}.</p>
        <p style="margin: 0 0 24px;">Use the button below to complete your signup. This invitation expires in 7 days.</p>
        <p style="margin: 0 0 24px;">
          <a href="${signupUrl}" style="display: inline-block; padding: 12px 18px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept invitation</a>
        </p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;">If the button does not work, open this link:</p>
        <p style="margin: 0 0 24px; font-size: 14px; word-break: break-all;"><a href="${signupUrl}">${signupUrl}</a></p>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">If you were not expecting this invitation, you can ignore this email or contact ${inviterEmail}.</p>
      </div>
    `,
  };
}

async function validateInviteRequest(
  ctx: MutationCtx,
  email: string,
  role: "manager" | "worker" | "tenant" | "maintenance",
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return { success: false as const, error: "Not authenticated" };
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", q => q.eq("userId", userId))
    .unique();

  if (!profile) return { success: false as const, error: "Profile not found" };
  if (profile.role === "worker") {
    return { success: false as const, error: "Workers cannot send invitations" };
  }

  if (
    profile.role === "manager" &&
    role !== "worker" &&
    role !== "maintenance" &&
    role !== "tenant"
  ) {
    return {
      success: false as const,
      error: "Managers can only invite workers, maintenance, or tenants",
    };
  }

  const existing = await ctx.db
    .query("invitations")
    .withIndex("by_email", q => q.eq("email", email.toLowerCase()))
    .filter(q => q.eq(q.field("status"), "pending"))
    .first();

  if (existing) {
    return {
      success: false as const,
      error: "An invitation is already pending for this email",
    };
  }

  return { success: true as const, userId, profile };
}

export const getPendingByEmailInternal = internalQuery({
  args: { email: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("invitations"),
      email: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("expired"),
        v.literal("revoked"),
      ),
    }),
  ),
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email", q => q.eq("email", email.toLowerCase()))
      .filter(q => q.eq(q.field("status"), "pending"))
      .first();

    if (!existing) {
      return null;
    }

    return {
      _id: existing._id,
      email: existing.email,
      status: existing.status,
    };
  },
});

export const createInternal = internalMutation({
  args: {
    invitedByUserId: v.id("users"),
    email: v.string(),
    role: v.union(
      v.literal("manager"),
      v.literal("worker"),
      v.literal("tenant"),
      v.literal("maintenance"),
    ),
  },
  returns: v.object({
    success: v.boolean(),
    token: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { invitedByUserId, email, role }) => {
    const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = Date.now();

    await ctx.db.insert("invitations", {
      invitedByUserId,
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
 * Create an invitation (managers/admins can invite workers and managers)
 */
export const create = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("manager"),
      v.literal("worker"),
      v.literal("tenant"),
      v.literal("maintenance"),
    ),
  },
  returns: v.object({
    success: v.boolean(),
    token: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { email, role }) => {
    const validation = await validateInviteRequest(ctx, email, role);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = Date.now();

    await ctx.db.insert("invitations", {
      invitedByUserId: validation.userId,
      email: email.toLowerCase(),
      role,
      token,
      status: "pending",
      expiresAt: now + INVITE_EXPIRY_MS,
    });

    return { success: true, token };
  },
});

export const createAndSend = action({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("manager"),
      v.literal("worker"),
      v.literal("tenant"),
      v.literal("maintenance"),
    ),
    origin: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    token: v.optional(v.string()),
    inviteUrl: v.optional(v.string()),
    emailSent: v.optional(v.boolean()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { email, role, origin }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const profile = await ctx.runQuery(internal.admin.getProfileInternal, {
      userId,
    });
    if (!profile) return { success: false, error: "Profile not found" };

    if (profile.role === "worker") {
      return { success: false, error: "Workers cannot send invitations" };
    }

    if (
      profile.role === "manager" &&
      role !== "worker" &&
      role !== "maintenance" &&
      role !== "tenant"
    ) {
      return {
        success: false,
        error: "Managers can only invite workers, maintenance, or tenants",
      };
    }

    const existing = await ctx.runQuery(
      internal.invitations.getPendingByEmailInternal,
      { email },
    );
    if (existing) {
      return {
        success: false,
        error: "An invitation is already pending for this email",
      };
    }

    const createResult = await ctx.runMutation(internal.invitations.createInternal, {
      invitedByUserId: userId,
      email,
      role,
    });

    if (!createResult.success || !createResult.token) {
      return createResult;
    }

    const inviteUrl = `${origin.replace(/\/$/, "")}/signup?invite=${createResult.token}`;
    const copy = inviteEmailCopy({
      inviterName: profile.name,
      inviterEmail: profile.email,
      role,
      signupUrl: inviteUrl,
    });

    const emailResult = await ctx.runAction(api.emailSms.sendEmail, {
      to: email.toLowerCase(),
      subject: copy.subject,
      body: copy.body,
      htmlBody: copy.htmlBody,
      fromName: profile.name || "QonsApp",
    });

    if (!emailResult.success) {
      return {
        success: false,
        token: createResult.token,
        inviteUrl,
        emailSent: false,
        error:
          emailResult.error ||
          "Invitation created but email delivery is not configured",
      };
    }

    return {
      success: true,
      token: createResult.token,
      inviteUrl,
      emailSent: true,
    };
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
      token: v.string(),
      role: v.union(
        v.literal("manager"),
        v.literal("worker"),
        v.literal("tenant"),
        v.literal("maintenance"),
      ),
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
      token: inv.token,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
    }));
  },
});

/**
 * List invitations across the caller's organization (for primary oversight).
 */
export const listOrganizationInvites = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      _creationTime: v.number(),
      email: v.string(),
      token: v.string(),
      role: v.union(
        v.literal("manager"),
        v.literal("worker"),
        v.literal("tenant"),
        v.literal("maintenance"),
      ),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("expired"),
        v.literal("revoked"),
      ),
      expiresAt: v.number(),
      acceptedAt: v.optional(v.number()),
      invitedByEmail: v.optional(v.string()),
    }),
  ),
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    const organizationUserId = callerProfile?.organizationUserId ?? userId;

    const orgMembers = await ctx.db
      .query("userProfiles")
      .withIndex("by_organizationUserId", q => q.eq("organizationUserId", organizationUserId))
      .take(500);

    const orgUserIds = new Set<string>([
      organizationUserId,
      ...orgMembers.map(member => String(member.userId)),
    ]);

    const invitations = await ctx.db.query("invitations").order("desc").take(1000);
    const orgInvites = invitations.filter(inv => orgUserIds.has(String(inv.invitedByUserId)));

    return await Promise.all(
      orgInvites.map(async inv => {
        const inviter = await ctx.db.get(inv.invitedByUserId);
        return {
          _id: inv._id,
          _creationTime: inv._creationTime,
          email: inv.email,
          token: inv.token,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt,
          acceptedAt: inv.acceptedAt,
          invitedByEmail: inviter?.email ?? undefined,
        };
      }),
    );
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
      role: v.union(
        v.literal("manager"),
        v.literal("worker"),
        v.literal("tenant"),
        v.literal("maintenance"),
      ),
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
      role: v.union(
        v.literal("manager"),
        v.literal("worker"),
        v.literal("tenant"),
        v.literal("maintenance"),
      ),
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

    // Create/update profile with role and organization root link
    const inviterProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", invite.invitedByUserId))
      .unique();

    const organizationUserId =
      inviterProfile?.organizationUserId ?? invite.invitedByUserId;

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        role: invite.role,
        invitedBy: invite.invitedByUserId,
        organizationUserId,
      });
    } else {
      const user = await ctx.db.get(userId);
      await ctx.db.insert("userProfiles", {
        userId,
        email: user?.email || invite.email,
        role: invite.role,
        invitedBy: invite.invitedByUserId,
        organizationUserId,
        isActive: true,
      });
    }

    // Best-effort linking for tenant/maintenance accounts using email match.
    const normalizedEmail = invite.email.toLowerCase();
    if (invite.role === "tenant") {
      const residents = await ctx.db
        .query("residents")
        .withIndex("by_userId", q => q.eq("userId", organizationUserId))
        .take(500);
      const resident = residents.find(r => r.email.toLowerCase() === normalizedEmail);
      if (resident) {
        await ctx.db.patch(resident._id, { linkedAccountUserId: userId });
      }
    }

    if (invite.role === "maintenance" || invite.role === "worker") {
      const staffMembers = await ctx.db
        .query("staff")
        .withIndex("by_userId", q => q.eq("userId", organizationUserId))
        .take(500);
      const staffMember = staffMembers.find(s => s.email.toLowerCase() === normalizedEmail);
      if (staffMember) {
        await ctx.db.patch(staffMember._id, { linkedAccountUserId: userId });
      }
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

    const callerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    // Managers and invited users should resolve the same organization root.
    const organizationUserId = callerProfile?.organizationUserId ?? userId;

    const teamMembers = await ctx.db
      .query("userProfiles")
      .withIndex("by_organizationUserId", q =>
        q.eq("organizationUserId", organizationUserId),
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
    role: v.union(
      v.literal("manager"),
      v.literal("worker"),
      v.literal("tenant"),
      v.literal("maintenance"),
    ),
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
