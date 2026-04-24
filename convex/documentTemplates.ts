import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getOrganizationUserId(ctx: any, userId: any) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  return profile?.organizationUserId ?? userId;
}

/** List all templates for the current user/org. */
export const list = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const organizationUserId = await getOrganizationUserId(ctx, userId);

    let templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_userId", q => q.eq("userId", organizationUserId))
      .order("desc")
      .collect();

    if (args.type) {
      templates = templates.filter(t => t.type === args.type);
    }

    return templates;
  },
});

/** Create a document template. */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("lease_agreement"),
      v.literal("renter_application"),
      v.literal("maintenance_report"),
      v.literal("notice_to_vacate"),
      v.literal("late_rent_notice"),
      v.literal("move_in_checklist"),
      v.literal("move_out_checklist"),
      v.literal("custom"),
    ),
    content: v.string(),
    variables: v.optional(v.array(v.string())),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const organizationUserId = await getOrganizationUserId(ctx, userId);

    return await ctx.db.insert("documentTemplates", {
      userId: organizationUserId,
      name: args.name,
      type: args.type,
      content: args.content,
      variables: args.variables,
      isDefault: args.isDefault,
      createdAt: Date.now(),
    });
  },
});

/** Update a template. */
export const update = mutation({
  args: {
    id: v.id("documentTemplates"),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    variables: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const organizationUserId = await getOrganizationUserId(ctx, userId);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== organizationUserId) {
      throw new Error("Template not found");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

/** Delete a template. */
export const remove = mutation({
  args: { id: v.id("documentTemplates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const organizationUserId = await getOrganizationUserId(ctx, userId);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== organizationUserId) {
      throw new Error("Template not found");
    }

    await ctx.db.delete(args.id);
  },
});

/** Get default templates — creates them if they don't exist for this user. */
export const getDefaults = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const organizationUserId = await getOrganizationUserId(ctx, userId);

    const templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_userId", q => q.eq("userId", organizationUserId))
      .collect();

    return templates.filter(t => t.isDefault);
  },
});

/**
 * List templates from the organization root so sub-accounts and admin can preview shared templates.
 */
export const listForOrganizationViewer = query({
  args: { audience: v.optional(v.union(v.literal("tenant"), v.literal("maintenance"))) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    if (!profile) return [];

    const organizationUserId = profile.organizationUserId ?? userId;

    let templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_userId", q => q.eq("userId", organizationUserId))
      .order("desc")
      .collect();

    if (args.audience === "tenant") {
      const tenantTypes = new Set([
        "lease_agreement",
        "notice_to_vacate",
        "late_rent_notice",
        "move_in_checklist",
        "move_out_checklist",
      ]);
      templates = templates.filter(t => tenantTypes.has(t.type));
    }

    if (args.audience === "maintenance") {
      const maintenanceTypes = new Set(["maintenance_report", "custom"]);
      templates = templates.filter(t => maintenanceTypes.has(t.type));
    }

    return templates;
  },
});
