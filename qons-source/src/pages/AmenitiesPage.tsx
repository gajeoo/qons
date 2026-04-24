import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  CalendarCheck,
  Clock,
  MoreHorizontal,
  Plus,
  Trash2,
  TreePalm,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const typeIcons: Record<string, string> = {
  pool: "🏊",
  gym: "🏋️",
  party_room: "🎉",
  rooftop: "🏙️",
  tennis_court: "🎾",
  parking: "🅿️",
  bbq_area: "🔥",
  other: "📌",
};

function AmenitiesPageInner() {
  const amenities = useQuery(api.amenities.list, {}) || [];
  const bookings = useQuery(api.amenities.listBookings, {}) || [];
  const properties = useQuery(api.properties.list) || [];
  const createAmenity = useMutation(api.amenities.create);
  const updateAmenity = useMutation(api.amenities.update);
  const removeAmenity = useMutation(api.amenities.remove);
  const createBooking = useMutation(api.amenities.createBooking);
  const updateBookingStatus = useMutation(api.amenities.updateBookingStatus);
  const waitlist = useQuery(api.amenityWaitlist.list, {}) || [];
  const addToWaitlist = useMutation(api.amenityWaitlist.add);
  const notifyWaitlist = useMutation(api.amenityWaitlist.notify);
  const removeFromWaitlist = useMutation(api.amenityWaitlist.remove);

  const [showAmenityForm, setShowAmenityForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [amenityForm, setAmenityForm] = useState({
    propertyId: "",
    name: "",
    type: "other" as const,
    capacity: "10",
    requiresApproval: false,
    rules: "",
  });
  const [bookingForm, setBookingForm] = useState({
    amenityId: "",
    residentName: "",
    residentEmail: "",
    residentUnit: "",
    date: "",
    startTime: "09:00",
    endTime: "11:00",
    guestCount: "0",
    notes: "",
  });

  const handleCreateAmenity = async () => {
    if (!amenityForm.propertyId || !amenityForm.name) {
      toast.error("Fill required fields");
      return;
    }
    try {
      await createAmenity({
        propertyId: amenityForm.propertyId as Id<"properties">,
        name: amenityForm.name,
        type: amenityForm.type,
        capacity: parseInt(amenityForm.capacity, 10) || 10,
        requiresApproval: amenityForm.requiresApproval,
        rules: amenityForm.rules || undefined,
      });
      toast.success("Amenity added");
      setShowAmenityForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCreateBooking = async () => {
    if (
      !bookingForm.amenityId ||
      !bookingForm.residentName ||
      !bookingForm.date
    ) {
      toast.error("Fill required fields");
      return;
    }
    try {
      await createBooking({
        amenityId: bookingForm.amenityId as Id<"amenities">,
        residentName: bookingForm.residentName,
        residentEmail: bookingForm.residentEmail,
        residentUnit: bookingForm.residentUnit || undefined,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        guestCount: parseInt(bookingForm.guestCount, 10) || undefined,
        notes: bookingForm.notes || undefined,
      });
      toast.success("Booking created");
      setShowBookingForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getPropertyName = (id: Id<"properties">) =>
    properties.find(p => p._id === id)?.name || "";
  const getAmenityName = (id: Id<"amenities">) =>
    amenities.find(a => a._id === id)?.name || "";

  const statusColor: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    maintenance: "bg-amber-100 text-amber-700",
    closed: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Amenity Booking</h1>
          <p className="text-muted-foreground">
            Manage amenities and resident bookings
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBookingForm(true)} variant="outline">
            <CalendarCheck className="size-4" /> New Booking
          </Button>
          <Button
            onClick={() => setShowAmenityForm(true)}
            className="bg-teal text-white hover:bg-teal/90"
          >
            <Plus className="size-4" /> Add Amenity
          </Button>
        </div>
      </div>

      <Tabs defaultValue="amenities">
        <TabsList>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
        </TabsList>

        <TabsContent value="amenities" className="mt-4">
          {amenities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <TreePalm className="size-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg">No amenities yet</h3>
                <p className="text-muted-foreground mt-1">
                  Add amenities to enable resident bookings
                </p>
                <Button
                  onClick={() => setShowAmenityForm(true)}
                  className="mt-4 bg-teal text-white hover:bg-teal/90"
                >
                  <Plus className="size-4" /> Add Amenity
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {amenities.map(a => (
                <Card key={a._id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{typeIcons[a.type]}</span>
                        <div>
                          <CardTitle className="text-base">{a.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {getPropertyName(a.propertyId)}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              updateAmenity({
                                id: a._id,
                                status:
                                  a.status === "available"
                                    ? "maintenance"
                                    : "available",
                              })
                            }
                          >
                            {a.status === "available"
                              ? "Set Maintenance"
                              : "Set Available"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => removeAmenity({ id: a._id })}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className={statusColor[a.status]}>
                        {a.status}
                      </Badge>
                      <Badge variant="outline">Cap: {a.capacity}</Badge>
                      {a.requiresApproval && (
                        <Badge variant="outline">Approval Required</Badge>
                      )}
                    </div>
                    {a.rules && (
                      <p className="text-xs text-muted-foreground">{a.rules}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarCheck className="size-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No bookings yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <Card key={b._id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {b.residentName}{" "}
                        {b.residentUnit ? `(Unit ${b.residentUnit})` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getAmenityName(b.amenityId)} · {b.date} · {b.startTime}
                        -{b.endTime}
                      </p>
                      {b.guestCount ? (
                        <p className="text-xs text-muted-foreground">
                          {b.guestCount} guests
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor[b.status]}>
                        {b.status}
                      </Badge>
                      {b.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() =>
                              updateBookingStatus({
                                id: b._id,
                                status: "approved",
                              }).then(() => toast.success("Approved"))
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() =>
                              updateBookingStatus({
                                id: b._id,
                                status: "rejected",
                              }).then(() => toast.success("Rejected"))
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Waitlist Tab */}
        <TabsContent value="waitlist" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Residents waiting for amenity availability
            </p>
            <Button
              size="sm"
              onClick={() => {
                const amenityId = prompt(
                  "Amenity ID (select from amenities list):",
                );
                if (!amenityId) return;
                const name = prompt("Resident name:");
                const email = prompt("Resident email:");
                const date = prompt("Preferred date (YYYY-MM-DD):");
                if (!name || !email || !date) {
                  toast.error("All fields required");
                  return;
                }
                addToWaitlist({
                  amenityId: amenityId as Id<"amenities">,
                  residentName: name,
                  residentEmail: email,
                  preferredDate: date,
                })
                  .then(() => toast.success("Added to waitlist"))
                  .catch(e => toast.error(e.message));
              }}
            >
              <UserPlus className="size-3 mr-1" /> Add to Waitlist
            </Button>
          </div>
          {waitlist.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="size-8 mx-auto mb-2 opacity-30" />
                <p>No one on the waitlist</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {waitlist.map(w => {
                const amenity = amenities.find(a => a._id === w.amenityId);
                return (
                  <Card key={w._id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                          {amenity ? typeIcons[amenity.type] || "📌" : "📌"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {w.residentName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {w.residentEmail} · Preferred: {w.preferredDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            w.status === "waiting"
                              ? "secondary"
                              : w.status === "notified"
                                ? "default"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {w.status}
                        </Badge>
                        {w.status === "waiting" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              notifyWaitlist({ id: w._id }).then(() =>
                                toast.success("Notified"),
                              )
                            }
                          >
                            <Bell className="size-3 mr-1" /> Notify
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeFromWaitlist({ id: w._id }).then(() =>
                              toast.success("Removed"),
                            )
                          }
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Amenity Form */}
      <Dialog open={showAmenityForm} onOpenChange={setShowAmenityForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Amenity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Property *</Label>
              <Select
                value={amenityForm.propertyId}
                onValueChange={v =>
                  setAmenityForm({ ...amenityForm, propertyId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={amenityForm.name}
                onChange={e =>
                  setAmenityForm({ ...amenityForm, name: e.target.value })
                }
                placeholder="Rooftop Pool"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={amenityForm.type}
                  onValueChange={(v: any) =>
                    setAmenityForm({ ...amenityForm, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeIcons).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v} {k.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={amenityForm.capacity}
                  onChange={e =>
                    setAmenityForm({ ...amenityForm, capacity: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={amenityForm.requiresApproval}
                onCheckedChange={v =>
                  setAmenityForm({ ...amenityForm, requiresApproval: v })
                }
              />
              <Label>Requires approval</Label>
            </div>
            <div>
              <Label>Rules</Label>
              <Textarea
                value={amenityForm.rules}
                onChange={e =>
                  setAmenityForm({ ...amenityForm, rules: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAmenityForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAmenity}
                className="bg-teal text-white hover:bg-teal/90"
              >
                Add Amenity
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Form */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amenity *</Label>
              <Select
                value={bookingForm.amenityId}
                onValueChange={v =>
                  setBookingForm({ ...bookingForm, amenityId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select amenity" />
                </SelectTrigger>
                <SelectContent>
                  {amenities
                    .filter(a => a.status === "available")
                    .map(a => (
                      <SelectItem key={a._id} value={a._id}>
                        {typeIcons[a.type]} {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resident Name *</Label>
              <Input
                value={bookingForm.residentName}
                onChange={e =>
                  setBookingForm({
                    ...bookingForm,
                    residentName: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={bookingForm.residentEmail}
                  onChange={e =>
                    setBookingForm({
                      ...bookingForm,
                      residentEmail: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={bookingForm.residentUnit}
                  onChange={e =>
                    setBookingForm({
                      ...bookingForm,
                      residentUnit: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={bookingForm.date}
                onChange={e =>
                  setBookingForm({ ...bookingForm, date: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  value={bookingForm.startTime}
                  onChange={e =>
                    setBookingForm({
                      ...bookingForm,
                      startTime: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  value={bookingForm.endTime}
                  onChange={e =>
                    setBookingForm({ ...bookingForm, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowBookingForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBooking}
                className="bg-teal text-white hover:bg-teal/90"
              >
                Create Booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AmenitiesPage() {
  return (
    <FeatureGate feature="amenities">
      <AmenitiesPageInner />
    </FeatureGate>
  );
}
