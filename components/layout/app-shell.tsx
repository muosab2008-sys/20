"use client";

import { useState, ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { GlobalFooter } from "./global-footer";
import { CommunityChat } from "@/components/community-chat";
import { PointsNotificationBanner } from "@/components/points-notification-banner";
import { LiveFeedTicker } from "@/components/live-feed-ticker";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col lg:flex-row bg-transparent text-white overflow-hidden">
      
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        
        {/* Header - Sticky at top */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCollapsed={sidebarCollapsed}
        />

        {/* محتوى الصفحة الرئيسي */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

      </div> {/* 👈 هنا قمنا بإغلاق الـ div الخاص بـ Main content area بشكل صحيح */}

      {/* Bottom navigation - Mobile only */}
      <BottomNav />
      
      {/* Community Chat - Floating */}
      <CommunityChat />
      
      {/* Points Notification Banner - Top Right */}
      <PointsNotificationBanner />
    </div>
  );
}
