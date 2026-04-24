import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const documentTypeValidator = v.union(
  v.literal("lease"),
  v.literal("inspection"),
  v.literal("insurance"),
  v.literal("tax"),
  v.literal("receipt"),
  v.literal("contract"),
  v.literal("notice"),
  v.literal("other"),
);

/**
 * List documents with optional filters
 */
export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    residentId: v.optional(v.id("residents")),
    leaseId: v.optional(v.id("leases")),
    type: v.optional(documentTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const take = args.limit ?? 500;

    let documents = await ctx.db
      .query("documents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(take);

    if (args.propertyId) {
      documents = documents.filter((d) => d.propertyId === args.propertyId);
    }
    if (args.residentId) {
      documents = documents.filter((d) => d.residentId === args.residentId);
    }
    if (args.leaseId) {
      documents = documents.filter((d) => d.leaseId === args.leaseId);
    }
    if (args.type) {
      documents = documents.filter((d) => d.type === args.type);
    }

    return documents.sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
});

/**
 * Upload document metadata (after file uploaded to storage)
 */
export const upload = mutation({
  args: {
    propertyId: v.optional(v.id("properties")),
    residentId: v.optional(v.id("residents")),
    leaseId: v.optional(v.id("leases")),
    name: v.string(),
    type: documentTypeValidator,
    storageId: v.id("_storage"),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("documents", {
      ...args,
      userId,
      uploadedAt: Date.now(),
    });
  },
});

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get download URL for a document
 */
export const getUrl = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== userId) return null;

    const url = await ctx.storage.getUrl(doc.storageId);
    return { ...doc, url };
  },
});

/**
 * Delete a document (metadata + file)
 */
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");

    // Delete the file from storage
    await ctx.storage.delete(doc.storageId);
    // Delete the metadata
    await ctx.db.delete(args.id);
  },
});
