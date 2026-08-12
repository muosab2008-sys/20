"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { MessageCircle, X, Send, Users, Smile, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmojiPicker } from "@/components/emoji-picker";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  photoURL: string | null;
  level: number;
  message: string;
  createdAt: Timestamp;
}

interface OnlineUser {
  id: string;
  username: string;
  photoURL: string | null;
  level?: number;
  lastSeen: Timestamp;
}

export function CommunityChat() {
  const { user, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeUsers, setActiveUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOnlineSidebar, setShowOnlineSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update user presence
  useEffect(() => {
    if (!user || !userData) return;

    const presenceRef = doc(db, "presence", user.uid);

    // Set user as online
    const setOnline = async () => {
      await setDoc(presenceRef, {
        username: userData.username,
        photoURL: userData.photoURL,
        level: userData.level,
        lastSeen: serverTimestamp(),
      });
    };

    setOnline();

    // Update presence every 30 seconds
    const interval = setInterval(setOnline, 30000);

    // Clean up on unmount
    return () => {
      clearInterval(interval);
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [user, userData]);

  // Listen to active users (presence)
  useEffect(() => {
    const presenceRef = collection(db, "presence");
    const unsubscribe = onSnapshot(presenceRef, (snapshot) => {
      // Count users who were active in the last 2 minutes
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const onlineList: OnlineUser[] = [];
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.lastSeen?.toMillis() > twoMinutesAgo) {
          onlineList.push({
            id: doc.id,
            username: data.username,
            photoURL: data.photoURL,
            level: data.level,
            lastSeen: data.lastSeen,
          });
        }
      });
      
      setOnlineUsers(onlineList);
      setActiveUsers(onlineList.length);
    });

    return () => unsubscribe();
  }, []);

  // Listen to chat messages
  useEffect(() => {
    const messagesRef = collection(db, "communityChat");
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .reverse() as ChatMessage[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user || !userData || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage("");
    setShowEmojiPicker(false);

    try {
      await addDoc(collection(db, "communityChat"), {
        userId: user.uid,
        username: userData.username,
        photoURL: userData.photoURL,
        level: userData.level,
        message: messageText,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(messageText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleEmojiSelect = (value: string) => {
    setNewMessage((prev) => prev + value);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render message with avatar support
  const renderMessage = (text: string) => {
    // Check for avatar references [avatar:/avatars/123.png]
    const avatarRegex = /\[avatar:(\/avatars\/\d+\.png)\]/g;
    const parts = text.split(avatarRegex);

    return parts.map((part, index) => {
      if (part.startsWith("/avatars/") && part.endsWith(".png")) {
        return (
          <span key={index} className="inline-block align-middle mx-0.5">
            <Image
              src={part}
              alt="Avatar"
              width={20}
              height={20}
              className="rounded"
            />
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-6 lg:bottom-6 z-50 w-14 h-14 rounded-full brand-gradient shadow-lg glow-primary flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
          isOpen ? "hidden" : ""
        }`}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[480px] lg:h-[32rem] flex flex-col">
          {/* Backdrop for mobile */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Container */}
          <div className="relative flex h-full max-h-[100dvh] lg:max-h-[32rem] bg-card border border-border rounded-t-2xl lg:rounded-2xl shadow-2xl overflow-hidden m-0 mt-auto lg:m-0 animate-in slide-in-from-bottom-4 duration-300">
            {/* Main Chat Area */}
            <div className={cn(
              "flex flex-col flex-1 transition-all duration-300",
              showOnlineSidebar ? "w-[calc(100%-160px)]" : "w-full"
            )}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Community Chat</h3>
                    <button 
                      onClick={() => setShowOnlineSidebar(!showOnlineSidebar)}
                      className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-400 transition-colors"
                    >
                      <Users className="w-3 h-3" />
                      <span>{activeUsers} online now</span>
                      {showOnlineSidebar ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronLeft className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Be the first to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        msg.userId === user?.uid ? "flex-row-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <Avatar className="w-8 h-8 shrink-0 rounded-lg">
                        <AvatarImage src={msg.photoURL || ""} />
                        <AvatarFallback className="rounded-lg bg-secondary text-xs">
                          {msg.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Content */}
                      <div
                        className={`flex flex-col max-w-[75%] ${
                          msg.userId === user?.uid ? "items-end" : "items-start"
                        }`}
                      >
                        {/* Username and Level */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground/80">
                            {msg.username}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                            Lv.{msg.level}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`px-3 py-2 rounded-xl text-sm ${
                            msg.userId === user?.uid
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-secondary text-foreground rounded-tl-sm"
                          }`}
                        >
                          {renderMessage(msg.message)}
                        </div>

                        {/* Time */}
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {user && userData ? (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-border bg-secondary/30"
                >
                  <div className="flex gap-2 items-center relative">
                    {/* Emoji Picker Button */}
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          showEmojiPicker 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-background border border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      {showEmojiPicker && (
                        <EmojiPicker
                          onSelect={handleEmojiSelect}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}
                    </div>

                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      maxLength={500}
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Sign in to join the conversation
                  </p>
                </div>
              )}
            </div>

            {/* Online Users Sidebar */}
            <div
              className={cn(
                "border-l border-border bg-secondary/30 transition-all duration-300 overflow-hidden",
                showOnlineSidebar ? "w-40" : "w-0"
              )}
            >
              {showOnlineSidebar && (
                <div className="p-3 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground">Online ({onlineUsers.length})</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                    {onlineUsers.map((onlineUser) => (
                      <div
                        key={onlineUser.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-background/50"
                      >
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border shrink-0">
                          {onlineUser.photoURL ? (
                            <Image
                              src={onlineUser.photoURL}
                              alt={onlineUser.username}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                              <span className="text-xs font-bold text-muted-foreground">
                                {onlineUser.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {onlineUser.username}
                          </p>
                          {onlineUser.level && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                              Lv.{onlineUser.level}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
