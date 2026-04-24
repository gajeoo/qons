import { useMutation, useQuery } from "convex/react";
import {
  CreditCard,
  FileText,
  Home,
  MessageSquare,
  Send,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";

/* ------------------------------------------------------------------
   TENANT PORTAL — Tenants can:
   - View their lease & documents
   - Pay rent
   - Submit maintenance requests
   - Message the property manager
   ------------------------------------------------------------------ */

function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Link to="/rent">
        <Card className="hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer h-full">
          <CardContent className="pt-6 text-center">
            <div className="size-12 mx-auto rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-3">
              <CreditCard className="size-6 text-emerald-600" />
            </div>
            <p className="font-semibold text-sm">Pay Rent</p>
            <p className="text-xs text-muted-foreground mt-1">Make a payment</p>
          </CardContent>
        </Card>
      </Link>
      <Link to="/maintenance">
        <Card className="hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
          <CardContent className="pt-6 text-center">
            <div className="size-12 mx-auto rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-3">
              <Wrench className="size-6 text-amber-600" />
            </div>
            <p className="font-semibold text-sm">Report Issue</p>
            <p className="text-xs text-muted-foreground mt-1">Submit a request</p>
          </CardContent>
        </Card>
      </Link>
      <Link to="/leases">
        <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
          <CardContent className="pt-6 text-center">
            <div className="size-12 mx-auto rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center mb-3">
              <FileText className="size-6 text-blue-600" />
            </div>
            <p className="font-semibold text-sm">My Lease</p>
            <p className="text-xs text-muted-foreground mt-1">View documents</p>
          </CardContent>
        </Card>
      </Link>
      <Link to="/documents">
        <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer h-full">
          <CardContent className="pt-6 text-center">
            <div className="size-12 mx-auto rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center mb-3">
              <Home className="size-6 text-purple-600" />
            </div>
            <p className="font-semibold text-sm">Documents</p>
            <p className="text-xs text-muted-foreground mt-1">Files & records</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function MessageManager() {
  const createNotification = useMutation(api.notificationRecords.create);
  const [subject, setSubject] = useState("");
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
        type: "general" as any,
        title: subject || "Message from tenant",
        message: body,
      });
      toast.success("Message sent to property manager");
      setSubject("");
      setBody("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-5" />
          Message Property Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Question about lease renewal" />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message..." />
        </div>
        <Button onClick={handleSend} disabled={sending} className="bg-teal text-white hover:bg-teal/90">
          <Send className="size-4 mr-2" />
          {sending ? "Sending..." : "Send Message"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentNotifications() {
  const notifications = useQuery(api.notificationRecords.list, {}) ?? [];
  const recent = notifications.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Notifications</CardTitle>
        <CardDescription>Your latest updates and messages</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((n) => (
              <div key={n._id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {new Date(n.sentAt ?? n._creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TenantPortalPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenant Portal</h1>
        <p className="text-muted-foreground mt-1">
          Manage your tenancy — pay rent, submit requests, and view your documents.
        </p>
      </div>

      <QuickActions />

      <div className="grid gap-8 lg:grid-cols-2">
        <MessageManager />
        <RecentNotifications />
      </div>
    </div>
  );
}
