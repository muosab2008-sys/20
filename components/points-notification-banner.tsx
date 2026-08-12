"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { X, Coins } from "lucide-react";

interface LiveFeedEntry {
  id: string;
  userId: string;
  username: string;
  photoURL: string | null;
  type: string;
  points: number;
  message: string;
  createdAt: Timestamp;
}

interface Notification {
  id: string;
  username: string;
  photoURL: string | null;
  points: number;
  message: string;
}

export function PointsNotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastProcessedId, setLastProcessedId] = useState<string | null>(null);

  useEffect(() => {
    const liveFeedRef = collection(db, "live_feed");
    const q = query(liveFeedRef, orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as Omit<LiveFeedEntry, "id">;
          const docId = change.doc.id;

          // Skip if we've already processed this one
          if (lastProcessedId === docId) return;

          // Only show positive point notifications
          if (data.points > 0) {
            setNotifications((prev) => {
              // Prevent duplicates
              if (prev.some((n) => n.id === docId)) return prev;

              const newNotification: Notification = {
                id: docId,
                username: data.username,
                photoURL: data.photoURL,
                points: data.points,
                message: data.message || `earned +${data.points} points!`,
              };

              // Keep only last 3 notifications
              return [newNotification, ...prev].slice(0, 3);
            });

            setLastProcessedId(docId);

            // Auto-remove after 5 seconds
            setTimeout(() => {
              setNotifications((prev) => prev.filter((n) => n.id !== docId));
            }, 5000);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [lastProcessedId]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={cn(
            "flex items-center gap-3 p-3 pr-10 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg animate-in slide-in-from-right-5 duration-300",
            index === 0 && "border-primary/30"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Avatar */}
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-border shrink-0">
            {notification.photoURL ? (
              <Image
                src={notification.photoURL}
                alt={notification.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-bold text-muted-foreground">
                  {notification.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {notification.username}
            </p>
            <div className="flex items-center gap-1.5 text-xs">
              <Coins className="w-3 h-3 text-primary" />
              <span className="text-primary font-bold">+{notification.points}</span>
              <span className="text-muted-foreground">points earned!</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => dismissNotification(notification.id)}
            className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
