"use client";

import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasConsent = localStorage.getItem("cookie_consent");
    if (!hasConsent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] p-4 sm:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 shadow-2xl">
        {/* Icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl brand-gradient flex items-center justify-center">
          <Cookie className="w-6 h-6 text-white" />
        </div>
        
        {/* Text */}
        <p className="text-sm sm:text-base text-foreground/90 text-center sm:text-left flex-1 leading-relaxed">
          We use cookies to ensure you get the best experience on our website.
        </p>
        
        {/* Accept Button */}
        <button
          onClick={handleAccept}
          className="shrink-0 px-6 py-3 rounded-xl brand-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg glow-primary"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
