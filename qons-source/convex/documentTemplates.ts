import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** List all templates for the current user/org. */
export const list = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return [];

    let templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    if (args.type) {
      templates = templates.filter((t) => t.type === args.type);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("documentTemplates", {
      userId: user._id,
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
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

/** Delete a template. */
export const remove = mutation({
  args: { id: v.id("documentTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/** Get default templates — creates them if they don't exist for this user. */
export const getDefaults = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return [];

    const templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return templates.filter((t) => t.isDefault);
  },
});
