"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Gift } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error" | "withdrawal_approved" | "withdrawal_rejected" | "offer_completed" | "offer_credit" | "chargeback";
  read: boolean;
  points?: number;
  amount?: number;
  createdAt?: Timestamp;
  timestamp?: Timestamp;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  pushPermission: NotificationPermission | null;
  requestPushPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

// Beautiful and Clean English Toast Notifications
function showNotificationToast(notification: Notification) {
  const { type, points, amount, message } = notification;
  
  // Dynamic extraction to prevent "+0" bug
  let displayPoints = points || amount || 0;

  if (displayPoints === 0 && message) {
    const match = message.match(/\+?\d[\d,.]*/);
    if (match) {
      displayPoints = parseFloat(match[0].replace(/[+,]/g, '')) || 0;
    }
  }

  switch (type) {
    case "withdrawal_approved":
      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 p-4 bg-card border border-green-500/30 rounded-xl shadow-lg max-w-md animate-in slide-in-from-top-2">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">Withdrawal Approved! 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Congratulations! Your withdrawal request has been successfully processed.
              </p>
            </div>
            <button 
              onClick={() => toast.dismiss(t)} 
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ),
        { duration: 6000 }
      );
      break;

    case "withdrawal_rejected":
      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 p-4 bg-card border border-red-500/30 rounded-xl shadow-lg max-w-md animate-in slide-in-from-top-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">Withdrawal Rejected ⚠️</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your request was rejected. Please contact support or review the requirements.
              </p>
            </div>
            <button 
              onClick={() => toast.dismiss(t)} 
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ),
        { duration: 8000 }
      );
      break;

    case "offer_completed":
    case "offer_credit":
      toast.custom(
        (t) => (
          <div className="flex items-center gap-3 p-4 bg-card border border-primary/30 rounded-xl shadow-lg max-w-md animate-in slide-in-from-top-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">Points Credited! 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Awesome! You earned <span className="text-primary font-bold text-blue-500">+{displayPoints.toLocaleString()}</span> points from your completed offer.
              </p>
            </div>
            <button 
              onClick={() => toast.dismiss(t)} 
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ),
        { duration: 6000 }
      );
      break;

    default:
      toast(notification.title || "New Notification", {
        description: message || notification.message,
      });
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const shownNotifications = useRef<Set<string>>(new Set());

  // Check initial browser permission status quietly
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Firestore Real-time Listener for notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      shownNotifications.current.clear();
      return;
    }

    const notificationsRef = collection(db, "notifications");
    
    const q = query(
      notificationsRef,
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      
      notifs.forEach((notif) => {
        if (!notif.read && !shownNotifications.current.has(notif.id)) {
          shownNotifications.current.add(notif.id);
          showNotificationToast(notif);
        }
      });
      
      setNotifications(notifs);
    }, (error) => {
      console.error("Firestore Listen Notification Error:", error.message);
    });

    return () => unsubscribe();
  }, [user]);

  // Request browser push notification context method manually if triggered via settings
  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      return permission === "granted";
    } catch {
      return false;
    }
  };

  const markAsRead = async (id: string) => {
    const notifRef = doc(db, "notifications", id);
    await updateDoc(notifRef, { read: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true }))
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        pushPermission,
        requestPushPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
