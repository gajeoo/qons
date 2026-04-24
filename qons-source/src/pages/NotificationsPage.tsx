import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Megaphone,
  Settings,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const typeIcons: Record<string, React.ReactNode> = {
  rent_reminder: <CreditCard className="size-4" />,
  rent_overdue: <CreditCard className="size-4" />,
  lease_expiry: <FileText className="size-4" />,
  maintenance_update: <Wrench className="size-4" />,
  shift_change: <Calendar className="size-4" />,
  task_assigned: <CheckCheck className="size-4" />,
  general: <Megaphone className="size-4" />,
  payment_received: <CreditCard className="size-4" />,
  system: <Settings className="size-4" />,
};

const typeColors: Record<string, string> = {
  rent_reminder: "bg-amber-100 text-amber-600",
  rent_overdue: "bg-red-100 text-red-600",
  lease_expiry: "bg-orange-100 text-orange-600",
  maintenance_update: "bg-blue-100 text-blue-600",
  shift_change: "bg-purple-100 text-purple-600",
  task_assigned: "bg-sky-100 text-sky-600",
  general: "bg-gray-100 text-gray-600",
  payment_received: "bg-green-100 text-green-600",
  system: "bg-gray-100 text-gray-600",
};

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDateGroup(timestamp: number) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 6 * 86400000;

  if (timestamp >= todayStart) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";
  if (timestamp >= weekStart) return "This Week";
  return "Older";
}

function NotificationsPageInner() {
  const notifications = useQuery(api.notificationRecords.list, {}) || [];
  const markAsRead = useMutation(api.notificationRecords.markRead);
  const markAllRead = useMutation(api.notificationRecords.markAllRead);

  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    let result = notifications;
    if (filterType !== "all") {
      result = result.filter((n) => n.type === filterType);
    }
    if (filterRead === "unread") {
      result = result.filter((n) => !n.read);
    } else if (filterRead === "read") {
      result = result.filter((n) => n.read);
    }
    return result;
  }, [notifications, filterType, filterRead]);

  // Group by date
  const groups = useMemo(() => {
    const grouped: Record<string, typeof filtered> = {};
    for (const n of filtered) {
      const group = getDateGroup(n.sentAt);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(n);
    }
    return grouped;
  }, [filtered]);

  const groupOrder = ["Today", "Yesterday", "This Week", "Older"];

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead({ id: id as Id<"notificationRecords"> });
    } catch {
      // Silent fail for read status
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead({});
      toast.success("All notifications marked as read");
    } catch (e: any) {
      toast.error(e.message || "Failed to mark all as read");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Stay updated on rent, maintenance, leases, and team activity.
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="size-4" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterRead} onValueChange={setFilterRead}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <Filter className="size-4 mr-1" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="rent_reminder">Rent Reminders</SelectItem>
            <SelectItem value="rent_overdue">Rent Overdue</SelectItem>
            <SelectItem value="lease_expiry">Lease Expiry</SelectItem>
            <SelectItem value="maintenance_update">Maintenance</SelectItem>
            <SelectItem value="shift_change">Shift Changes</SelectItem>
            <SelectItem value="task_assigned">Tasks</SelectItem>
            <SelectItem value="payment_received">Payments</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <BellOff className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {filterRead === "unread"
                ? "All caught up!"
                : "No notifications yet"}
            </p>
            <p className="text-sm mt-1">
              {filterRead === "unread"
                ? "You have no unread notifications."
                : "Notifications from rent, maintenance, and other activities will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupOrder.map((groupName) => {
            const items = groups[groupName];
            if (!items || items.length === 0) return null;
            return (
              <div key={groupName}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                  {groupName}
                </h3>
                <Card>
                  <div className="divide-y">
                    {items.map((notification) => (
                      <button
                        key={notification._id}
                        className={`w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${
                          !notification.read ? "bg-sky-50/50" : ""
                        }`}
                        onClick={() => {
                          if (!notification.read) {
                            handleMarkRead(notification._id);
                          }
                        }}
                      >
                        {/* Icon */}
                        <div
                          className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                            typeColors[notification.type] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {typeIcons[notification.type] || (
                            <Bell className="size-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm ${
                                !notification.read
                                  ? "font-semibold"
                                  : "font-medium"
                              }`}
                            >
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="size-2 rounded-full bg-sky-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {timeAgo(notification.sentAt)}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] capitalize"
                            >
                              {notification.channel}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NotificationsPage() {
  return (
    <FeatureGate feature="notifications">
      <NotificationsPageInner />
    </FeatureGate>
  );
}
