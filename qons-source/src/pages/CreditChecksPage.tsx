import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  UserSearch,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "../../convex/_generated/api";

/* ------------------------------------------------------------------
   TENANT SCREENING — Credit & Background Checks
   Uses the deployed tenantScreening module for real data.
   ------------------------------------------------------------------ */

export function CreditChecksPage() {
  const screenings = useQuery(api.tenantScreening.list, {}) ?? [];

  const pending = screenings.filter((s) => s.status === "pending");
  const completed = screenings.filter((s) => s.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tenant Screening
        </h1>
        <p className="text-muted-foreground mt-1">
          Run credit and background checks on prospective tenants.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-amber-100 text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-sky-100 text-sky-600">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{screenings.length}</p>
              <p className="text-xs text-muted-foreground">Total Screenings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screening list */}
      <Card>
        <CardHeader>
          <CardTitle>Screening Records</CardTitle>
          <CardDescription>
            Credit and background check results for tenant applicants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {screenings.length === 0 ? (
            <div className="py-12 text-center">
              <UserSearch className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-2">No screenings yet</p>
              <p className="text-xs text-muted-foreground">
                Screenings are initiated when tenants submit rental applications.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {screenings.map((s) => (
                <div key={s._id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {s.applicantName || "Unknown Applicant"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.applicantEmail || "No email"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      Requested: {new Date(s._creationTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "completed" && s.creditScore && (
                      <Badge
                        variant={
                          s.creditScore >= 700
                            ? "default"
                            : s.creditScore >= 600
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        Score: {s.creditScore}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        s.status === "completed"
                          ? "border-emerald-200 text-emerald-700"
                          : s.status === "pending"
                            ? "border-amber-200 text-amber-700"
                            : "border-red-200 text-red-700"
                      }
                    >
                      {s.status === "completed" ? (
                        <CheckCircle2 className="size-3 mr-1" />
                      ) : s.status === "pending" ? (
                        <Clock className="size-3 mr-1" />
                      ) : (
                        <AlertTriangle className="size-3 mr-1" />
                      )}
                      {s.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
