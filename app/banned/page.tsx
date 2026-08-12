"use client";



import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, LogOut } from "lucide-react";

export default function BannedPage() {
  const { userData, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userData && !userData.isBanned) {
      router.push("/");
    }
  }, [userData, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-destructive bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image
              src="/logo.png"
              alt="MrCash"
              width={64}
              height={64}
              className="rounded-xl opacity-50"
            />
          </div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">Account Banned</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your account has been suspended due to a violation of our terms of service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="text-sm text-muted-foreground">
              If you believe this is a mistake, please contact our support team
              for assistance.
            </p>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
