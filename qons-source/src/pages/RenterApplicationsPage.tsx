import {
  ClipboardList,
  FileText,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------
   RENTER APPLICATIONS — Overview page for property managers.
   Backend module not yet deployed; shows static overview.
   ------------------------------------------------------------------ */

export function RenterApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Renter Applications
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and manage rental applications from prospective tenants.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-sky-100 text-sky-600">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-emerald-100 text-emerald-600">
              <UserPlus className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-amber-100 text-amber-600">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Total Applications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Queue</CardTitle>
          <CardDescription>
            When tenants submit applications through the Tenant Portal, they will appear here for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <ClipboardList className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-2">No applications yet</p>
          <p className="text-xs text-muted-foreground">
            Send invitations to prospective tenants so they can submit their applications.
          </p>
          <Badge variant="outline" className="mt-4">
            Send invitations from Team → Invite
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
