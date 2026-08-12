"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, X, Gift, Coins, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "./notification-provider";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const typeIcons = {
  success: Coins,
  info: Info,
  warning: AlertCircle,
  error: X,
};

const typeColors = {
  success: "text-green-500 bg-green-500/10",
  info: "text-[var(--brand-cyan)] bg-[var(--brand-cyan)]/10",
  warning: "text-yellow-500 bg-yellow-500/10",
  error: "text-red-500 bg-red-500/10",
};

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, pushPermission, requestPushPermission } = useNotifications();

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-purple)] text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Push notification banner */}
            {pushPermission !== "granted" && (
              <div className="p-3 bg-gradient-to-r from-[var(--brand-cyan)]/10 to-[var(--brand-purple)]/10 border-b border-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Enable push notifications</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Never miss important updates</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={requestPushPermission}
                    className="brand-gradient text-xs h-7"
                  >
                    Enable
                  </Button>
                </div>
              </div>
            )}

            {/* Notifications list */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Complete offers to earn rewards and get notified!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const Icon = typeIcons[notification.type] || Info;
                    const colorClass = typeColors[notification.type] || typeColors.info;

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-4 hover:bg-secondary/30 transition-colors cursor-pointer",
                          !notification.read && "bg-secondary/20"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex gap-3">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", colorClass)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-sm",
                                notification.read ? "text-foreground" : "font-semibold text-foreground"
                              )}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-[var(--brand-cyan)] flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {notification.createdAt?.toDate && 
                                formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
