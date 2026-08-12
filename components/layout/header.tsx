"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Settings, Menu, ArrowRightLeft, Shield, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPanel } from "@/components/notifications/notification-panel";

interface HeaderProps {
  onMenuClick?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

// Points to USD conversion (1000 points = $1)
const pointsToUSD = (points: number) => (points / 1000).toFixed(2);

export function Header({ onMenuClick }: HeaderProps) {
  const { user, userData, logout } = useAuth();
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [displayMode, setDisplayMode] = useState<"points" | "usd">("points");

  const userPoints = userData?.points || 0;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
          
          {/* Left: Menu & Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-secondary text-foreground shrink-0 h-9 w-9 rounded-xl"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Link href="/" className="lg:hidden flex items-center gap-2.5 min-w-0 group">
              <Image 
                src="/logo.png" 
                alt="MrCash Logo"
                width={28} 
                height={28}
                priority
                className="object-contain w-7 h-7 shrink-0 transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-black tracking-tight brand-gradient-text">
                MrCash
              </span>
            </Link>
          </div>

          {/* Right: Balance & Settings */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {user && userData ? (
              <>
                {/* Balance Display - Clickable for info */}
                <button
                  onClick={() => setShowPointsInfo(true)}
                  className="flex items-center gap-2 rounded-xl bg-secondary/80 px-3 py-2 sm:px-4 sm:py-2.5 border border-border hover:border-primary/30 transition-all group"
                >
                  <Image 
                    src="/coin.png" 
                    alt="Coin"
                    width={24} 
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                  />
                  <span className="font-bold text-sm sm:text-base text-foreground">
                    {displayMode === "points" 
                      ? userPoints.toLocaleString()
                      : `$${pointsToUSD(userPoints)}`
                    }
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">
                    {displayMode === "points" ? "MC" : "USD"}
                  </span>
                </button>

                {/* Toggle Points/USD */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDisplayMode(displayMode === "points" ? "usd" : "points")}
                  className="hover:bg-secondary text-muted-foreground hover:text-foreground h-9 w-9 rounded-xl"
                  title="Switch display mode"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  <NotificationPanel />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="hover:bg-secondary text-muted-foreground h-9 w-9 sm:h-10 sm:w-10 rounded-xl"
                      >
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-56 rounded-xl bg-card border-border text-foreground shadow-2xl p-2 mt-1"
                    >
                      <div className="px-3 py-3 bg-secondary/50 rounded-lg mb-1">
                        <p className="text-sm font-bold text-foreground truncate">{userData?.username}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          Level {Math.floor((userData?.totalEarned || 0) / 10000) + 1} | ID: {userData?.uid?.slice(0, 6)}
                        </p>
                      </div>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 text-sm font-medium focus:bg-secondary focus:text-primary">
                        <Link href="/profile">Profile Settings</Link>
                      </DropdownMenuItem>
                      {userData?.isAdmin && (
                        <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 text-sm font-medium focus:bg-secondary focus:text-primary">
                          <Link href="/admin">Admin Dashboard</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem 
                        onClick={logout} 
                        className="text-destructive font-medium py-2.5 text-sm focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg"
                      >
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button className="h-9 px-5 rounded-xl brand-gradient text-white font-bold text-sm border-none active:scale-95 transition-all shadow-lg glow-primary">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Points Info Modal */}
      {showPointsInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPointsInfo(false)}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <Image 
                  src="/coin.png" 
                  alt="Coin"
                  width={40} 
                  height={40}
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <h3 className="font-bold text-lg text-foreground">Points Balance</h3>
                  <p className="text-xs text-muted-foreground">MrCash Rewards System</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPointsInfo(false)}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5">
              {/* Balance Display */}
              <div className="text-center py-6 bg-secondary/30 rounded-xl border border-border">
                <p className="text-5xl font-black text-foreground mb-2">
                  {userPoints.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  = <span className="text-primary font-bold">${pointsToUSD(userPoints)}</span> USD
                </p>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-secondary/30 rounded-xl border border-border text-center">
                  <p className="text-2xl font-black text-primary">1000</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Points = $1</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-xl border border-border text-center">
                  <p className="text-2xl font-black text-foreground">
                    {(userData?.totalEarned || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Total Earned</p>
                </div>
              </div>

              {/* Company Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Secure & Encrypted Transactions</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Fast withdrawals within 24 hours</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Link href="/cashout" className="flex-1" onClick={() => setShowPointsInfo(false)}>
                  <Button className="w-full h-12 brand-gradient text-white font-bold rounded-xl">
                    Withdraw
                  </Button>
                </Link>
                <Link href="/" className="flex-1" onClick={() => setShowPointsInfo(false)}>
                  <Button variant="outline" className="w-full h-12 font-bold rounded-xl border-border hover:bg-secondary">
                    Earn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
