"use client";



import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarSelector } from "@/components/avatar-selector";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { ProfileOffersHistory } from "@/components/profile-offers-history";
import { EnablePushNotifications } from "@/components/enable-push-notifications";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Trophy,
  Calendar,
  Shield,
  Loader2,
  Save,
  Copy,
  Camera,
  TrendingUp,
  Gift,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  Globe,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";

// Points to USD conversion
const pointsToUSD = (points: number) => (points / 1000).toFixed(2);

type ProfileTab = "account" | "activity" | "avatar" | "security";

export default function ProfilePage() {
  const { userData, updateUserProfile, updateUserEmail, updateUserPassword, updateUserAvatar, logout } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [username, setUsername] = useState(userData?.username || "");
  const [email, setEmail] = useState(userData?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(userData?.photoURL || null);

  // Activity logs
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);

  const currentLevelThreshold = (userData?.level || 1) * 10000;
  const previousLevelThreshold = ((userData?.level || 1) - 1) * 10000;
  const pointsInCurrentLevel = (userData?.totalEarned || 0) - previousLevelThreshold;
  const pointsNeededForLevel = currentLevelThreshold - previousLevelThreshold;
  const levelProgress = Math.min((pointsInCurrentLevel / pointsNeededForLevel) * 100, 100);

  useEffect(() => {
    if (!userData?.uid) return;

    const fetchWithdrawals = async () => {
      const { data } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('userId', userData.uid)
        .order('createdAt', { ascending: false })
        .limit(50);
      
      if (data) {
        setWithdrawals(data);
      }
      setLoadingWithdrawals(false);
    };

    fetchWithdrawals();
    
    const channel = supabase.channel('withdrawals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `userId=eq.${userData.uid}` }, payload => {
          fetchWithdrawals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.uid, supabase]);

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    setLoading("username");
    try {
      await updateUserProfile(username);
      toast.success("Username updated successfully");
    } catch {
      toast.error("Failed to update username");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      toast.error("Email cannot be empty");
      return;
    }
    setLoading("email");
    try {
      await updateUserEmail(email);
      toast.success("Email updated successfully");
    } catch {
      toast.error("Failed to update email. You may need to re-login.");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading("password");
    try {
      await updateUserPassword(newPassword);
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to update password. You may need to re-login.");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveSelectedAvatar = async () => {
    if (!selectedAvatar || selectedAvatar === userData?.photoURL) {
      toast.info("No changes to save");
      return;
    }
    setLoading("avatar-select");
    try {
      await updateUserAvatar(selectedAvatar);
      toast.success("Avatar updated successfully");
    } catch {
      toast.error("Failed to update avatar");
    } finally {
      setLoading(null);
    }
  };

  const copyUserId = async () => {
    if (userData?.uid) {
      await navigator.clipboard.writeText(userData.uid);
      toast.success("User ID copied to clipboard");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.uid) return;

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please use PNG or JPEG only.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File is too large. Maximum size is 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading("avatar");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userData.uid);

      const response = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      const { url } = await response.json();
      await updateUserAvatar(url);
      toast.success("Profile picture updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatDate = (value: any) => {
    try {
      const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
      return date ? date.toLocaleString() : "N/A";
    } catch {
      return "N/A";
    }
  };

  const withdrawalStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg">
            <CheckCircle className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "rejected":
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
            <XCircle className="mr-1 h-3 w-3" /> {status === "failed" ? "Failed" : "Rejected"}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  const tabs: { id: ProfileTab; label: string; icon: any }[] = [
    { id: "account", label: "Account", icon: User },
    { id: "activity", label: "Activity & Rewards", icon: Gift },
    { id: "avatar", label: "Avatar", icon: ImageIcon },
    { id: "security", label: "Security (2FA)", icon: Shield },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      {/* Header with Avatar */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-4 border-primary/30 rounded-xl">
            <AvatarImage src={userData?.photoURL || ""} alt={userData?.username || "User"} className="rounded-xl" />
            <AvatarFallback className="text-2xl brand-gradient text-white rounded-xl">
              {userData?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading === "avatar"}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-lg brand-gradient text-white shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground">{userData?.username || "Profile"}</h1>
          <p className="text-muted-foreground">Manage your account, settings, and activity in one place</p>
          {userData?.isAdmin && (
            <Badge className="mt-2 bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1">
              <Shield className="mr-1 h-3 w-3" /> Administrator
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary border border-border">
              <Image src="/coin.png" alt="Points" width={32} height={32} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-2xl font-black text-foreground">{(userData?.points || 0).toLocaleString()}</p>
              <p className="text-xs text-primary">= ${pointsToUSD(userData?.points || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Trophy className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-2xl font-black text-amber-500">{userData?.level || 1}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl brand-gradient shadow-lg glow-primary">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-black text-primary">{(userData?.totalEarned || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">= ${pointsToUSD(userData?.totalEarned || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary border border-border">
              <Calendar className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="text-lg font-bold text-foreground">{userData?.createdAt?.toLocaleDateString() || "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="font-bold text-foreground">Level {userData?.level || 1} Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {pointsInCurrentLevel.toLocaleString()} / {pointsNeededForLevel.toLocaleString()} MC
            </span>
          </div>
          <div className="h-3 w-full bg-secondary rounded-xl overflow-hidden border border-border">
            <div className="h-full brand-gradient transition-all duration-500 rounded-xl" style={{ width: `${levelProgress}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 rounded-2xl bg-secondary/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACCOUNT TAB */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* User ID */}
          <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                <Shield className="h-5 w-5 text-primary" /> Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">User ID</p>
                <div className="flex gap-2">
                  <Input value={userData?.uid || ""} readOnly className="font-mono text-sm h-12 rounded-xl bg-secondary/30 border-border" />
                  <Button variant="outline" onClick={copyUserId} className="rounded-xl h-12 border-border hover:bg-secondary">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {userData?.lastLoginIp && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Last Login IP</p>
                  <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-secondary/30 border border-border">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm text-foreground">{userData.lastLoginIp}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Update Username */}
          <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                <User className="h-5 w-5 text-primary" /> Update Username
              </CardTitle>
              <CardDescription className="text-muted-foreground">Change your display name</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex gap-2">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="h-12 rounded-xl bg-secondary/30 border-border focus:border-primary/50"
                />
                <Button onClick={handleUpdateUsername} disabled={loading === "username"} className="brand-gradient text-white h-12 rounded-xl px-6">
                  {loading === "username" ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Save className="mr-2 h-4 w-4" /> Save</>)}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Update Email */}
          <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                <Mail className="h-5 w-5 text-primary" /> Update Email
              </CardTitle>
              <CardDescription className="text-muted-foreground">Change your email address</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter new email"
                  className="h-12 rounded-xl bg-secondary/30 border-border focus:border-primary/50"
                />
                <Button onClick={handleUpdateEmail} disabled={loading === "email"} className="brand-gradient text-white h-12 rounded-xl px-6">
                  {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Save className="mr-2 h-4 w-4" /> Save</>)}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Update Password */}
          <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                <Lock className="h-5 w-5 text-primary" /> Update Password
              </CardTitle>
              <CardDescription className="text-muted-foreground">Change your account password</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="h-12 rounded-xl bg-secondary/30 border-border focus:border-primary/50"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-12 rounded-xl bg-secondary/30 border-border focus:border-primary/50"
              />
              <Button onClick={handleUpdatePassword} disabled={loading === "password"} className="brand-gradient text-white h-12 rounded-xl">
                {loading === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Save className="mr-2 h-4 w-4" /> Update Password</>)}
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="backdrop-blur-xl bg-background/40 border border-destructive/20">
            <CardContent className="p-5">
              <Button
                variant="destructive"
                onClick={logout}
                className="w-full h-12 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ACTIVITY & REWARDS TAB */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          {/* Offers Log (from offers_history) */}
          <ProfileOffersHistory userId={userData?.uid} />

          {/* Withdrawals Log */}
          <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                <Wallet className="h-5 w-5 text-primary" /> My Withdrawal History
              </CardTitle>
              <CardDescription className="text-muted-foreground">Your withdrawal requests and their status</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loadingWithdrawals ? (
                <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : withdrawals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No withdrawal requests yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                        <th className="py-3 pr-4 font-bold">Amount</th>
                        <th className="py-3 pr-4 font-bold">Method</th>
                        <th className="py-3 pr-4 font-bold">Status</th>
                        <th className="py-3 pr-4 font-bold">IP Address</th>
                        <th className="py-3 font-bold text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-secondary/20">
                          <td className="py-3 pr-4">
                            <span className="font-bold text-foreground">${(w.amountUSD ?? 0).toFixed(2)}</span>
                            <span className="block text-[10px] text-muted-foreground">{(w.pointsDeducted || 0).toLocaleString()} PTS</span>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{w.method || "—"}</td>
                          <td className="py-3 pr-4">{withdrawalStatusBadge(w.status)}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{w.ipAddress || "—"}</td>
                          <td className="py-3 text-right text-muted-foreground whitespace-nowrap">{formatDate(w.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AVATAR TAB */}
      {activeTab === "avatar" && (
        <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <ImageIcon className="h-5 w-5 text-primary" /> Change Your Avatar
            </CardTitle>
            <CardDescription className="text-muted-foreground">Select a new avatar from our collection</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-6">
            <AvatarSelector selectedAvatar={selectedAvatar} onSelect={setSelectedAvatar} />
            <Button
              onClick={handleSaveSelectedAvatar}
              disabled={loading === "avatar-select" || selectedAvatar === userData?.photoURL}
              className="w-full h-12 rounded-xl brand-gradient text-white font-bold"
            >
              {loading === "avatar-select" ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>) : (<><Save className="mr-2 h-5 w-5" /> Save Changes</>)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SECURITY TAB */}
      {activeTab === "security" && userData && (
        <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Shield className="h-5 w-5 text-primary" /> Two-Factor Authentication
            </CardTitle>
            <CardDescription className="text-muted-foreground">Secure your account with an extra layer of protection</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <TwoFactorSetup
              userId={userData.uid}
              email={userData.email}
              isEnabled={userData.twoFactorEnabled}
              onComplete={() => window.location.reload()}
            />
            <div className="mt-6 pt-6 border-t border-border">
              <p className="mb-3 text-sm font-medium text-foreground">Browser Notifications</p>
              <EnablePushNotifications />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
