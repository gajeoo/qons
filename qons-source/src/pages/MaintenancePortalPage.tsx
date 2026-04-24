import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";

/* ------------------------------------------------------------------
   MAINTENANCE PORTAL — Maintenance workers can:
   - View assigned repair requests
   - Update request status
   - Send messages to property manager
   ------------------------------------------------------------------ */

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-700 border-red-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-sky-100 text-sky-700 border-sky-200",
};

const statusIcons: Record<string, typeof Wrench> = {
  open: AlertCircle,
  in_progress: Clock,
  completed: CheckCircle2,
  pending: Clock,
};

function RequestList() {
  const requests = useQuery(api.maintenance.list, {}) ?? [];
  const updateStatus = useMutation(api.maintenance.updateStatus);

  const handleStatus = async (id: any, status: string) => {
    try {
      await updateStatus({ id, status: status as any });
      toast.success(`Status updated to ${status.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Wrench className="size-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No maintenance requests assigned to you.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const StatusIcon = statusIcons[req.status] ?? Clock;
        return (
          <Card key={req._id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon className="size-4 shrink-0" />
                    <h3 className="font-semibold text-sm truncate">{req.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {req.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={statusColors[req.status] ?? ""}>
                      {req.status.replace("_", " ")}
                    </Badge>
                    {req.priority && (
                      <Badge variant="secondary" className="text-[10px]">
                        {req.priority}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(req._creationTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {req.status !== "in_progress" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatus(req._id, "in_progress")}
                    >
                      Start
                    </Button>
                  )}
                  {req.status !== "completed" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => handleStatus(req._id, "completed")}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function QuickMessage() {
  const createNotification = useMutation(api.notificationRecords.create);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSending(true);
    try {
      await createNotification({
        channel: "in_app" as any,
        type: "maintenance" as any,
        title: "Message from maintenance worker",
        message: body,
      });
      toast.success("Message sent");
      setBody("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="size-4" /> Quick Message
        </CardTitle>
        <CardDescription>Send an update to the property manager</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your message..."
        />
        <Button onClick={handleSend} disabled={sending} size="sm" className="w-full">
          <Send className="size-3 mr-1.5" />
          {sending ? "Sending..." : "Send"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function MaintenancePortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance Portal</h1>
        <p className="text-muted-foreground mt-1">
          View and manage assigned repair requests.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Assigned Requests</h2>
          <RequestList />
        </div>
        <div>
          <QuickMessage />
        </div>
      </div>
    </div>
  );
}
