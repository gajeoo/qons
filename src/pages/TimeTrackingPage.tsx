import { useMutation, useQuery } from "convex/react";
import { Clock, Loader2, LogIn, LogOut, MapPin, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import type { Id } from "../../convex/_generated/dataModel";

import { FeatureGate } from "@/components/FeatureGate";

function TimeTrackingPageInner() {
  const { isWorker, isSubAccount } = useFeatureAccess();

  const today = new Date();
  const defaultStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
  const [taxRateInput, setTaxRateInput] = useState("0");

  const periodStartTs = periodStart ? new Date(`${periodStart}T00:00:00`).getTime() : undefined;
  const periodEndTs = periodEnd ? new Date(`${periodEnd}T23:59:59`).getTime() : undefined;

  const timeEntries = useQuery(api.timeTracking.list, {}) || [];
  const activeEntries = useQuery(api.timeTracking.getActive) || [];
  const stats = useQuery(api.timeTracking.getStats, {});
  const timesheet = useQuery(api.timeTracking.getTimesheetSummary, { periodStart: periodStartTs, periodEnd: periodEndTs });
  const taxSettings = useQuery(api.payroll.getTaxSettings);
  const staffList = useQuery(api.staffMembers.list) || [];
  const properties = useQuery(api.properties.list) || [];
  const clockInMut = useMutation(api.timeTracking.clockIn);
  const clockOutMut = useMutation(api.timeTracking.clockOut);
  const approveMut = useMutation(api.timeTracking.approve);
  const setTaxSettingsMut = useMutation(api.payroll.setTaxSettings);

  const [showClockIn, setShowClockIn] = useState(false);
  const [clockInForm, setClockInForm] = useState({ staffId: "", propertyId: "" });
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (taxSettings) {
      setTaxRateInput(String(taxSettings.taxRate));
    }
  }, [taxSettings]);

  // For workers, try to find their linked staff record
  const user = useQuery(api.auth.currentUser);
  const workerStaffId = isWorker && user
    ? staffList.find((s) => s.linkedAccountUserId === user._id)?._id
    : undefined;

  const handleClockIn = async () => {
    const staffId = isWorker ? workerStaffId : clockInForm.staffId;
    const propertyId = clockInForm.propertyId;
    if (!staffId || !propertyId) { toast.error(isWorker ? "Select a property" : "Select staff and property"); return; }
    setLoading("clock-in");
    try {
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch {}
      await clockInMut({
        staffId: staffId as Id<"staff">,
        propertyId: propertyId as Id<"properties">,
        latitude: lat, longitude: lng,
      });
      toast.success("Clocked in successfully");
      setShowClockIn(false);
    } catch (e: any) { toast.error(e.message); }
    setLoading(null);
  };

  const handleClockOut = async (entryId: Id<"timeEntries">) => {
    setLoading(entryId);
    try {
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch {}
      await clockOutMut({ id: entryId, latitude: lat, longitude: lng });
      toast.success("Clocked out");
    } catch (e: any) { toast.error(e.message); }
    setLoading(null);
  };

  const getStaffName = (id: Id<"staff">) => staffList.find((s) => s._id === id)?.name || "Unknown";
  const getPropertyName = (id: Id<"properties">) => properties.find((p) => p._id === id)?.name || "Unknown";

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const statusColor: Record<string, string> = {
    clocked_in: "bg-green-100 text-green-700", clocked_out: "bg-blue-100 text-blue-700",
    approved: "bg-teal/10 text-teal", disputed: "bg-red-100 text-red-700",
  };

  const handleSaveTaxRate = async () => {
    const parsed = Number.parseFloat(taxRateInput);
    if (Number.isNaN(parsed)) {
      toast.error("Enter a valid tax percentage");
      return;
    }

    try {
      const result = await setTaxSettingsMut({ taxRate: parsed });
      setTaxRateInput(String(result.taxRate));
      toast.success("Payroll tax updated");
    } catch (e: any) {
      toast.error(e.message || "Unable to update payroll tax");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isWorker ? "My Time Records" : "Time Tracking"}
          </h1>
          <p className="text-muted-foreground">
            {isWorker ? "Clock in/out and view your time records" : "GPS-verified clock-in and time tracking"}
          </p>
        </div>
        <Button onClick={() => setShowClockIn(true)} className="bg-teal text-white hover:bg-teal/90">
          <LogIn className="size-4" /> Clock In
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Hours", value: stats?.totalHours ?? 0, icon: Timer },
          { label: "Active Now", value: stats?.activeNow ?? 0, icon: Clock },
          { label: "Entries", value: stats?.entries ?? 0, icon: LogIn },
          { label: "Avg Hours/Day", value: stats?.avgHoursPerDay ?? 0, icon: Clock },
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

      {!isWorker ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Auto Payroll Calculation</h2>
                <p className="text-xs text-muted-foreground">
                  Includes all owner + sub-account clock-outs using each staff member&apos;s hourly rate.
                </p>
              </div>
              <Badge className="bg-teal/10 text-teal">{timesheet?.staffCount ?? 0} staff</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs text-muted-foreground">Pay Period Start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pay Period End</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <Label className="text-xs text-muted-foreground">Payroll Tax (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={taxRateInput}
                    onChange={(e) => setTaxRateInput(e.target.value)}
                    disabled={!taxSettings?.canEdit || isSubAccount}
                  />
                  {taxSettings?.canEdit && !isSubAccount ? (
                    <Button variant="outline" onClick={handleSaveTaxRate}>Save</Button>
                  ) : (
                    <Badge variant="outline">Primary only</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-lg font-semibold">{timesheet?.totalHours ?? 0}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross Payroll</p>
                <p className="text-lg font-semibold">${(timesheet?.totalAmount ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tax ({timesheet?.taxRate ?? 0}%)</p>
                <p className="text-lg font-semibold">${(timesheet?.taxAmount ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total w/ Tax</p>
                <p className="text-lg font-semibold">${(timesheet?.totalWithTax ?? 0).toLocaleString()}</p>
              </div>
            </div>

            {timesheet?.staff?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2">Staff</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Regular</th>
                      <th className="py-2 text-right">OT</th>
                      <th className="py-2 text-right">Estimated Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheet.staff.slice(0, 12).map((row) => (
                      <tr key={row.staffId} className="border-b last:border-0">
                        <td className="py-2 font-medium">{row.staffName}</td>
                        <td className="py-2 text-right">${row.hourlyRate.toFixed(2)}/hr</td>
                        <td className="py-2 text-right">{row.regularHours}h</td>
                        <td className="py-2 text-right">{row.overtimeHours}h</td>
                        <td className="py-2 text-right font-semibold">${row.totalPay.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No completed/approved entries yet for payroll calculation.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Active Clock-ins */}
      {activeEntries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" /> Currently Clocked In
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {activeEntries.map((entry) => (
              <Card key={entry._id} className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    {!isWorker && <p className="font-semibold">{getStaffName(entry.staffId)}</p>}
                    <p className="text-sm text-muted-foreground">{getPropertyName(entry.propertyId)}</p>
                    <p className="text-sm text-green-700 font-medium mt-1">
                      <Clock className="size-3 inline" /> {formatDuration(Date.now() - entry.clockIn)} elapsed
                    </p>
                    {entry.clockInLat && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="size-3" /> GPS verified
                      </p>
                    )}
                  </div>
                  <Button onClick={() => handleClockOut(entry._id)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={loading === entry._id}>
                    {loading === entry._id ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Clock Out
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Entries */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {isWorker ? "My Time Entries" : "Recent Time Entries"}
        </h2>
        {timeEntries.length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <Clock className="size-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {isWorker ? "No time entries recorded yet. Clock in to start tracking." : "No time entries yet. Clock in a staff member to start tracking."}
            </p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {timeEntries.slice(0, 20).map((entry) => (
              <Card key={entry._id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      {!isWorker && <p className="font-medium">{getStaffName(entry.staffId)}</p>}
                      <p className="text-sm text-muted-foreground">{getPropertyName(entry.propertyId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm">{new Date(entry.clockIn).toLocaleDateString()} {new Date(entry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      {entry.clockOut && <p className="text-xs text-muted-foreground">→ {new Date(entry.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                      {entry.totalHours != null && <p className="text-sm font-medium">{entry.totalHours}h</p>}
                    </div>
                    <Badge className={statusColor[entry.status]}>{entry.status.replace("_", " ")}</Badge>
                    {/* Workers cannot approve entries */}
                    {!isWorker && entry.status === "clocked_out" && (
                      <Button size="sm" variant="outline" onClick={() => approveMut({ id: entry._id }).then(() => toast.success("Approved"))}>
                        Approve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Clock-In Dialog */}
      <Dialog open={showClockIn} onOpenChange={setShowClockIn}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Clock In</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Workers: auto-select their staff record; Owners: pick staff */}
            {isWorker ? (
              <div>
                <Label>Staff Member</Label>
                <div className="mt-1 p-2.5 bg-muted rounded-md text-sm">
                  {workerStaffId ? getStaffName(workerStaffId) : user?.name || "You"}
                </div>
              </div>
            ) : (
              <div><Label>Staff Member *</Label>
                <Select value={clockInForm.staffId} onValueChange={(v) => setClockInForm({ ...clockInForm, staffId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{staffList.filter((s) => s.status === "active").map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Property *</Label>
              <Select value={clockInForm.propertyId} onValueChange={(v) => setClockInForm({ ...clockInForm, propertyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> GPS location will be captured automatically</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowClockIn(false)}>Cancel</Button>
              <Button onClick={handleClockIn} className="bg-teal text-white hover:bg-teal/90" disabled={loading === "clock-in"}>
                {loading === "clock-in" ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Clock In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TimeTrackingPage() {
  return (
    <FeatureGate feature="time_tracking">
      <TimeTrackingPageInner />
    </FeatureGate>
  );
}
