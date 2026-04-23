import { useMutation, useQuery } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

const PROVIDERS: Array<"yardi" | "quickbooks" | "docusign" | "hellosign" | "appfolio" | "buildium" | "rentmanager"> = [
  "yardi",
  "quickbooks",
  "docusign",
  "hellosign",
  "appfolio",
  "buildium",
  "rentmanager",
];

const OAUTH_PROVIDERS = new Set(["yardi", "quickbooks", "docusign", "hellosign"]);

export function IntegrationsPage() {
  const connections = useQuery(api.operations.listIntegrations) || [];
  const upsertIntegration = useMutation(api.operations.upsertIntegration);
  const markSync = useMutation(api.operations.markIntegrationSync);
  const startOAuth = useMutation(api.providerAdapters.createOAuthStartUrl);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const providerParam = params.get("provider");
  const statusParam = params.get("status");

  useEffect(() => {
    if (providerParam && statusParam === "connected") {
      toast.success(`${providerParam} connected`);
    }
    if (providerParam && statusParam === "error") {
      toast.error(`${providerParam} connection failed`);
    }
  }, [providerParam, statusParam]);

  const connect = async (provider: typeof PROVIDERS[number], accountLabel: string) => {
    if (OAUTH_PROVIDERS.has(provider)) {
      const result = await startOAuth({ provider, redirectPath: "/integrations" });
      window.location.href = result.authUrl;
      return;
    }

    await upsertIntegration({ provider, status: "connected", accountLabel });
    toast.success(`${provider} connected (manual)`);
  };

  const disconnect = async (provider: typeof PROVIDERS[number]) => {
    await upsertIntegration({
      provider,
      status: "disconnected",
    });
    toast.success(`${provider} disconnected`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PMS Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect Yardi, QuickBooks, and other PMS/accounting systems.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const existing = connections.find((c) => c.provider === provider);
          return (
            <Card key={provider}>
              <CardHeader className="pb-2"><CardTitle className="capitalize">{provider}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Status: {existing?.status || "disconnected"}</p>
                <div>
                  <Label>Account Label</Label>
                  <Input
                    value={labels[provider] ?? existing?.accountLabel ?? ""}
                    placeholder="Production account"
                    onChange={(e) => setLabels((prev) => ({ ...prev, [provider]: e.currentTarget.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      connect(provider, labels[provider]?.trim() || existing?.accountLabel || "Default").catch((err) =>
                        toast.error(err.message || "Failed to connect"),
                      )
                    }
                  >
                    {OAUTH_PROVIDERS.has(provider) ? "Connect OAuth" : "Connect"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => disconnect(provider).catch((err) => toast.error(err.message || "Failed to disconnect"))}>Disconnect</Button>
                  {existing ? (
                    <Button size="sm" variant="ghost" onClick={() => markSync({ connectionId: existing._id }).then(() => toast.success("Sync timestamp updated"))}>
                      <RefreshCw className="size-3.5" /> Sync
                    </Button>
                  ) : null}
                </div>
                {OAUTH_PROVIDERS.has(provider) ? (
                  <p className="text-xs text-muted-foreground">OAuth callback: {`/oauth/${provider}/callback`} endpoint, webhook endpoint enabled in Convex HTTP.</p>
                ) : null}
                {existing?.lastSyncedAt ? <p className="text-xs text-muted-foreground">Last sync: {new Date(existing.lastSyncedAt).toLocaleString()}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
