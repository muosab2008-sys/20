"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Shuffle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarSelectorProps {
  totalAvatars?: number;
  displayCount?: number;
  selectedAvatar: string | null;
  onSelect: (avatarPath: string) => void;
  className?: string;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function AvatarSelector({
  totalAvatars = 80,       // تم تثبيتها على 80 وهو العدد الحقيقي لملفاتك داخل المجلد
  displayCount = 40,       // عرض 40 صورة عشوائية عند الضغط على الـ Shuffle
  selectedAvatar,
  onSelect,
  className,
}: AvatarSelectorProps) {
  const [shuffleKey, setShuffleKey] = useState(0);

  // Generate all avatar indices
  const allAvatarIndices = useMemo(() => {
    return Array.from({ length: totalAvatars }, (_, i) => i + 1);
  }, [totalAvatars]);

  // Get random selection of avatars
  const displayedAvatars = useMemo(() => {
    const shuffled = shuffleArray(allAvatarIndices);
    // المسار الصحيح والمباشر المتوافق مع بنية مجلد الـ public لديك على جيتهاب
    return shuffled.slice(0, displayCount).map((id) => `/avatars/${id}.png`);
  }, [allAvatarIndices, displayCount, shuffleKey]);

  const handleShuffle = () => {
    setShuffleKey((prev) => prev + 1);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Shuffle Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          Select your avatar ({displayCount} of {totalAvatars} shown)
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className="rounded-xl bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20 text-white/70 hover:text-white"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Shuffle
        </Button>
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/5">
        {displayedAvatars.map((avatarPath) => {
          const isSelected = selectedAvatar === avatarPath;
          return (
            <button
              key={avatarPath}
              type="button"
              onClick={() => onSelect(avatarPath)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden transition-all duration-200 border-2",
                isSelected
                  ? "border-[#3B82F6] ring-2 ring-[#3B82F6]/50 scale-105 z-10"
                  : "border-transparent hover:border-white/20 hover:scale-105"
              )}
            >
              <Image
                src={avatarPath}
                alt="Avatar option"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 18vw, 9vw"
                onError={(e) => {
                  // حماية تلقائية مدمجة: إذا لم يجد السيرفر الصورة يحولها لرقم 1 الآمن
                  const target = e.target as HTMLImageElement;
                  target.src = "/avatars/1.png";
                }}
              />
              {isSelected && (
                <div className="absolute inset-0 bg-[#3B82F6]/30 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#3B82F6] flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Preview */}
      {selectedAvatar && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-[#3B82F6]">
            <Image
              src={selectedAvatar}
              alt="Selected avatar"
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/avatars/1.png";
              }}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Avatar Selected</p>
            <p className="text-xs text-white/40">This will be your profile picture</p>
          </div>
        </div>
      )}
    </div>
  );
}

