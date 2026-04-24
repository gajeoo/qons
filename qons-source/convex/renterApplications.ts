import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** List renter applications — managers see all for their org, tenants see their own. */
export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return [];

    let apps;
    if (profile.role === "tenant") {
      // Tenants only see their own
      apps = await ctx.db
        .query("renterApplications")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();
    } else {
      // Managers see all for their org
      const orgId = profile.organizationUserId ?? user._id;
      apps = await ctx.db
        .query("renterApplications")
        .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", orgId))
        .order("desc")
        .collect();
    }

    if (args.status) {
      apps = apps.filter((a) => a.status === args.status);
    }

    return apps;
  },
});

/** Get a single application. */
export const get = query({
  args: { id: v.id("renterApplications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Create or update a draft application. */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("renterApplications")),
    propertyId: v.optional(v.id("properties")),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    currentAddress: v.optional(v.string()),
    employer: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    monthlyIncome: v.optional(v.number()),
    employmentLength: v.optional(v.string()),
    references: v.optional(v.array(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    }))),
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    desiredMoveIn: v.optional(v.string()),
    leaseTerm: v.optional(v.string()),
    pets: v.optional(v.string()),
    vehicles: v.optional(v.string()),
    additionalOccupants: v.optional(v.number()),
    notes: v.optional(v.string()),
    backgroundCheckConsent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profile not found");

    const orgId = profile.organizationUserId ?? user._id;

    const { id, ...data } = args;

    if (id) {
      await ctx.db.patch(id, data);
      return id;
    }

    return await ctx.db.insert("renterApplications", {
      ...data,
      userId: user._id,
      organizationUserId: orgId,
      status: "draft",
    });
  },
});

/** Submit an application (changes status from draft to submitted). */
export const submit = mutation({
  args: { id: v.id("renterApplications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("Application not found");
    await ctx.db.patch(args.id, {
      status: "submitted",
      submittedAt: Date.now(),
    });
  },
});

/** Review an application (approve/reject) — managers only. */
export const review = mutation({
  args: {
    id: v.id("renterApplications"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.id, {
      status: args.decision,
      reviewedAt: Date.now(),
      reviewedBy: user._id,
      reviewNotes: args.reviewNotes,
    });
  },
});

/** Get stats for applications. */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return null;

    const orgId = profile.organizationUserId ?? user._id;
    const apps = await ctx.db
      .query("renterApplications")
      .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", orgId))
      .collect();

    return {
      total: apps.length,
      draft: apps.filter((a) => a.status === "draft").length,
      submitted: apps.filter((a) => a.status === "submitted").length,
      underReview: apps.filter((a) => a.status === "under_review").length,
      approved: apps.filter((a) => a.status === "approved").length,
      rejected: apps.filter((a) => a.status === "rejected").length,
    };
  },
});
