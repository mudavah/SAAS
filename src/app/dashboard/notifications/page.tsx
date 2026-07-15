"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, Archive } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (data.notifications) {
      setNotifications(data.notifications);
      unreadCount.current = data.notifications.filter((n: Notification) => !n.readAt).length;
    }
    setLoading(false);
  }, []);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id, action: "read" }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  }

  async function archive(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id, action: "archive" }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unread = notifications.filter((n) => !n.readAt).length;

  const typeColors: Record<string, string> = {
    invoice: "bg-blue-100 text-blue-800",
    payment: "bg-green-100 text-green-800",
    inventory: "bg-orange-100 text-orange-800",
    compliance: "bg-purple-100 text-purple-800",
    invitation: "bg-pink-100 text-pink-800",
    system: "bg-gray-100 text-gray-800",
    security: "bg-red-100 text-red-800",
    subscription: "bg-indigo-100 text-indigo-800",
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
          <Button onClick={fetchNotifications} variant="outline" className="w-full sm:w-auto">
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${
                  notif.readAt ? "bg-card" : "bg-kazi-green/5 border-kazi-green/20"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{notif.title}</h3>
                    <Badge variant="secondary" className={`text-xs capitalize ${typeColors[notif.type] || "bg-gray-100"}`}>
                      {notif.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{notif.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(notif.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {!notif.readAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markRead(notif.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => archive(notif.id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
