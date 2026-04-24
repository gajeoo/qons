/**
 * eSignature — built-in canvas-based digital signatures.
 * Users draw their signature on a canvas, it's stored as base64 and linked to documents/leases.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** List signatures for a user */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("eSignatures")
      .withIndex("by_signedByUserId", (q) => q.eq("signedByUserId", userId))
      .order("desc")
      .collect();
  },
});

/** List signatures for an organization (admin/primary view) */
export const listByOrganization = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("eSignatures")
      .withIndex("by_organizationUserId", (q) => q.eq("organizationUserId", userId))
      .order("desc")
      .collect();
  },
});

/** Get signatures for a specific lease */
export const getByLease = query({
  args: { leaseId: v.id("leases") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("eSignatures")
      .withIndex("by_leaseId", (q) => q.eq("leaseId", args.leaseId))
      .collect();
  },
});

/** Get signatures for a specific document */
export const getByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("eSignatures")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();
  },
});

/** Sign a document (capture canvas signature) */
export const sign = mutation({
  args: {
    signatureData: v.string(), // base64 PNG data from canvas
    documentId: v.optional(v.id("documents")),
    leaseId: v.optional(v.id("leases")),
    documentTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const organizationUserId = profile?.organizationUserId ?? userId;

    return await ctx.db.insert("eSignatures", {
      signedByUserId: userId,
      organizationUserId,
      documentId: args.documentId,
      leaseId: args.leaseId,
      signatureData: args.signatureData,
      documentTitle: args.documentTitle,
      signedAt: Date.now(),
      status: "signed",
    });
  },
});

/** Void a signature (admin only) */
export const voidSignature = mutation({
  args: { id: v.id("eSignatures") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (profile?.role !== "admin" && profile?.role !== "customer")
      throw new Error("Not authorized");

    await ctx.db.patch(args.id, { status: "voided" });
  },
});
