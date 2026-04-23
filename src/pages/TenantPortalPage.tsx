import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

export function TenantPortalPage() {
  const announcements = useQuery(api.operations.listTenantPortalAnnouncements) || [];
  const createAnnouncement = useMutation(api.operations.createTenantPortalAnnouncement);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "all" as "all" | "active" | "pending",
  });

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    await createAnnouncement({
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
    });
    toast.success("Announcement published");
    setOpen(false);
    setForm({ title: "", body: "", audience: "all" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Portal</h1>
          <p className="text-sm text-muted-foreground">Publish announcements and share lease/payment updates for residents.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-teal text-white hover:bg-teal/90">
          <Plus className="size-4" /> New Announcement
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Published Announcements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {announcements.length === 0 ? <p className="text-sm text-muted-foreground">No announcements yet.</p> : null}
          {announcements.map((announcement) => (
            <div key={announcement._id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{announcement.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(announcement.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="mt-1 text-sm">{announcement.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">Audience: {announcement.audience}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Tenant Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(value: "all" | "active" | "pending") => setForm({ ...form, audience: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All residents</SelectItem>
                  <SelectItem value="active">Active residents</SelectItem>
                  <SelectItem value="pending">Pending applicants</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Message</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <Button onClick={submit} className="w-full bg-teal text-white hover:bg-teal/90">Publish</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
