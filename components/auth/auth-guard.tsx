"use client";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || userData?.isBanned)) {
      router.push("/login");
    } else if (!loading && requireAdmin && !userData?.isAdmin) {
      router.push("/");
    }
  }, [user, userData, loading, requireAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-cyan)] border-t-transparent" />
      </div>
    );
  }

  if (!user || userData?.isBanned) {
    return null;
  }

  if (requireAdmin && !userData?.isAdmin) {
    return null;
  }

  return <>{children}</>;
}
