import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle, BadgeDollarSign, CalendarDays, FileText, Landmark, Megaphone, MessageSquare, Plus, PlusCircle, Vote,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

import { FeatureGate } from "@/components/FeatureGate";

const violationNoticeTemplateDefaults = {
  courtesy_warning: {
    subject: "Courtesy Warning",
    message: "This is a courtesy reminder regarding a reported HOA violation. Please resolve the issue promptly.",
  },
  fine_notice: {
    subject: "Fine Notice",
    message: "This notice confirms a fine has been issued for an unresolved HOA violation. Please review the charge and remediation steps.",
  },
  hearing_notice: {
    subject: "Hearing Notice",
    message: "A board hearing has been scheduled regarding this HOA violation. Please review the matter and prepare any supporting information.",
  },
  final_notice: {
    subject: "Final Notice",
    message: "This is the final notice before escalation for the outstanding HOA violation. Immediate action is required.",
  },
} as const;

type ViolationNoticeTemplate = keyof typeof violationNoticeTemplateDefaults;

function HoaPageInner() {
  const properties = useQuery(api.properties.list) || [];
  const violations = useQuery(api.hoa.listViolations, {}) || [];
  const dues = useQuery(api.hoa.listDues, {}) || [];
  const dueSummary = useQuery(api.hoa.getDueSummary);
  const votes = useQuery(api.hoa.listVotes, {}) || [];
  const meetings = useQuery(api.hoa.listMeetings, {}) || [];
  const arcRequests = useQuery(api.hoa.listArcRequests, {}) || [];
  const messages = useQuery(api.hoa.listMessages, {}) || [];
  const reserveFunds = useQuery(api.reserveFund.list, {}) || [];
  const reserveStats = useQuery(api.reserveFund.getStats);

  const createViolation = useMutation(api.hoa.createViolation);
  const updateViolation = useMutation(api.hoa.updateViolation);
  const sendViolationNotice = useMutation(api.hoa.sendViolationNotice);
  const createDue = useMutation(api.hoa.createDue);
  const updateDue = useMutation(api.hoa.updateDue);
  const createVoteMut = useMutation(api.hoa.createVote);
  const closeVoteMut = useMutation(api.hoa.closeVote);
  const createMeetingMut = useMutation(api.hoa.createMeeting);
  const updateMeetingMut = useMutation(api.hoa.updateMeeting);
  const createArcReq = useMutation(api.hoa.createArcRequest);
  const createReserveFund = useMutation(api.reserveFund.create);
  const addContribution = useMutation(api.reserveFund.addContribution);
  const removeReserveFund = useMutation(api.reserveFund.remove);
  const updateArcReq = useMutation(api.hoa.updateArcRequest);
  const sendMsg = useMutation(api.hoa.sendMessage);
  const removeMsg = useMutation(api.hoa.removeMessage);

  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedViolationId, setSelectedViolationId] = useState<Id<"hoaViolations"> | null>(null);
  const getPropertyName = (id: Id<"properties">) => properties.find((p) => p._id === id)?.name || "";

  // === VIOLATIONS ===
  const [vForm, setVForm] = useState({ propertyId: "", unit: "", residentName: "", type: "noise" as const, description: "", fineAmount: "" });
  const handleCreateViolation = async () => {
    if (!vForm.propertyId || !vForm.unit || !vForm.residentName || !vForm.description) { toast.error("Fill required fields"); return; }
    await createViolation({
      propertyId: vForm.propertyId as Id<"properties">, unit: vForm.unit, residentName: vForm.residentName,
      type: vForm.type, description: vForm.description, fineAmount: vForm.fineAmount ? parseFloat(vForm.fineAmount) : undefined,
    });
    toast.success("Violation reported"); setActiveDialog(null);
  };

  const [noticeForm, setNoticeForm] = useState({
    template: "courtesy_warning" as ViolationNoticeTemplate,
    deliveryMethod: "email" as const,
    subject: "Courtesy Warning",
    message: "This is a courtesy notice regarding a reported HOA violation. Please review and correct the issue promptly.",
  });
  const handleSendViolationNotice = async () => {
    if (!selectedViolationId || !noticeForm.subject || !noticeForm.message) {
      toast.error("Fill required fields");
      return;
    }
    await sendViolationNotice({
      id: selectedViolationId,
      template: noticeForm.template,
      deliveryMethod: noticeForm.deliveryMethod,
      subject: noticeForm.subject,
      message: noticeForm.message,
    });
    toast.success("Violation notice logged");
    setActiveDialog(null);
    setSelectedViolationId(null);
  };

  // === DUES ===
  const [dForm, setDForm] = useState({ propertyId: "", unit: "", residentName: "", amount: "", dueDate: "", period: "" });
  const handleCreateDue = async () => {
    if (!dForm.propertyId || !dForm.unit || !dForm.residentName || !dForm.amount) { toast.error("Fill required fields"); return; }
    await createDue({
      propertyId: dForm.propertyId as Id<"properties">, unit: dForm.unit, residentName: dForm.residentName,
      amount: parseFloat(dForm.amount), dueDate: dForm.dueDate, period: dForm.period,
    });
    toast.success("Due created"); setActiveDialog(null);
  };

  // === VOTES ===
  const [votForm, setVotForm] = useState({ propertyId: "", title: "", description: "", options: "Yes, No", deadline: "" });
  const handleCreateVote = async () => {
    if (!votForm.propertyId || !votForm.title) { toast.error("Fill required fields"); return; }
    await createVoteMut({
      propertyId: votForm.propertyId as Id<"properties">, title: votForm.title, description: votForm.description,
      options: votForm.options.split(",").map((o) => o.trim()).filter(Boolean), deadline: votForm.deadline,
    });
    toast.success("Vote created"); setActiveDialog(null);
  };

  // === MEETINGS ===
  const [meetingForm, setMeetingForm] = useState({
    propertyId: "",
    title: "",
    description: "",
    scheduledDate: "",
    scheduledTime: "",
    location: "",
    agenda: "Budget review, Vendor updates",
  });
  const handleCreateMeeting = async () => {
    if (!meetingForm.propertyId || !meetingForm.title || !meetingForm.scheduledDate) {
      toast.error("Fill required fields");
      return;
    }
    await createMeetingMut({
      propertyId: meetingForm.propertyId as Id<"properties">,
      title: meetingForm.title,
      description: meetingForm.description || undefined,
      scheduledDate: meetingForm.scheduledDate,
      scheduledTime: meetingForm.scheduledTime || undefined,
      location: meetingForm.location || undefined,
      agenda: meetingForm.agenda.split(",").map((item) => item.trim()).filter(Boolean),
    });
    toast.success("Meeting scheduled");
    setActiveDialog(null);
  };

  // === ARC ===
  const [arcForm, setArcForm] = useState({ propertyId: "", unit: "", residentName: "", requestType: "exterior_modification" as const, description: "" });
  const handleCreateArc = async () => {
    if (!arcForm.propertyId || !arcForm.unit || !arcForm.residentName || !arcForm.description) { toast.error("Fill required fields"); return; }
    await createArcReq({
      propertyId: arcForm.propertyId as Id<"properties">, unit: arcForm.unit,
      residentName: arcForm.residentName, requestType: arcForm.requestType, description: arcForm.description,
    });
    toast.success("ARC request submitted"); setActiveDialog(null);
  };

  // === MESSAGES ===
  const [msgForm, setMsgForm] = useState({ propertyId: "", title: "", message: "", type: "announcement" as const, priority: "medium" as const });
  const handleSendMsg = async () => {
    if (!msgForm.propertyId || !msgForm.title || !msgForm.message) { toast.error("Fill required fields"); return; }
    await sendMsg({
      propertyId: msgForm.propertyId as Id<"properties">, title: msgForm.title,
      message: msgForm.message, type: msgForm.type, priority: msgForm.priority,
    });
    toast.success("Message sent"); setActiveDialog(null);
  };

  const violationStatusColors: Record<string, string> = {
    reported: "bg-amber-100 text-amber-700", warning_sent: "bg-blue-100 text-blue-700",
    fine_issued: "bg-red-100 text-red-700", resolved: "bg-green-100 text-green-700", escalated: "bg-purple-100 text-purple-700",
  };

  const dueStatusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700", waived: "bg-gray-100 text-gray-600",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600", medium: "bg-blue-100 text-blue-700",
    high: "bg-amber-100 text-amber-700", urgent: "bg-red-100 text-red-700",
  };

  const PropertySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
      <SelectContent>{properties.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HOA Management</h1>
        <p className="text-muted-foreground">Violations, dues collection, board voting, ARC requests & resident messaging</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Violations", value: violations.filter((v) => v.status !== "resolved").length, icon: AlertTriangle, color: "text-red-500" },
          { label: "Pending Dues", value: dues.filter((d) => d.status === "pending" || d.status === "overdue").length, icon: BadgeDollarSign, color: "text-amber-500" },
          { label: "Active Votes", value: votes.filter((v) => v.status === "open").length, icon: Vote, color: "text-blue-500" },
          { label: "Meetings", value: meetings.filter((m) => m.status !== "cancelled").length, icon: CalendarDays, color: "text-sky-500" },
          { label: "ARC Requests", value: arcRequests.filter((r) => r.status === "submitted" || r.status === "under_review").length, icon: FileText, color: "text-purple-500" },
          { label: "Messages", value: messages.length, icon: MessageSquare, color: "text-teal" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <s.icon className={`size-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="violations">
        <TabsList className="flex-wrap">
          <TabsTrigger value="violations"><AlertTriangle className="size-3" /> Violations</TabsTrigger>
          <TabsTrigger value="dues"><BadgeDollarSign className="size-3" /> Dues</TabsTrigger>
          <TabsTrigger value="votes"><Vote className="size-3" /> Voting</TabsTrigger>
          <TabsTrigger value="meetings"><CalendarDays className="size-3" /> Meetings</TabsTrigger>
          <TabsTrigger value="arc"><FileText className="size-3" /> ARC</TabsTrigger>
          <TabsTrigger value="messages"><Megaphone className="size-3" /> Messages</TabsTrigger>
          <TabsTrigger value="reserves"><Landmark className="size-3" /> Reserve Funds</TabsTrigger>
        </TabsList>

        {/* VIOLATIONS */}
        <TabsContent value="violations" className="mt-4 space-y-3">
          <Button onClick={() => setActiveDialog("violation")} className="bg-teal text-white hover:bg-teal/90" size="sm"><Plus className="size-4" /> Report Violation</Button>
          {violations.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No violations reported</CardContent></Card>
          ) : violations.map((v) => (
            <Card key={v._id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{v.residentName} — Unit {v.unit}</p>
                  <p className="text-sm text-muted-foreground">{getPropertyName(v.propertyId)} · {v.type} · {v.reportedDate}</p>
                  <p className="text-sm">{v.description}</p>
                  {v.fineAmount != null && <p className="text-sm font-medium text-red-600">Fine: ${v.fineAmount}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={violationStatusColors[v.status]}>{v.status.replace("_", " ")}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedViolationId(v._id);
                      setNoticeForm({
                        template: "courtesy_warning",
                        deliveryMethod: "email",
                        subject: `HOA Notice for Unit ${v.unit}`,
                        message: `Hello ${v.residentName},\n\nThis notice concerns a ${v.type.replace(/_/g, " ")} violation reported for unit ${v.unit}. Please review the issue and respond or correct it as soon as possible.\n\nDetails: ${v.description}`,
                      });
                      setActiveDialog("violationNotice");
                    }}
                  >
                    Send Notice
                  </Button>
                  <Select value={v.status} onValueChange={(s: any) => updateViolation({ id: v._id, status: s }).then(() => toast.success("Updated"))}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["reported", "warning_sent", "fine_issued", "resolved", "escalated"].map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {v.noticeHistory && v.noticeHistory.length > 0 && (
                  <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Notice History</p>
                    <div className="space-y-2">
                      {v.noticeHistory.slice().reverse().map((notice, index) => (
                        <div key={`${notice.sentAt}-${index}`} className="rounded-md bg-background p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{notice.template.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground">{new Date(notice.sentAt).toLocaleString()} · {notice.deliveryMethod}</span>
                          </div>
                          <p className="mt-1 font-medium">{notice.subject}</p>
                          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{notice.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* DUES */}
        <TabsContent value="dues" className="mt-4 space-y-3">
          <Button onClick={() => setActiveDialog("due")} className="bg-teal text-white hover:bg-teal/90" size="sm"><Plus className="size-4" /> Create Due</Button>
          {dueSummary && (
            <div className="grid gap-3 md:grid-cols-4">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-600">${(dueSummary.totalPending / 100).toLocaleString()}</p><p className="text-xs text-muted-foreground">{dueSummary.pendingCount} invoice(s)</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-bold text-red-600">${(dueSummary.totalOverdue / 100).toLocaleString()}</p><p className="text-xs text-muted-foreground">{dueSummary.overdueCount} account(s)</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Collected</p><p className="text-xl font-bold text-green-600">${(dueSummary.totalCollected / 100).toLocaleString()}</p><p className="text-xs text-muted-foreground">{dueSummary.collectedCount} payment(s)</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Collection Rate</p><p className="text-xl font-bold text-blue-600">{dueSummary.totalCollected + dueSummary.totalPending + dueSummary.totalOverdue > 0 ? Math.round((dueSummary.totalCollected / (dueSummary.totalCollected + dueSummary.totalPending + dueSummary.totalOverdue)) * 100) : 0}%</p><p className="text-xs text-muted-foreground">paid vs open balances</p></CardContent></Card>
            </div>
          )}
          {dueSummary && dueSummary.overdueByProperty.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-medium">Overdue by Property</p>
                  <p className="text-xs text-muted-foreground">Identify communities with the highest outstanding HOA balances</p>
                </div>
                <div className="space-y-2">
                  {dueSummary.overdueByProperty.slice(0, 5).map((item) => (
                    <div key={item.propertyId} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{getPropertyName(item.propertyId as Id<"properties">)}</p>
                        <p className="text-xs text-muted-foreground">{item.overdueCount} overdue account(s)</p>
                      </div>
                      <p className="text-sm font-semibold text-red-600">${(item.overdueAmount / 100).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {dues.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No dues created</CardContent></Card>
          ) : dues.map((d) => (
            <Card key={d._id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{d.residentName} — Unit {d.unit}</p>
                  <p className="text-sm text-muted-foreground">{getPropertyName(d.propertyId)} · Period: {d.period} · Due: {d.dueDate}</p>
                  <p className="text-lg font-bold">${d.amount}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={dueStatusColors[d.status]}>{d.status}</Badge>
                  {d.status !== "paid" && (
                    <Button size="sm" variant="outline" onClick={() => updateDue({ id: d._id, status: "paid", paidDate: new Date().toISOString().split("T")[0] }).then(() => toast.success("Marked paid"))}>Mark Paid</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* VOTING */}
        <TabsContent value="votes" className="mt-4 space-y-3">
          <Button onClick={() => setActiveDialog("vote")} className="bg-teal text-white hover:bg-teal/90" size="sm"><Plus className="size-4" /> Create Vote</Button>
          {votes.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No votes created</CardContent></Card>
          ) : votes.map((v) => (
            <Card key={v._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{v.title}</p>
                    <p className="text-sm text-muted-foreground">{getPropertyName(v.propertyId)} · Deadline: {v.deadline}</p>
                    <p className="text-sm">{v.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={v.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{v.status}</Badge>
                    {v.status === "open" && <Button size="sm" variant="outline" onClick={() => closeVoteMut({ id: v._id }).then(() => toast.success("Closed"))}>Close Voting</Button>}
                  </div>
                </div>
                {/* Results */}
                <div className="space-y-2">
                  {v.options.map((opt) => {
                    const count = v.votes.filter((vote) => vote.option === opt).length;
                    const total = v.votes.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={opt}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{opt}</span>
                          <span className="text-muted-foreground">{count} votes ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-teal rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground">{v.votes.length} total votes</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* MEETINGS */}
        <TabsContent value="meetings" className="mt-4 space-y-3">
          <Button onClick={() => setActiveDialog("meeting")} className="bg-teal text-white hover:bg-teal/90" size="sm"><Plus className="size-4" /> Schedule Meeting</Button>
          {meetings.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No board meetings scheduled</CardContent></Card>
          ) : meetings.map((meeting) => {
            const meetingStatusColors: Record<string, string> = {
              scheduled: "bg-blue-100 text-blue-700",
              in_progress: "bg-amber-100 text-amber-700",
              completed: "bg-green-100 text-green-700",
              cancelled: "bg-gray-100 text-gray-600",
            };

            return (
              <Card key={meeting._id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">{getPropertyName(meeting.propertyId)} · {meeting.scheduledDate}{meeting.scheduledTime ? ` at ${meeting.scheduledTime}` : ""}{meeting.location ? ` · ${meeting.location}` : ""}</p>
                      {meeting.description && <p className="text-sm mt-1">{meeting.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={meetingStatusColors[meeting.status]}>{meeting.status.replace("_", " ")}</Badge>
                      <Select value={meeting.status} onValueChange={(status: any) => updateMeetingMut({ id: meeting._id, status }).then(() => toast.success("Meeting updated"))}>
                        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[
                            "scheduled",
                            "in_progress",
                            "completed",
                            "cancelled",
                          ].map((status) => (
                            <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Agenda</p>
                    <div className="flex flex-wrap gap-2">
                      {meeting.agenda.map((item) => (
                        <Badge key={item} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Attendees</Label>
                      <Input
                        type="number"
                        defaultValue={meeting.attendeeCount ?? ""}
                        placeholder="0"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (!value) return;
                          updateMeetingMut({ id: meeting._id, attendeeCount: Number(value) }).then(() => toast.success("Attendees updated"));
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Follow-up Actions</Label>
                      <Input
                        defaultValue={meeting.followUpActions?.join(", ") ?? ""}
                        placeholder="Assign landscaping bid, Draft resident notice"
                        onBlur={(e) => updateMeetingMut({
                          id: meeting._id,
                          followUpActions: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                        }).then(() => toast.success("Actions updated"))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Meeting Minutes</Label>
                    <Textarea
                      defaultValue={meeting.minutes ?? ""}
                      placeholder="Summarize decisions, motions, vendors, and next steps"
                      rows={3}
                      onBlur={(e) => updateMeetingMut({ id: meeting._id, minutes: e.target.value || undefined }).then(() => toast.success("Minutes saved"))}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ARC REQUESTS */}
        <TabsContent value="arc" className="mt-4 space-y-3">
          <Button onClick={() => setActiveDialog("arc")} className="bg-teal text-white hover:bg-teal/90" size="sm"><Plus className="size-4" /> Submit Request</Button>
          {arcRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No ARC requests</CardContent></Card>
          ) : arcRequests.map((r) => {
            const arcColors: Record<string, string> = {
              submitted: "bg-amber-100 text-amber-700", under_review: "bg-blue-100 text-blue-700",
              approved: "bg-green-100 text-green-700", denied: "bg-red-100 text-red-700", completed: "bg-gray-100 text-gray-600",
            };
            return (
              <Card key={r._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.residentName} — Unit {r.unit}</p>
                    <p className="text-sm text-muted-foreground">{getPropertyName(r.propertyId)} · {r.requestType.replace(/_/g, " ")} · {r.submittedDate}</p>
                    <p className="text-sm">{r.description}</p>
                    {r.reviewNotes && <p className="text-sm text-blue-600">Review: {r.reviewNotes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={arcColors[r.status]}>{r.status.replace("_", " ")}</Badge>
                    {(r.status === "submitted" || r.status === "under_review") && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateArcReq({ id: r._id, status: "approved" }).then(() => toast.success("Approved"))}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateArcReq({ id: r._id, status: "denied" }).then(() => toast.success("Denied"))}>Deny</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* MESSAGES */}
        <TabsContent value="messages" className="mt-4 space-y-3">
          <Button onClick={() => setActiveDialog("message")} className="bg-teal text-white hover:bg-teal/90" size="sm"><Plus className="size-4" /> Send Message</Button>
          {messages.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No messages sent</CardContent></Card>
          ) : messages.map((m) => (
            <Card key={m._id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Megaphone className="size-4 text-teal" />
                    <p className="font-medium">{m.title}</p>
                    <Badge className={priorityColors[m.priority]}>{m.priority}</Badge>
                    <Badge variant="outline">{m.type.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm">{m.message}</p>
                  <p className="text-xs text-muted-foreground">{getPropertyName(m.propertyId)} · {new Date(m.sentAt).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeMsg({ id: m._id }).then(() => toast.success("Deleted"))}>×</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Reserve Funds Tab */}
        <TabsContent value="reserves" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-700">${((reserveStats?.totalCurrent ?? 0) / 100).toLocaleString()}</p>
                <p className="text-xs text-blue-600">Total Funded</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-700">${((reserveStats?.totalTarget ?? 0) / 100).toLocaleString()}</p>
                <p className="text-xs text-green-600">Total Target</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-lg font-bold text-purple-700">{reserveStats?.fundedCount ?? 0}/{reserveStats?.totalFunds ?? 0}</p>
                <p className="text-xs text-purple-600">Fully Funded</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setActiveDialog("reserve")}><PlusCircle className="size-3 mr-1" /> New Fund</Button>
          </div>
          {reserveFunds.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <Landmark className="size-8 mx-auto mb-2 opacity-30" />
              <p>No reserve funds created yet</p>
            </CardContent></Card>
          ) : reserveFunds.map((fund) => {
            const pct = fund.targetAmount > 0 ? Math.round((fund.currentAmount / fund.targetAmount) * 100) : 0;
            return (
              <Card key={fund._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Landmark className="size-4 text-blue-600" />
                      <span className="font-medium">{fund.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{fund.category}</Badge>
                      <Badge variant={fund.status === "funded" ? "default" : fund.status === "active" ? "secondary" : "destructive"} className="text-xs">{fund.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        const amtStr = prompt("Enter contribution amount ($):");
                        if (!amtStr) return;
                        const amt = parseFloat(amtStr) * 100;
                        if (isNaN(amt) || amt <= 0) { toast.error("Invalid amount"); return; }
                        try {
                          await addContribution({ id: fund._id, amount: amt });
                          toast.success("Contribution added");
                        } catch (e: any) { toast.error(e.message); }
                      }}>+ Contribute</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeReserveFund({ id: fund._id }).then(() => toast.success("Fund deleted"))}>×</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{pct}% — ${(fund.currentAmount / 100).toLocaleString()} / ${(fund.targetAmount / 100).toLocaleString()}</span>
                  </div>
                  {fund.description && <p className="text-xs text-muted-foreground mt-2">{fund.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{getPropertyName(fund.propertyId)}{fund.lastContribution ? ` · Last contribution: ${fund.lastContribution}` : ""}</p>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* === DIALOGS === */}
      {/* Violation */}
      <Dialog open={activeDialog === "violation"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Report Violation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Property *</Label><PropertySelect value={vForm.propertyId} onChange={(v) => setVForm({ ...vForm, propertyId: v })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit *</Label><Input value={vForm.unit} onChange={(e) => setVForm({ ...vForm, unit: e.target.value })} /></div>
              <div><Label>Resident *</Label><Input value={vForm.residentName} onChange={(e) => setVForm({ ...vForm, residentName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={vForm.type} onValueChange={(v: any) => setVForm({ ...vForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["noise", "parking", "maintenance", "pet", "trash", "unauthorized_modification", "other"].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fine Amount ($)</Label><Input type="number" value={vForm.fineAmount} onChange={(e) => setVForm({ ...vForm, fineAmount: e.target.value })} /></div>
            </div>
            <div><Label>Description *</Label><Textarea value={vForm.description} onChange={(e) => setVForm({ ...vForm, description: e.target.value })} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button onClick={handleCreateViolation} className="bg-teal text-white hover:bg-teal/90">Report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Violation Notice */}
      <Dialog open={activeDialog === "violationNotice"} onOpenChange={() => { setActiveDialog(null); setSelectedViolationId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send HOA Violation Notice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Template</Label>
                <Select value={noticeForm.template} onValueChange={(value: ViolationNoticeTemplate) => {
                  setNoticeForm({
                    ...noticeForm,
                    template: value,
                    subject: violationNoticeTemplateDefaults[value].subject,
                    message: violationNoticeTemplateDefaults[value].message,
                  });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[
                      "courtesy_warning",
                      "fine_notice",
                      "hearing_notice",
                      "final_notice",
                    ].map((template) => <SelectItem key={template} value={template}>{template.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Delivery</Label>
                <Select value={noticeForm.deliveryMethod} onValueChange={(value: any) => setNoticeForm({ ...noticeForm, deliveryMethod: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["email", "letter", "portal"].map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Subject</Label><Input value={noticeForm.subject} onChange={(e) => setNoticeForm({ ...noticeForm, subject: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={6} value={noticeForm.message} onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setActiveDialog(null); setSelectedViolationId(null); }}>Cancel</Button>
              <Button onClick={handleSendViolationNotice} className="bg-teal text-white hover:bg-teal/90">Log Notice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Due */}
      <Dialog open={activeDialog === "due"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Due</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Property *</Label><PropertySelect value={dForm.propertyId} onChange={(v) => setDForm({ ...dForm, propertyId: v })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit *</Label><Input value={dForm.unit} onChange={(e) => setDForm({ ...dForm, unit: e.target.value })} /></div>
              <div><Label>Resident *</Label><Input value={dForm.residentName} onChange={(e) => setDForm({ ...dForm, residentName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Amount ($) *</Label><Input type="number" value={dForm.amount} onChange={(e) => setDForm({ ...dForm, amount: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={dForm.dueDate} onChange={(e) => setDForm({ ...dForm, dueDate: e.target.value })} /></div>
              <div><Label>Period</Label><Input value={dForm.period} onChange={(e) => setDForm({ ...dForm, period: e.target.value })} placeholder="2026-Q2" /></div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button onClick={handleCreateDue} className="bg-teal text-white hover:bg-teal/90">Create Due</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vote */}
      <Dialog open={activeDialog === "vote"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Board Vote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Property *</Label><PropertySelect value={votForm.propertyId} onChange={(v) => setVotForm({ ...votForm, propertyId: v })} /></div>
            <div><Label>Title *</Label><Input value={votForm.title} onChange={(e) => setVotForm({ ...votForm, title: e.target.value })} placeholder="Pool renovation budget" /></div>
            <div><Label>Description</Label><Textarea value={votForm.description} onChange={(e) => setVotForm({ ...votForm, description: e.target.value })} /></div>
            <div><Label>Options (comma-separated)</Label><Input value={votForm.options} onChange={(e) => setVotForm({ ...votForm, options: e.target.value })} /></div>
            <div><Label>Deadline</Label><Input type="date" value={votForm.deadline} onChange={(e) => setVotForm({ ...votForm, deadline: e.target.value })} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button onClick={handleCreateVote} className="bg-teal text-white hover:bg-teal/90">Create Vote</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting */}
      <Dialog open={activeDialog === "meeting"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Board Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Property *</Label><PropertySelect value={meetingForm.propertyId} onChange={(v) => setMeetingForm({ ...meetingForm, propertyId: v })} /></div>
            <div><Label>Meeting Title *</Label><Input value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} placeholder="Quarterly board review" /></div>
            <div><Label>Description</Label><Textarea value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date *</Label><Input type="date" value={meetingForm.scheduledDate} onChange={(e) => setMeetingForm({ ...meetingForm, scheduledDate: e.target.value })} /></div>
              <div><Label>Time</Label><Input type="time" value={meetingForm.scheduledTime} onChange={(e) => setMeetingForm({ ...meetingForm, scheduledTime: e.target.value })} /></div>
            </div>
            <div><Label>Location</Label><Input value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} placeholder="Clubhouse conference room" /></div>
            <div><Label>Agenda Items</Label><Input value={meetingForm.agenda} onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })} placeholder="Budget review, Vendor selection, Resident appeals" /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button onClick={handleCreateMeeting} className="bg-teal text-white hover:bg-teal/90">Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ARC Request */}
      <Dialog open={activeDialog === "arc"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit ARC Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Property *</Label><PropertySelect value={arcForm.propertyId} onChange={(v) => setArcForm({ ...arcForm, propertyId: v })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit *</Label><Input value={arcForm.unit} onChange={(e) => setArcForm({ ...arcForm, unit: e.target.value })} /></div>
              <div><Label>Resident *</Label><Input value={arcForm.residentName} onChange={(e) => setArcForm({ ...arcForm, residentName: e.target.value })} /></div>
            </div>
            <div><Label>Type</Label>
              <Select value={arcForm.requestType} onValueChange={(v: any) => setArcForm({ ...arcForm, requestType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["exterior_modification", "landscaping", "fence", "paint", "addition", "other"].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description *</Label><Textarea value={arcForm.description} onChange={(e) => setArcForm({ ...arcForm, description: e.target.value })} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button onClick={handleCreateArc} className="bg-teal text-white hover:bg-teal/90">Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message */}
      <Dialog open={activeDialog === "message"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Resident Message</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Property *</Label><PropertySelect value={msgForm.propertyId} onChange={(v) => setMsgForm({ ...msgForm, propertyId: v })} /></div>
            <div><Label>Title *</Label><Input value={msgForm.title} onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={msgForm.type} onValueChange={(v: any) => setMsgForm({ ...msgForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["announcement", "alert", "maintenance_notice", "event", "general"].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={msgForm.priority} onValueChange={(v: any) => setMsgForm({ ...msgForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low", "medium", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Message *</Label><Textarea value={msgForm.message} onChange={(e) => setMsgForm({ ...msgForm, message: e.target.value })} rows={4} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button onClick={handleSendMsg} className="bg-teal text-white hover:bg-teal/90"><Megaphone className="size-4" /> Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reserve Fund Dialog */}
      <Dialog open={activeDialog === "reserve"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Reserve Fund</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Property *</Label>
              <Select onValueChange={(v) => (document.getElementById("rf-prop") as any).__val = v}>
                <SelectTrigger id="rf-prop"><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Fund Name *</Label><Input id="rf-name" placeholder="e.g. Roof Replacement 2027" /></div>
            <div><Label>Category</Label>
              <Select defaultValue="general" onValueChange={(v) => (document.getElementById("rf-cat") as any).__val = v}>
                <SelectTrigger id="rf-cat"><SelectValue /></SelectTrigger>
                <SelectContent>{["roof","elevator","hvac","parking","landscaping","pool","general","emergency","other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target Amount ($)</Label><Input id="rf-target" type="number" placeholder="50000" /></div>
              <div><Label>Current Amount ($)</Label><Input id="rf-current" type="number" placeholder="0" /></div>
            </div>
            <div><Label>Description</Label><Textarea id="rf-desc" rows={2} /></div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button onClick={async () => {
                const propEl = document.getElementById("rf-prop") as any;
                const propId = propEl?.__val;
                const name = (document.getElementById("rf-name") as HTMLInputElement).value;
                const target = parseFloat((document.getElementById("rf-target") as HTMLInputElement).value || "0") * 100;
                const current = parseFloat((document.getElementById("rf-current") as HTMLInputElement).value || "0") * 100;
                const desc = (document.getElementById("rf-desc") as HTMLTextAreaElement).value;
                const catEl = document.getElementById("rf-cat") as any;
                const cat = catEl?.__val || "general";
                if (!propId || !name || target <= 0) { toast.error("Fill required fields"); return; }
                try {
                  await createReserveFund({ propertyId: propId, name, targetAmount: target, currentAmount: current, category: cat, description: desc || undefined });
                  toast.success("Reserve fund created");
                  setActiveDialog(null);
                } catch (e: any) { toast.error(e.message); }
              }}>Create Fund</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function HoaPage() {
  return (
    <FeatureGate feature="hoa">
      <HoaPageInner />
    </FeatureGate>
  );
}
