"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Smile, Image as ImageIcon, Shuffle } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (value: string) => void;
  onClose: () => void;
}

// Common emojis curated set
const COMMON_EMOJIS = [
  "😀", "😂", "😍", "🥰", "😎", "🤩", "😘", "🥳",
  "😊", "🙂", "😉", "😋", "😜", "🤗", "🤔", "😏",
  "😢", "😭", "😤", "😡", "🥺", "😱", "😰", "🤯",
  "👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔",
  "🔥", "⭐", "✨", "💫", "🎉", "🎊", "🏆", "💰",
  "💵", "💸", "🪙", "💎", "👑", "🚀", "💯", "✅",
];

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState<"emoji" | "avatar">("emoji");
  const [shuffleKey, setShuffleKey] = useState(0);

  // Generate random 50 avatars
  const displayedAvatars = useMemo(() => {
    const allIndices = Array.from({ length: 783 }, (_, i) => i + 1);
    const shuffled = shuffleArray(allIndices);
    return shuffled.slice(0, 50).map((id) => `/avatars/${id}.png`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleKey]);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
  };

  const handleAvatarClick = (avatarPath: string) => {
    // Insert as markdown image reference
    onSelect(`[avatar:${avatarPath}]`);
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("emoji")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
            activeTab === "emoji"
              ? "text-foreground bg-secondary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Smile className="w-4 h-4" />
          Emojis
        </button>
        <button
          onClick={() => setActiveTab("avatar")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
            activeTab === "avatar"
              ? "text-foreground bg-secondary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ImageIcon className="w-4 h-4" />
          Avatars
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-48 overflow-y-auto no-scrollbar">
        {activeTab === "emoji" ? (
          <div className="grid grid-cols-8 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Click to insert</span>
              <button
                onClick={() => setShuffleKey((prev) => prev + 1)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Shuffle className="w-3 h-3" />
                Shuffle
              </button>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {displayedAvatars.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => handleAvatarClick(avatar)}
                  className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                >
                  <Image
                    src={avatar}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Close hint */}
      <div className="px-3 py-2 border-t border-border bg-secondary/50">
        <p className="text-[10px] text-muted-foreground text-center">
          Click outside to close
        </p>
      </div>
    </div>
  );
}
