import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  CheckCircle2,
  Mail,
  MessageSquare,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

const channels = [
  { value: "in_app", label: "In-App", icon: Bell },
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: Smartphone },
  { value: "push", label: "Push", icon: MessageSquare },
] as const;

type Channel = (typeof channels)[number]["value"];

export function MessagingPage() {
  const [channel, setChannel] = useState<Channel>("in_app");
  const [recipientType, setRecipientType] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const createNotification = useMutation(api.notificationRecords.create);
  const sentMessages = useQuery(api.notificationRecords.list, {}) ?? [];

  // Get team members for individual targeting
  const team = useQuery(api.invitations.getMyTeam) ?? [];
  const residents = team.filter((m) => m.role === "tenant");
  const staff = team.filter((m) => m.role === "worker" || m.role === "manager");
  const maintenance = team.filter((m) => m.role === "maintenance");

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }
    setSending(true);
    try {
      // Determine recipients based on type
      let targets: { userId?: any; email?: string }[] = [];
      if (recipientType === "all") {
        targets = team.map((m) => ({ userId: m.userId }));
      } else if (recipientType === "residents") {
        targets = residents.map((m) => ({ userId: m.userId }));
      } else if (recipientType === "staff") {
        targets = staff.map((m) => ({ userId: m.userId }));
      } else if (recipientType === "maintenance") {
        targets = maintenance.map((m) => ({ userId: m.userId }));
      }

      if (targets.length === 0) {
        // Send a single notification record (no specific target)
        await createNotification({
          channel: channel as any,
          type: "general" as any,
          title: title.trim(),
          message: message.trim(),
        });
      } else {
        // Send to each target
        for (const target of targets) {
          await createNotification({
            targetUserId: target.userId,
            channel: channel as any,
            type: "general" as any,
            title: title.trim(),
            message: message.trim(),
          });
        }
      }
      toast.success(`Message sent via ${channel.replace("_", "-")} to ${targets.length || 1} recipient(s)`);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messaging Center</h1>
        <p className="text-muted-foreground mt-1">
          Send notifications, emails, SMS, and push messages to your team, residents, and contractors.
        </p>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList>
          <TabsTrigger value="compose">
            <Send className="size-4 mr-1.5" /> Compose
          </TabsTrigger>
          <TabsTrigger value="sent">
            <CheckCircle2 className="size-4 mr-1.5" /> Sent ({sentMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>New Message</CardTitle>
              <CardDescription>
                Choose a channel and audience, then compose your message.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Channel selector */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Channel</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {channels.map((ch) => (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                        channel === ch.value
                          ? "border-teal bg-teal/10 text-teal"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <ch.icon className="size-4" />
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient selector */}
              <div>
                <Label>Recipients</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="size-4" /> All Users ({team.length})
                      </div>
                    </SelectItem>
                    <SelectItem value="residents">
                      Residents / Tenants ({residents.length})
                    </SelectItem>
                    <SelectItem value="staff">
                      Staff ({staff.length})
                    </SelectItem>
                    <SelectItem value="maintenance">
                      Maintenance / Contractors ({maintenance.length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title & Message */}
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Rent Reminder, Maintenance Update..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="mt-1"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full bg-teal text-white hover:bg-teal/90"
              >
                <Send className="size-4 mr-2" />
                {sending ? "Sending..." : `Send via ${channel.replace("_", "-").toUpperCase()}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sent Messages</CardTitle>
              <CardDescription>History of messages you've sent.</CardDescription>
            </CardHeader>
            <CardContent>
              {sentMessages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No messages sent yet. Compose your first message above.
                </p>
              ) : (
                <div className="divide-y max-h-[60vh] overflow-y-auto">
                  {sentMessages.slice(0, 50).map((msg) => (
                    <div key={msg._id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{msg.title}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          {msg.channel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {msg.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {new Date(msg.sentAt ?? msg._creationTime).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
