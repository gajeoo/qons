import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle, Bot, Calendar, ChevronLeft, ChevronRight, Clock,
  Loader2, Plus, Sparkles, Trash2, X, Zap,
} from "lucide-react";
import { ChatWidget } from "@/components/ChatWidget";
import { FeatureGate } from "@/components/FeatureGate";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import type { Id } from "../../convex/_generated/dataModel";

export function SchedulePage() {
  const user = useQuery(api.auth.currentUser);
  const { isWorker, isSubAccount } = useFeatureAccess();

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Calculate week range
  const dateObj = new Date(`${currentDate}T12:00:00`);
  const dayOfWeek = dateObj.getDay();
  const weekStart = new Date(dateObj);
  weekStart.setDate(dateObj.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const startStr = weekStart.toISOString().split("T")[0];
  const endStr = weekEnd.toISOString().split("T")[0];

  const shifts = useQuery(api.shifts.list, viewMode === "week" ? { startDate: startStr, endDate: endStr } : { startDate: currentDate, endDate: currentDate }) || [];
  const stats = useQuery(api.shifts.getStats);
  const properties = useQuery(api.properties.list) || [];
  const staffList = useQuery(api.staffMembers.list) || [];
  const createShift = useMutation(api.shifts.create);
  const updateShift = useMutation(api.shifts.update);
  const removeShift = useMutation(api.shifts.remove);
  const aiSchedule = useMutation(api.shifts.aiSchedule);
  const findCoverage = useMutation(api.shifts.findCoverage);

  const [form, setForm] = useState({ propertyId: "", staffId: "", date: currentDate, startTime: "09:00", endTime: "17:00", shiftType: "regular" as const, notes: "" });

  const navigate = (dir: number) => {
    const d = new Date(`${currentDate}T12:00:00`);
    d.setDate(d.getDate() + (viewMode === "week" ? dir * 7 : dir));
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const handleCreate = async () => {
    if (!form.propertyId) { toast.error("Select a property"); return; }
    try {
      await createShift({
        propertyId: form.propertyId as Id<"properties">,
        staffId: form.staffId ? form.staffId as Id<"staff"> : undefined,
        date: form.date, startTime: form.startTime, endTime: form.endTime,
        shiftType: form.shiftType, notes: form.notes || undefined,
      });
      toast.success("Shift created");
      setShowForm(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAiSchedule = async () => {
    setAiLoading(true);
    try {
      const result = await aiSchedule({ date: currentDate });
      toast.success(result.message);
    } catch (e: any) { toast.error(e.message); }
    setAiLoading(false);
  };

  const handleFindCoverage = async (shiftId: Id<"shifts">) => {
    try {
      const result = await findCoverage({ shiftId });
      if (result.success) toast.success(`Coverage found: ${result.assignedTo}`);
      else toast.error(result.message);
    } catch (e: any) { toast.error(e.message); }
  };

  const statusColor: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700", open: "bg-amber-100 text-amber-700",
    in_progress: "bg-green-100 text-green-700", completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700", no_show: "bg-red-100 text-red-700",
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return { date: d.toISOString().split("T")[0], label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), isToday: d.toISOString().split("T")[0] === new Date().toISOString().split("T")[0] };
  });

  const getPropertyName = (id: Id<"properties">) => properties.find((p) => p._id === id)?.name || "Unknown";
  const getStaffName = (id?: Id<"staff">) => id ? staffList.find((s) => s._id === id)?.name || "Unknown" : null;

  return (
    <FeatureGate feature="schedule">
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isWorker ? "My Shifts" : "Shift Calendar"}
          </h1>
          <p className="text-muted-foreground">
            {isWorker ? "View your assigned shifts" : "Schedule and manage shifts across all properties"}
          </p>
        </div>
        {/* Workers cannot create shifts or use AI scheduling */}
        {!isWorker && (
          <div className="flex gap-2">
            <Button onClick={handleAiSchedule} variant="outline" disabled={aiLoading}>
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} AI Auto-Schedule
            </Button>
            <Button onClick={() => { setForm({ ...form, date: currentDate }); setShowForm(true); }} className="bg-teal text-white hover:bg-teal/90">
              <Plus className="size-4" /> New Shift
            </Button>
          </div>
        )}
      </div>

      {!isWorker && !isSubAccount && user?._id && (
        <Card className="overflow-hidden border-sky-200/70 bg-gradient-to-br from-sky-50/80 via-background to-blue-50/50">
          <CardContent className="p-4">
            <ChatWidget
              layout="embedded"
              source="dashboard"
              title="Scheduling Assistant"
              subtitle="Ask for coverage plans, staffing ideas, and scheduling guidance"
              inputPlaceholder="Ask about coverage gaps, shift planning, staffing balance..."
              visitorId={`user_${user._id}`}
              visitorName={user.name ?? undefined}
              visitorEmail={user.email ?? undefined}
              metadata={JSON.stringify({ page: "schedule" })}
              suggestedPrompts={[
                "Create task: Review next week's open shifts",
                "Help me plan next week's coverage",
                "How do I fill open shifts faster?",
                "Suggest a schedule for a busy property",
                "What should I check before auto-scheduling?",
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: isWorker ? "My Shifts" : "Total Shifts", value: stats?.total ?? 0, icon: Calendar },
          { label: "Scheduled", value: stats?.scheduled ?? 0, icon: Clock },
          { label: isWorker ? "In Progress" : "Open (Unfilled)", value: isWorker ? (stats as any)?.inProgress ?? 0 : stats?.open ?? 0, icon: AlertTriangle },
          { label: "Completed", value: stats?.completed ?? 0, icon: Calendar },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal/10 p-2"><s.icon className="size-4 text-teal" /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date().toISOString().split("T")[0])}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}><ChevronRight className="size-4" /></Button>
          <span className="font-medium ml-2">
            {viewMode === "week" ? `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : new Date(`${currentDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant={viewMode === "day" ? "default" : "outline"} size="sm" onClick={() => setViewMode("day")}>Day</Button>
          <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>Week</Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === "week" ? (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayShifts = shifts.filter((s) => s.date === day.date);
            return (
              <div key={day.date} className={`min-h-[200px] border rounded-lg p-2 ${day.isToday ? "border-teal bg-teal/5" : ""}`}>
                <p className={`text-xs font-medium mb-2 ${day.isToday ? "text-teal" : "text-muted-foreground"}`}>{day.label}</p>
                <div className="space-y-1.5">
                  {dayShifts.map((s) => (
                    <div key={s._id} className={`text-[11px] p-1.5 rounded ${isWorker ? "" : "cursor-pointer hover:opacity-80"} ${s.aiAssigned ? "border-l-2 border-teal" : ""} ${statusColor[s.status]?.replace("text-", "").includes("amber") ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"}`}>
                      {isWorker ? (
                        /* Workers: read-only view */
                        <div>
                          <p className="font-medium truncate">{getPropertyName(s.propertyId)}</p>
                          <p className="text-[10px] opacity-70">{s.startTime} - {s.endTime}</p>
                          <Badge className={`text-[9px] mt-0.5 ${statusColor[s.status]}`}>{s.status.replace("_", " ")}</Badge>
                        </div>
                      ) : (
                        /* Owners/Managers: full controls */
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full text-left">
                            <p className="font-medium truncate">{getPropertyName(s.propertyId)}</p>
                            <p className="text-[10px] opacity-70">{s.startTime} - {s.endTime}</p>
                            {s.staffId ? <p className="text-[10px] truncate">{getStaffName(s.staffId)}</p> : <p className="text-[10px] text-amber-600 font-medium">⚠ Open</p>}
                            {s.aiAssigned && <Bot className="size-2.5 inline text-teal" />}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {s.status === "open" && <DropdownMenuItem onClick={() => handleFindCoverage(s._id)}><Zap className="size-4" /> Find Coverage</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => updateShift({ id: s._id, status: "cancelled" })}><X className="size-4" /> Cancel</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => removeShift({ id: s._id })} className="text-destructive"><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Calendar className="size-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {isWorker ? "No shifts assigned to you for this day" : "No shifts scheduled for this day"}
              </p>
            </CardContent></Card>
          ) : shifts.map((s) => (
            <Card key={s._id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-bold text-lg">{s.startTime}</p>
                    <p className="text-xs text-muted-foreground">to {s.endTime}</p>
                  </div>
                  <div>
                    <p className="font-medium">{getPropertyName(s.propertyId)}</p>
                    {!isWorker && <p className="text-sm text-muted-foreground">{getStaffName(s.staffId) || "Unassigned"}</p>}
                  </div>
                  <Badge className={statusColor[s.status]}>{s.status.replace("_", " ")}</Badge>
                  {s.aiAssigned && <Badge variant="outline" className="text-teal border-teal"><Bot className="size-3" /> AI</Badge>}
                </div>
                {/* Workers: no action buttons */}
                {!isWorker && (
                  <div className="flex gap-2">
                    {s.status === "open" && <Button size="sm" variant="outline" onClick={() => handleFindCoverage(s._id)}><Zap className="size-3" /> Cover</Button>}
                    <Button size="sm" variant="ghost" onClick={() => removeShift({ id: s._id })}><Trash2 className="size-3" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Form — only for non-workers */}
      {!isWorker && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Shift</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Property *</Label>
                <Select value={form.propertyId} onValueChange={(v) => setForm({ ...form, propertyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>{properties.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Assign Staff (optional)</Label>
                <Select value={form.staffId || "__none__"} onValueChange={(v) => setForm({ ...form, staffId: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Leave open for AI" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned (open)</SelectItem>
                    {staffList.filter((s) => s.status === "active").map((s) => <SelectItem key={s._id} value={s._id}>{s.name} — {s.role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Time *</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                <div><Label>End Time *</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
              </div>
              <div><Label>Type</Label>
                <Select value={form.shiftType} onValueChange={(v: any) => setForm({ ...form, shiftType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleCreate} className="bg-teal text-white hover:bg-teal/90">Create Shift</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </FeatureGate>
  );
}
