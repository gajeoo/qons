import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

/**
 * Submit a new lead from the contact form (public — no auth required)
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    properties: v.optional(v.string()),
    message: v.optional(v.string()),
    inquiryType: v.union(
      v.literal("demo"),
      v.literal("beta"),
      v.literal("general"),
      v.literal("trial"),
      v.literal("question"),
      v.literal("partnership"),
      v.literal("pricing"),
      v.literal("support"),
    ),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert("leads", {
      ...args,
      status: "new",
    });
    return leadId;
  },
});

/**
 * List all leads (admin only)
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("contacted"),
        v.literal("converted"),
        v.literal("archived"),
      ),
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("leads"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      company: v.optional(v.string()),
      properties: v.optional(v.string()),
      message: v.optional(v.string()),
      inquiryType: v.union(
        v.literal("demo"),
        v.literal("beta"),
        v.literal("general"),
        v.literal("trial"),
        v.literal("question"),
        v.literal("partnership"),
        v.literal("pricing"),
        v.literal("support"),
      ),
      status: v.union(
        v.literal("new"),
        v.literal("contacted"),
        v.literal("converted"),
        v.literal("archived"),
      ),
      notes: v.optional(v.string()),
      notifiedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check admin role
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin") return [];

    if (status) {
      return await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("leads").order("desc").collect();
  },
});

/**
 * Update lead status (admin only)
 */
export const updateStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("converted"),
      v.literal("archived"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { leadId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin")
      throw new Error("Not authorized");

    await ctx.db.patch(leadId, { status });
    return null;
  },
});

/**
 * Add note to a lead (admin only)
 */
export const addNote = mutation({
  args: {
    leadId: v.id("leads"),
    notes: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { leadId, notes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin")
      throw new Error("Not authorized");

    await ctx.db.patch(leadId, { notes });
    return null;
  },
});

/**
 * Reply to a lead via email (admin only)
 */
export const replyToLead = mutation({
  args: {
    leadId: v.id("leads"),
    replyMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { leadId, replyMessage }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin")
      throw new Error("Not authorized");

    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error("Lead not found");

    // Store the reply in notes (append to existing)
    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const replyNote = `[Reply sent ${timestamp}]: ${replyMessage}`;
    const updatedNotes = lead.notes
      ? `${lead.notes}\n\n${replyNote}`
      : replyNote;

    await ctx.db.patch(leadId, {
      notes: updatedNotes,
      status: lead.status === "new" ? "contacted" : lead.status,
    });

    return null;
  },
});

/**
 * Send reply email to lead (action — can make HTTP calls)
 */
export const sendReplyEmail = action({
  args: {
    leadId: v.id("leads"),
    replyMessage: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { leadId, replyMessage }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    // Get lead details
    const lead = await ctx.runQuery(internal.leads.getLeadById, { leadId });
    if (!lead) return { success: false, error: "Lead not found" };

    // Send email via Viktor Spaces API
    const apiUrl = process.env.VIKTOR_SPACES_API_URL;
    const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
    const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;

    if (!apiUrl || !projectName || !projectSecret) {
      return { success: false, error: "Email not configured" };
    }

    try {
      const response = await fetch(`${apiUrl}/api/viktor-spaces/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          project_secret: projectSecret,
          to_email: lead.email,
          subject: `Re: Your inquiry — QonsApp`,
          html_content: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px;">
                <h2 style="color: #0d9488; margin: 0;">QonsApp</h2>
              </div>
              <p style="color: #333;">Hi ${lead.name},</p>
              <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${replyMessage}</div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">This is a reply to your ${lead.inquiryType} inquiry submitted to QonsApp.</p>
            </div>
          `,
          text_content: `Hi ${lead.name},\n\n${replyMessage}\n\n---\nThis is a reply to your ${lead.inquiryType} inquiry submitted to QonsApp.`,
          email_type: "transactional",
        }),
      });

      if (!response.ok) {
        return { success: false, error: "Failed to send email" };
      }

      // Update lead status and notes
      await ctx.runMutation(internal.leads.markReplied, {
        leadId,
        replyMessage,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to send email" };
    }
  },
});

/**
 * Get lead stats for admin dashboard
 */
export const getStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    new: v.number(),
    contacted: v.number(),
    converted: v.number(),
    thisWeek: v.number(),
    thisMonth: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        total: 0,
        new: 0,
        contacted: 0,
        converted: 0,
        thisWeek: 0,
        thisMonth: 0,
      };

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile || profile.role !== "admin")
      return {
        total: 0,
        new: 0,
        contacted: 0,
        converted: 0,
        thisWeek: 0,
        thisMonth: 0,
      };

    const allLeads = await ctx.db.query("leads").collect();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    return {
      total: allLeads.length,
      new: allLeads.filter((l) => l.status === "new").length,
      contacted: allLeads.filter((l) => l.status === "contacted").length,
      converted: allLeads.filter((l) => l.status === "converted").length,
      thisWeek: allLeads.filter((l) => l._creationTime > weekAgo).length,
      thisMonth: allLeads.filter((l) => l._creationTime > monthAgo).length,
    };
  },
});

/**
 * Internal: Get lead by ID (for actions)
 */
export const getLeadById = internalQuery({
  args: { leadId: v.id("leads") },
  returns: v.union(
    v.object({
      _id: v.id("leads"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      company: v.optional(v.string()),
      properties: v.optional(v.string()),
      message: v.optional(v.string()),
      inquiryType: v.string(),
      status: v.string(),
      notes: v.optional(v.string()),
      notifiedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;
    return lead as any;
  },
});

/**
 * Internal: Mark lead as replied
 */
export const markReplied = internalMutation({
  args: {
    leadId: v.id("leads"),
    replyMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { leadId, replyMessage }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;

    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const replyNote = `[Reply sent ${timestamp}]: ${replyMessage}`;
    const updatedNotes = lead.notes
      ? `${lead.notes}\n\n${replyNote}`
      : replyNote;

    await ctx.db.patch(leadId, {
      notes: updatedNotes,
      status: lead.status === "new" ? "contacted" : lead.status,
    });
    return null;
  },
});
