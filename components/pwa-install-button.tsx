"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton({ variant = "button" }: { variant?: "button" | "card" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    
    if (isIOS && !isInStandaloneMode) {
      // Show iOS-specific install instructions
      const hasSeenIOSPrompt = localStorage.getItem("ios_pwa_prompt_seen");
      if (!hasSeenIOSPrompt) {
        setShowIOSPrompt(true);
      }
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error("Error installing PWA:", error);
    }
  };

  const dismissIOSPrompt = () => {
    localStorage.setItem("ios_pwa_prompt_seen", "true");
    setShowIOSPrompt(false);
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // iOS Install Prompt
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-[150] p-4 animate-in slide-in-from-bottom duration-500">
        <div className="max-w-md mx-auto glass-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-foreground text-sm">Install App</h3>
                <button onClick={dismissIOSPrompt} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                To install MrCash on your device: tap the share icon 
                <span className="inline-block mx-1 px-1.5 py-0.5 bg-secondary rounded text-[10px]">Share</span>
                then select &quot;Add to Home Screen&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if not installable (on desktop/unsupported browsers)
  if (!isInstallable) return null;

  // Card variant for sidebar/profile
  if (variant === "card") {
    return (
      <button
        onClick={handleInstallClick}
        className="w-full flex items-center gap-3 p-4 rounded-xl glass-card hover:bg-secondary/50 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-bold text-foreground text-sm">Install App</p>
          <p className="text-xs text-muted-foreground">Add MrCash to your device</p>
        </div>
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl brand-gradient text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-lg glow-primary"
    >
      <Download className="w-4 h-4" />
      <span>Install App</span>
    </button>
  );
}
