"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Coins,
  Users,
  Ticket,
  User,
  Wallet,
  LayoutGrid,
  Shield,
  X,
  ShieldCheck,
  Globe,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PWAInstallButton } from "@/components/pwa-install-button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

// Points to USD conversion
const pointsToUSD = (points: number) => (points / 1000).toFixed(2);

const navItems = [
  { href: "/", label: "Earn", icon: Coins },
  { href: "/leaderboard", label: "Leaderboard", icon: Crown },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/promo", label: "Promo Codes", icon: Ticket },
  { href: "/cashout", label: "Cashout", icon: Wallet },
  { href: "/offers", label: "Offers", icon: LayoutGrid },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar({ isOpen, onClose, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { userData } = useAuth();

  const pointsPerLevel = 10000;
  const totalEarned = userData?.totalEarned || 0;
  const currentLevel = Math.floor(totalEarned / pointsPerLevel) + 1;
  const pointsInCurrentLevel = totalEarned % pointsPerLevel;
  const levelProgress = (pointsInCurrentLevel / pointsPerLevel) * 100;

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0 w-64 sm:w-72" : "-translate-x-full",
          isCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-border p-4 lg:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo.png" alt="MrCash" width={32} height={32} className="rounded-xl shrink-0" />
            <span className="font-bold text-lg brand-gradient-text">MrCash</span>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Desktop Header */}
        <div className={cn(
          "hidden items-center gap-2.5 border-b border-border p-4 lg:flex",
          isCollapsed && "justify-center"
        )}>
          <Image src="/logo.png" alt="MrCash" width={isCollapsed ? 32 : 36} height={isCollapsed ? 32 : 36} className="rounded-xl shrink-0" />
          {!isCollapsed && <span className="text-lg font-bold brand-gradient-text">MrCash</span>}
        </div>

        {/* User Stats (Mobile only) */}
        {userData && (
          <div className="border-b border-border p-4 lg:hidden">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
              <Image 
                src="/coin.png" 
                alt="Points"
                width={32} 
                height={32}
                className="w-8 h-8 object-contain"
              />
              <div>
                <p className="font-bold text-foreground">{(userData.points || 0).toLocaleString()} PTS</p>
                <p className="text-xs text-muted-foreground">= ${pointsToUSD(userData.points || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 sm:p-4 no-scrollbar">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive 
                            ? "brand-gradient text-white shadow-lg glow-primary" 
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          isCollapsed && "lg:justify-center lg:px-2"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className={cn("truncate", isCollapsed && "lg:hidden")}>{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right" className="hidden lg:block">{item.label}</TooltipContent>}
                  </Tooltip>
                </li>
              );
            })}

            {/* Admin Section */}
            {userData?.isAdmin && (
              <li className="mt-4 pt-4 border-t border-border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/admin"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        pathname.startsWith("/admin") 
                          ? "brand-gradient text-white shadow-lg" 
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        isCollapsed && "lg:justify-center lg:px-2"
                      )}
                    >
                      <Shield className="h-5 w-5 shrink-0" />
                      <span className={cn("truncate", isCollapsed && "lg:hidden")}>Admin Panel</span>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right" className="hidden lg:block">Admin Panel</TooltipContent>}
                </Tooltip>
              </li>
            )}
          </ul>
        </nav>

        {/* Legal Links */}
        <div className={cn("px-4 py-3 border-t border-border", isCollapsed && "lg:hidden")}>
          {/* PWA Install Button */}
          <div className="mb-3">
            <PWAInstallButton variant="card" />
          </div>
          <Link href="/privacy-policy" className="flex items-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ShieldCheck className="h-4 w-4" />
            <span>Privacy Policy</span>
          </Link>
          <Link href="/terms-of-service" className="flex items-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Globe className="h-4 w-4" />
            <span>Terms of Service</span>
          </Link>
        </div>

        {/* Level Progress Footer */}
        <div className={cn(
          "border-t border-border p-4 bg-secondary/20",
          isCollapsed && "lg:p-2 lg:flex lg:justify-center"
        )}>
          {userData && !isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-bold">Level {currentLevel}</span>
                <span className="text-muted-foreground font-mono">{Math.floor(levelProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full brand-gradient transition-all duration-700" 
                  style={{ width: `${levelProgress}%` }} 
                />
              </div>
              <div className="text-[10px] text-center text-muted-foreground uppercase tracking-wider">
                {pointsInCurrentLevel.toLocaleString()} / {pointsPerLevel.toLocaleString()} XP
              </div>
            </div>
          ) : (
            userData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border mx-auto cursor-help">
                    <span className="text-xs font-black text-primary">L{currentLevel}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">Level {currentLevel} - {Math.floor(levelProgress)}%</TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
