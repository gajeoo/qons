import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

type Provider = "quickbooks" | "yardi" | "docusign" | "hellosign";

const PROVIDERS: Provider[] = ["quickbooks", "yardi", "docusign", "hellosign"];

function assertProvider(value: string): Provider {
  if (!PROVIDERS.includes(value as Provider)) throw new Error("Unsupported provider");
  return value as Provider;
}

function randomState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function appBaseUrl() {
  return process.env.SITE_URL || process.env.APP_SITE_URL || "http://127.0.0.1:5173";
}

function convexBaseUrl() {
  const url = process.env.CONVEX_SITE_URL;
  if (!url) throw new Error("CONVEX_SITE_URL is not configured");
  return url;
}

function callbackUrl(provider: Provider) {
  return `${convexBaseUrl()}/oauth/${provider}/callback`;
}

function authConfig(provider: Provider) {
  switch (provider) {
    case "quickbooks":
      return {
        authUrl: process.env.QUICKBOOKS_AUTH_URL || "https://appcenter.intuit.com/connect/oauth2",
        tokenUrl: process.env.QUICKBOOKS_TOKEN_URL || "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        clientId: process.env.QUICKBOOKS_CLIENT_ID,
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
        scope: process.env.QUICKBOOKS_SCOPES || "com.intuit.quickbooks.accounting",
      };
    case "yardi":
      return {
        authUrl: process.env.YARDI_AUTH_URL,
        tokenUrl: process.env.YARDI_TOKEN_URL,
        clientId: process.env.YARDI_CLIENT_ID,
        clientSecret: process.env.YARDI_CLIENT_SECRET,
        scope: process.env.YARDI_SCOPES || "openid profile",
      };
    case "docusign":
      return {
        authUrl: process.env.DOCUSIGN_AUTH_URL || "https://account-d.docusign.com/oauth/auth",
        tokenUrl: process.env.DOCUSIGN_TOKEN_URL || "https://account-d.docusign.com/oauth/token",
        clientId: process.env.DOCUSIGN_CLIENT_ID,
        clientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
        scope: process.env.DOCUSIGN_SCOPES || "signature impersonation",
      };
    case "hellosign":
      return {
        authUrl: process.env.HELLOSIGN_AUTH_URL || "https://app.hellosign.com/oauth/authorize",
        tokenUrl: process.env.HELLOSIGN_TOKEN_URL || "https://app.hellosign.com/oauth/token",
        clientId: process.env.HELLOSIGN_CLIENT_ID,
        clientSecret: process.env.HELLOSIGN_CLIENT_SECRET,
        scope: process.env.HELLOSIGN_SCOPES || "basic_account_info request_signature",
      };
  }
}

export const createOAuthStartUrl = mutation({
  args: {
    provider: v.string(),
    redirectPath: v.optional(v.string()),
  },
  returns: v.object({ authUrl: v.string(), state: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const provider = assertProvider(args.provider);
    const cfg = authConfig(provider);
    if (!cfg.authUrl || !cfg.clientId) {
      throw new Error(`${provider} OAuth is not configured`);
    }

    const state = randomState();
    await ctx.runMutation(internal.providerAdapters.storeOAuthState, {
      state,
      userId,
      provider,
      redirectPath: args.redirectPath,
    });

    const url = new URL(cfg.authUrl);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", callbackUrl(provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", cfg.scope || "openid profile");
    url.searchParams.set("state", state);

    return { authUrl: url.toString(), state };
  },
});

export const storeOAuthState = internalMutation({
  args: {
    state: v.string(),
    userId: v.id("users"),
    provider: v.string(),
    redirectPath: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("integrationOAuthStates", {
      state: args.state,
      userId: args.userId,
      provider: args.provider,
      redirectPath: args.redirectPath,
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const consumeOAuthState = internalMutation({
  args: {
    state: v.string(),
    provider: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      redirectPath: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const found = await ctx.db
      .query("integrationOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();

    if (!found || found.provider !== args.provider || found.expiresAt < Date.now()) {
      return null;
    }

    await ctx.db.delete(found._id);
    return { userId: found.userId, redirectPath: found.redirectPath };
  },
});

export const upsertOAuthConnection = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    expiresInSeconds: v.optional(v.number()),
    externalAccountId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = args.expiresInSeconds ? now + args.expiresInSeconds * 1000 : undefined;

    const existingToken = await ctx.db
      .query("integrationAuthTokens")
      .withIndex("by_userId_provider", (q) => q.eq("userId", args.userId).eq("provider", args.provider))
      .unique();

    if (existingToken) {
      await ctx.db.patch(existingToken._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken ?? existingToken.refreshToken,
        tokenType: args.tokenType,
        scope: args.scope,
        expiresAt,
        externalAccountId: args.externalAccountId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("integrationAuthTokens", {
        userId: args.userId,
        provider: args.provider,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenType: args.tokenType,
        scope: args.scope,
        expiresAt,
        externalAccountId: args.externalAccountId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingConn = await ctx.db
      .query("integrationConnections")
      .withIndex("by_userId_provider", (q) => q.eq("userId", args.userId).eq("provider", args.provider as any))
      .unique();

    if (existingConn) {
      await ctx.db.patch(existingConn._id, {
        status: "connected",
        externalAccountId: args.externalAccountId,
        lastSyncedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("integrationConnections", {
        userId: args.userId,
        provider: args.provider as any,
        status: "connected",
        externalAccountId: args.externalAccountId,
        createdAt: now,
        updatedAt: now,
        lastSyncedAt: now,
      });
    }

    return null;
  },
});

export const logWebhookEvent = internalMutation({
  args: {
    provider: v.string(),
    eventType: v.optional(v.string()),
    externalAccountId: v.optional(v.string()),
    status: v.union(v.literal("received"), v.literal("processed"), v.literal("ignored"), v.literal("failed")),
    payload: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("integrationWebhookEvents", {
      provider: args.provider,
      eventType: args.eventType,
      externalAccountId: args.externalAccountId,
      status: args.status,
      payload: args.payload,
      error: args.error,
      receivedAt: Date.now(),
    });
    return null;
  },
});

export const handleOAuthCallback = internalAction({
  args: {
    provider: v.string(),
    code: v.string(),
    state: v.string(),
    realmId: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), redirectUrl: v.string(), error: v.optional(v.string()) }),
  handler: async (ctx, args): Promise<{ ok: boolean; redirectUrl: string; error?: string }> => {
    const provider = assertProvider(args.provider);
    const cfg = authConfig(provider);
    if (!cfg.tokenUrl || !cfg.clientId || !cfg.clientSecret) {
      return {
        ok: false,
        redirectUrl: `${appBaseUrl()}/integrations?provider=${provider}&status=error`,
        error: `${provider} token exchange is not configured`,
      };
    }

    const oauthState = (await ctx.runMutation(internal.providerAdapters.consumeOAuthState, {
      state: args.state,
      provider,
    })) as { userId: any; redirectPath?: string } | null;
    if (!oauthState) {
      return {
        ok: false,
        redirectUrl: `${appBaseUrl()}/integrations?provider=${provider}&status=error`,
        error: "Invalid or expired state",
      };
    }

    try {
      const body = new URLSearchParams();
      body.set("grant_type", "authorization_code");
      body.set("code", args.code);
      body.set("redirect_uri", callbackUrl(provider));

      const basic = btoa(`${cfg.clientId}:${cfg.clientSecret}`);
      const tokenRes = await fetch(cfg.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: body.toString(),
      });

      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson?.access_token) {
        return {
          ok: false,
          redirectUrl: `${appBaseUrl()}/integrations?provider=${provider}&status=error`,
          error: tokenJson?.error_description || tokenJson?.error || "Token exchange failed",
        };
      }

      const externalAccountId = args.realmId || tokenJson.realmId || tokenJson.account_id;

      await ctx.runMutation(internal.providerAdapters.upsertOAuthConnection, {
        userId: oauthState.userId,
        provider,
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        tokenType: tokenJson.token_type,
        scope: tokenJson.scope,
        expiresInSeconds: tokenJson.expires_in,
        externalAccountId,
      });

      return {
        ok: true,
        redirectUrl: `${appBaseUrl()}${oauthState.redirectPath || "/integrations"}?provider=${provider}&status=connected`,
      };
    } catch (error: any) {
      return {
        ok: false,
        redirectUrl: `${appBaseUrl()}/integrations?provider=${provider}&status=error`,
        error: error?.message || "OAuth callback failed",
      };
    }
  },
});

export const handleWebhookSync = internalAction({
  args: {
    provider: v.string(),
    payload: v.string(),
    eventType: v.optional(v.string()),
    externalAccountId: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const provider = assertProvider(args.provider);

    await ctx.runMutation(internal.providerAdapters.logWebhookEvent, {
      provider,
      eventType: args.eventType,
      externalAccountId: args.externalAccountId,
      status: "received",
      payload: args.payload.slice(0, 15000),
    });

    if (args.externalAccountId) {
      const tokens = (await ctx.runQuery(internal.providerAdapters.findTokensByProvider, {
        provider,
      })) as Array<{ userId: any; externalAccountId?: string }>;
      const match = tokens.find((t) => t.externalAccountId === args.externalAccountId);
      if (match) {
        await ctx.runMutation(internal.providerAdapters.markConnectionSynced, {
          userId: match.userId,
          provider,
        });
      }
    }

    await ctx.runMutation(internal.providerAdapters.logWebhookEvent, {
      provider,
      eventType: args.eventType,
      externalAccountId: args.externalAccountId,
      status: "processed",
    });

    return { ok: true };
  },
});

export const findTokensByProvider = internalQuery({
  args: { provider: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("integrationAuthTokens"),
      userId: v.id("users"),
      externalAccountId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("integrationAuthTokens")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .collect();
    return rows.map((r) => ({ _id: r._id, userId: r.userId, externalAccountId: r.externalAccountId }));
  },
});

export const markConnectionSynced = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingConn = await ctx.db
      .query("integrationConnections")
      .withIndex("by_userId_provider", (q) => q.eq("userId", args.userId).eq("provider", args.provider as any))
      .unique();
    if (existingConn) {
      await ctx.db.patch(existingConn._id, {
        status: "connected",
        lastSyncedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
