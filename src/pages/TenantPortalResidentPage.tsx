import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function TenantPortalResidentPage() {
  const data = useQuery(api.operations.getTenantPortalOverview);

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My Tenant Portal</h1>
        <p className="text-sm text-muted-foreground">Loading your portal data...</p>
      </div>
    );
  }

  if (!data.resident) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My Tenant Portal</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No resident profile is linked to this account yet. Ask your property manager to link your email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tenant Portal</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {data.resident.name} ({data.resident.status})
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Open Invoices</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.invoices.filter((i) => i.status !== "paid").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Leases</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.leases.filter((l) => l.status === "active" || l.status === "signed").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.leaseDocuments.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>My Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices found.</p> : null}
          {data.invoices.map((invoice) => (
            <div key={invoice._id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{invoice.period}</p>
                <p className="font-semibold">{money.format(invoice.amountCents / 100)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Due {invoice.dueDate} • status {invoice.status} • paid {money.format((invoice.paidCents || 0) / 100)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lease Documents</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.leaseDocuments.length === 0 ? <p className="text-sm text-muted-foreground">No documents available.</p> : null}
          {data.leaseDocuments.map((doc) => (
            <a
              key={doc._id}
              href={doc.fileUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-blue-600 underline"
            >
              {doc.fileName}
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.announcements.length === 0 ? <p className="text-sm text-muted-foreground">No announcements.</p> : null}
          {data.announcements.map((announcement) => (
            <div key={announcement._id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{announcement.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(announcement.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="mt-1 text-sm">{announcement.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
