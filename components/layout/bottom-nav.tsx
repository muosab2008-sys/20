"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wallet, UserPlus, Home, Gift, User } from "lucide-react";

const navItems = [
  { href: "/cashout", label: "Cashout", icon: Wallet },
  { href: "/referrals", label: "Referrals", icon: UserPlus },
  { href: "/", label: "Home", icon: Home, isMain: true },
  { href: "/offers", label: "Offers", icon: Gift },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-3 pb-3 pointer-events-none">
      {/* Glass container with enhanced blur */}
      <div className="relative backdrop-blur-xl bg-background/40 border border-white/10 py-2 rounded-2xl pointer-events-auto shadow-2xl">
        
        {/* Navigation items */}
        <div className="flex items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isMain) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -mt-7 flex flex-col items-center"
                >
                  {/* Glow effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-xl brand-gradient opacity-30 blur-xl" />
                  
                  {/* Main button - rectangular style */}
                  <div className="relative">
                    <div
                      className={cn(
                        "relative flex h-12 w-12 items-center justify-center rounded-xl",
                        "brand-gradient",
                        "shadow-lg glow-primary",
                        "border-4 border-background",
                        "transition-all duration-300 hover:scale-105 active:scale-95"
                      )}
                    >
                      <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  {/* Button label */}
                  <span className="mt-1 text-[9px] font-bold text-foreground tracking-wide uppercase">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 transition-all duration-200 rounded-xl",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
