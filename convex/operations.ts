import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const listBookkeepingEntries = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("bookkeepingEntries")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(200);
  },
});

export const createBookkeepingEntry = mutation({
  args: {
    propertyId: v.optional(v.id("properties")),
    date: v.string(),
    type: v.union(v.literal("income"), v.literal("expense"), v.literal("transfer")),
    category: v.string(),
    amountCents: v.number(),
    description: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    return await ctx.db.insert("bookkeepingEntries", {
      userId,
      ...args,
      amountCents: Math.abs(args.amountCents),
      createdAt: Date.now(),
    });
  },
});

export const listRentInvoices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invoices = await ctx.db
      .query("rentInvoices")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    return await Promise.all(
      invoices.map(async (invoice: any) => {
        const resident: any = invoice.residentId ? await ctx.db.get(invoice.residentId) : null;
        const property: any = invoice.propertyId ? await ctx.db.get(invoice.propertyId) : null;
        return {
          ...invoice,
          residentName: resident?.name,
          propertyName: property?.name,
        };
      }),
    );
  },
});

export const createRentInvoice = mutation({
  args: {
    residentId: v.optional(v.id("residents")),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leaseAgreements")),
    period: v.string(),
    dueDate: v.string(),
    amountCents: v.number(),
    paymentMethod: v.optional(v.union(v.literal("card"), v.literal("ach"), v.literal("cash"), v.literal("check"), v.literal("other"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    return await ctx.db.insert("rentInvoices", {
      userId,
      ...args,
      amountCents: Math.abs(args.amountCents),
      paidCents: 0,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const recordRentPayment = mutation({
  args: {
    invoiceId: v.id("rentInvoices"),
    amountCents: v.number(),
    paymentMethod: v.union(v.literal("card"), v.literal("ach"), v.literal("cash"), v.literal("check"), v.literal("other")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invoice: any = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== userId) throw new Error("Invoice not found");

    const nextPaid = Math.max(0, (invoice.paidCents ?? 0) + Math.abs(args.amountCents));
    const status = nextPaid >= invoice.amountCents ? "paid" : "partial";

    await ctx.db.patch(args.invoiceId, {
      paidCents: nextPaid,
      status,
      paymentMethod: args.paymentMethod,
      updatedAt: Date.now(),
      paidAt: status === "paid" ? Date.now() : invoice.paidAt,
    });

    return { success: true, status, paidCents: nextPaid };
  },
});

export const listTenantScreenings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("tenantScreenings")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(200);
  },
});

export const createTenantScreening = mutation({
  args: {
    applicantName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    provider: v.union(v.literal("transunion"), v.literal("experian"), v.literal("checkr"), v.literal("other")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    return await ctx.db.insert("tenantScreenings", {
      userId,
      ...args,
      status: "requested",
      createdAt: Date.now(),
    });
  },
});

export const updateTenantScreening = mutation({
  args: {
    screeningId: v.id("tenantScreenings"),
    status: v.union(v.literal("requested"), v.literal("in_progress"), v.literal("completed"), v.literal("failed")),
    result: v.optional(v.union(v.literal("pass"), v.literal("review"), v.literal("decline"))),
    score: v.optional(v.number()),
    externalReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const screening: any = await ctx.db.get(args.screeningId);
    if (!screening || screening.userId !== userId) throw new Error("Screening not found");

    const { screeningId, ...patch } = args;
    await ctx.db.patch(screeningId, {
      ...patch,
      completedAt: args.status === "completed" ? Date.now() : screening.completedAt,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const listLeaseAgreements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const leases = await ctx.db
      .query("leaseAgreements")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    return await Promise.all(
      leases.map(async (lease: any) => {
        const resident: any = lease.residentId ? await ctx.db.get(lease.residentId) : null;
        const property: any = lease.propertyId ? await ctx.db.get(lease.propertyId) : null;
        return {
          ...lease,
          residentName: resident?.name,
          propertyName: property?.name,
        };
      }),
    );
  },
});

export const createLeaseAgreement = mutation({
  args: {
    residentId: v.optional(v.id("residents")),
    propertyId: v.optional(v.id("properties")),
    unit: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rentCents: v.number(),
    depositCents: v.optional(v.number()),
    esignProvider: v.union(v.literal("docusign"), v.literal("hellosign"), v.literal("internal"), v.literal("none")),
    externalDocumentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    return await ctx.db.insert("leaseAgreements", {
      userId,
      ...args,
      rentCents: Math.abs(args.rentCents),
      depositCents: args.depositCents ? Math.abs(args.depositCents) : undefined,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateLeaseStatus = mutation({
  args: {
    leaseId: v.id("leaseAgreements"),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("signed"), v.literal("active"), v.literal("expired"), v.literal("terminated")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const lease: any = await ctx.db.get(args.leaseId);
    if (!lease || lease.userId !== userId) throw new Error("Lease not found");

    await ctx.db.patch(args.leaseId, {
      status: args.status,
      signedAt: args.status === "signed" ? Date.now() : lease.signedAt,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const listIntegrations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("integrationConnections")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});

export const upsertIntegration = mutation({
  args: {
    provider: v.union(
      v.literal("yardi"),
      v.literal("quickbooks"),
      v.literal("appfolio"),
      v.literal("buildium"),
      v.literal("rentmanager"),
      v.literal("other"),
    ),
    status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("error"), v.literal("pending")),
    accountLabel: v.optional(v.string()),
    externalAccountId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const existing: any = await ctx.db
      .query("integrationConnections")
      .withIndex("by_userId_provider", (q: any) => q.eq("userId", userId).eq("provider", args.provider))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("integrationConnections", {
      userId,
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const markIntegrationSync = mutation({
  args: {
    connectionId: v.id("integrationConnections"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const conn: any = await ctx.db.get(args.connectionId);
    if (!conn || conn.userId !== userId) throw new Error("Integration not found");

    await ctx.db.patch(args.connectionId, {
      lastSyncedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
