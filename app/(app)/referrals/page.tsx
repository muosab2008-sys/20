"use client";



import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Copy, Share2, Gift, UserPlus, CheckCircle } from "lucide-react";
import Image from "next/image";

// Points to USD conversion
const pointsToUSD = (points: number) => (points / 1000).toFixed(2);

interface Referral {
  uid: string;
  username: string;
  totalEarned: number;
  createdAt: Date;
}

export default function ReferralsPage() {
  const { userData } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${userData?.uid || ""}`
    : "";

  const referralCode = userData?.uid || "";

  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, "users"),
      where("referredBy", "==", userData.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const refs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            username: data.username,
            totalEarned: data.totalEarned || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        }) as Referral[];
        setReferrals(refs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userData?.uid]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join MrCash",
          text: "Earn rewards with MrCash! Use my referral link to get started:",
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  const commissionRate = 0.1;
  const totalReferralEarnings = referrals.reduce((acc, ref) => acc + ref.totalEarned, 0);
  const totalCommissionEarned = Math.floor(totalReferralEarnings * commissionRate);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referral Program</h1>
        <p className="text-muted-foreground">
          Invite friends and earn 10% of everything they earn!
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl brand-gradient shadow-lg glow-primary">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-3xl font-black text-foreground">
                {referrals.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary border border-border">
              <Image src="/coin.png" alt="Points" width={32} height={32} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commission Earned</p>
              <p className="text-3xl font-black text-primary">
                {totalCommissionEarned.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">= ${pointsToUSD(totalCommissionEarned)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Gift className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commission Rate</p>
              <p className="text-3xl font-black text-amber-500">10%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="glass-card border-primary/20">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Share2 className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Share this link with friends to earn commission on their earnings
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="flex-1 font-mono text-sm h-12 rounded-xl bg-secondary/30 border-border"
            />
            <Button
              variant="outline"
              onClick={() => copyToClipboard(referralLink, "Referral link")}
              className="rounded-xl h-12 border-border hover:bg-secondary"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              onClick={shareLink}
              className="brand-gradient text-white h-12 rounded-xl px-6"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-border" />
            <span className="text-sm text-muted-foreground">or use code</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="flex-1 font-mono text-center text-lg font-bold tracking-wider h-12 rounded-xl bg-secondary/30 border-border"
            />
            <Button
              variant="outline"
              onClick={() => copyToClipboard(referralCode, "Referral code")}
              className="rounded-xl h-12 border-border hover:bg-secondary"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card className="glass-card">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              Your Referrals
            </CardTitle>
            <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1">{referrals.length} users</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-secondary/30 p-4 animate-pulse"
                >
                  <div className="h-5 w-32 bg-secondary rounded-lg" />
                  <div className="h-5 w-20 bg-secondary rounded-lg" />
                </div>
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground">
                Share your referral link to start earning commission!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.uid}
                  className="flex items-center justify-between rounded-xl bg-secondary/30 p-4 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{referral.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {referral.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Earned</p>
                    <p className="font-black text-lg text-primary">
                      {referral.totalEarned.toLocaleString()} MC
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card className="glass-card">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Gift className="h-5 w-5 text-primary" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">1</span>
              Share your unique referral link or code with friends.
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">2</span>
              When they sign up using your link, they become your referral.
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">3</span>
              You earn 10% commission on every point they earn - instantly!
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">4</span>
              {"There's no limit - the more friends you invite, the more you earn!"}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
