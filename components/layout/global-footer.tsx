"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Globe, Send } from "lucide-react";

export function GlobalFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 backdrop-blur-xl bg-background/40 pt-12 pb-10 w-full px-4 sm:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        
        {/* Brand Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-xl" loading="eager" priority />
            <span className="text-2xl font-black brand-gradient-text tracking-tight">
              MrCash
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            The premier destination for turning tasks into real digital rewards securely and instantly.
          </p>
        </div>

        {/* Trust Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Trust</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" /> Secure Encryption
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="w-4 h-4 text-primary" /> Global Payouts
            </div>
          </div>
        </div>

        {/* Legal Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Legal</h4>
          <nav className="flex flex-col gap-3">
            <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </nav>
        </div>

        {/* Community Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Community</h4>
          <a 
            href="https://t.me/+HaIWYiOHx-FkNzY0" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-4 p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 hover:border-primary/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-white/10 group-hover:brand-gradient transition-colors">
              <Send className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground uppercase">Telegram</span>
              <span className="text-[10px] text-muted-foreground font-medium">Official Channel</span>
            </div>
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-10 pt-6 border-t border-white/10 text-center">
        <p className="text-[10px] font-mono text-muted-foreground tracking-widest">
          2026 MR.CASH - ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
}
