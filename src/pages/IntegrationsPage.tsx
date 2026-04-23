import { useMutation, useQuery } from "convex/react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

const PROVIDERS: Array<"yardi" | "quickbooks" | "appfolio" | "buildium" | "rentmanager"> = [
  "yardi",
  "quickbooks",
  "appfolio",
  "buildium",
  "rentmanager",
];

export function IntegrationsPage() {
  const connections = useQuery(api.operations.listIntegrations) || [];
  const upsertIntegration = useMutation(api.operations.upsertIntegration);
  const markSync = useMutation(api.operations.markIntegrationSync);

  const connect = async (provider: typeof PROVIDERS[number], accountLabel: string) => {
    await upsertIntegration({
      provider,
      status: "connected",
      accountLabel,
    });
    toast.success(`${provider} connected`);
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
                    defaultValue={existing?.accountLabel || ""}
                    placeholder="Production account"
                    onBlur={(e) => {
                      const next = e.currentTarget.value.trim();
                      if (!next && existing) return;
                      if (next) {
                        connect(provider, next).catch((err) => toast.error(err.message || "Failed to connect"));
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => connect(provider, existing?.accountLabel || "Default").catch((err) => toast.error(err.message || "Failed to connect"))}>Connect</Button>
                  <Button size="sm" variant="outline" onClick={() => disconnect(provider).catch((err) => toast.error(err.message || "Failed to disconnect"))}>Disconnect</Button>
                  {existing ? (
                    <Button size="sm" variant="ghost" onClick={() => markSync({ connectionId: existing._id }).then(() => toast.success("Sync timestamp updated"))}>
                      <RefreshCw className="size-3.5" /> Sync
                    </Button>
                  ) : null}
                </div>
                {existing?.lastSyncedAt ? <p className="text-xs text-muted-foreground">Last sync: {new Date(existing.lastSyncedAt).toLocaleString()}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
