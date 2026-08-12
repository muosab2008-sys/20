"use client";



import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users,
  Search,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Copy,
  ArrowLeft,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface User {
  uid: string;
  username: string;
  email: string;
  points: number;
  fragments: number;
  level: number;
  totalEarned: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: Date;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const supabase = createClient();
  
  // Points dialog state
  const [pointsDialog, setPointsDialog] = useState<{
    open: boolean;
    type: "add" | "deduct";
    user: User | null;
  }>({ open: false, type: "add", user: null });
  const [pointsAmount, setPointsAmount] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false });
        
      if (data) {
        setUsers(data.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt)
        })));
      }
      setLoading(false);
    };

    fetchUsers();
    
    const channel = supabase.channel('users_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
          fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const toggleBan = async (user: User) => {
    setUpdatingUser(user.uid);
    try {
      const { error } = await supabase.from('users').update({
        isBanned: !user.isBanned,
      }).eq('uid', user.uid);
      
      if (error) throw error;
      toast.success(user.isBanned ? "User unbanned" : "User banned");
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setUpdatingUser(null);
    }
  };

  const toggleAdmin = async (user: User) => {
    setUpdatingUser(user.uid);
    try {
      const { error } = await supabase.from('users').update({
        isAdmin: !user.isAdmin,
      }).eq('uid', user.uid);
      
      if (error) throw error;
      toast.success(user.isAdmin ? "Admin removed" : "Admin granted");
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setUpdatingUser(null);
    }
  };

  const copyUserId = async (uid: string) => {
    await navigator.clipboard.writeText(uid);
    toast.success("User ID copied");
  };

  const openPointsDialog = (user: User, type: "add" | "deduct") => {
    setPointsDialog({ open: true, type, user });
    setPointsAmount("");
  };

  const closePointsDialog = () => {
    setPointsDialog({ open: false, type: "add", user: null });
    setPointsAmount("");
  };

  const handlePointsAction = async () => {
    const amount = parseInt(pointsAmount);
    if (isNaN(amount) || amount <= 0 || !pointsDialog.user) {
      toast.error("Please enter a valid amount");
      return;
    }

    setUpdatingUser(pointsDialog.user.uid);
    try {
      if (pointsDialog.type === "add") {
          const { error } = await supabase.rpc('increment_user_points', {
              user_id: pointsDialog.user.uid,
              amount: amount
          });
          if (error) throw error;
          
          const { error: earnError } = await supabase.rpc('increment_user_earned', {
              user_id: pointsDialog.user.uid,
              amount: amount
          });
          if (earnError) throw earnError;
      } else {
           const { error } = await supabase.rpc('increment_user_points', {
              user_id: pointsDialog.user.uid,
              amount: -amount
          });
          if (error) throw error;
      }

      toast.success(
        pointsDialog.type === "add"
          ? `Added ${amount.toLocaleString()} points to ${pointsDialog.user.username}`
          : `Deducted ${amount.toLocaleString()} points from ${pointsDialog.user.username}`
      );
      closePointsDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to update points");
    } finally {
      setUpdatingUser(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
     (user.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.uid || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--brand-cyan)]" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            View and manage all registered users
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by username, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[var(--brand-cyan)]">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">
              {users.filter((u) => !u.isBanned).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {users.filter((u) => u.isBanned).length}
            </p>
            <p className="text-sm text-muted-foreground">Banned Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-secondary p-4 animate-pulse"
                >
                  <div className="h-5 w-40 bg-muted rounded" />
                  <div className="h-5 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No users found
            </p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.uid}
                  className={`rounded-lg border p-4 transition-colors ${
                    user.isBanned
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border bg-secondary"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{user.username || "Unknown User"}</span>
                        {user.isAdmin && (
                          <Badge className="bg-[var(--brand-cyan)]/10 text-[var(--brand-cyan)] border-0 text-xs">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {user.isBanned && (
                          <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
                            <Ban className="mr-1 h-3 w-3" />
                            Banned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email || "No Email Provided"}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {user.uid.slice(0, 12)}...
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyUserId(user.uid)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <p className="font-bold text-[var(--brand-cyan)]">
                            {user.points?.toLocaleString() ?? "0"}
                          </p>
                          <p className="text-xs text-muted-foreground">Points</p>
                        </div>
                        <div>
                          <p className="font-bold text-[var(--brand-purple)]">
                            {user.fragments?.toLocaleString() ?? "0"}
                          </p>
                          <p className="text-xs text-muted-foreground">Fragments</p>
                        </div>
                        <div>
                          <p className="font-bold text-amber-500">Lv.{user.level}</p>
                          <p className="text-xs text-muted-foreground">Level</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Add/Deduct Points Buttons */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPointsDialog(user, "add")}
                          disabled={updatingUser === user.uid}
                          className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPointsDialog(user, "deduct")}
                          disabled={updatingUser === user.uid}
                          className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                        >
                          <Minus className="mr-1 h-4 w-4" />
                          Deduct
                        </Button>
                        
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-muted-foreground">Admin</span>
                          <Switch
                            checked={user.isAdmin}
                            onCheckedChange={() => toggleAdmin(user)}
                            disabled={updatingUser === user.uid}
                          />
                        </div>
                        <Button
                          variant={user.isBanned ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => toggleBan(user)}
                          disabled={updatingUser === user.uid}
                        >
                          {user.isBanned ? (
                            <>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Unban
                            </>
                          ) : (
                            <>
                              <Ban className="mr-1 h-4 w-4" />
                              Ban
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Points Dialog */}
      <Dialog open={pointsDialog.open} onOpenChange={closePointsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pointsDialog.type === "add" ? (
                <>
                  <Plus className="h-5 w-5 text-emerald-500" />
                  Add Points
                </>
              ) : (
                <>
                  <Minus className="h-5 w-5 text-orange-500" />
                  Deduct Points
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {pointsDialog.type === "add" ? "Add" : "Deduct"} points{" "}
              {pointsDialog.type === "add" ? "to" : "from"}{" "}
              <span className="font-semibold text-foreground">
                {pointsDialog.user?.username}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Current Balance:</span>
              <span className="font-bold text-[var(--brand-cyan)]">
                {pointsDialog.user?.points?.toLocaleString() || 0} points
              </span>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Amount to {pointsDialog.type === "add" ? "add" : "deduct"}
              </label>
              <Input
                type="number"
                placeholder="Enter points amount"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                min="1"
              />
            </div>

            {pointsAmount && !isNaN(parseInt(pointsAmount)) && parseInt(pointsAmount) > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">New Balance:</p>
                <p className={`text-lg font-bold ${pointsDialog.type === "add" ? "text-emerald-500" : "text-orange-500"}`}>
                  {(
                    (pointsDialog.user?.points || 0) +
                    (pointsDialog.type === "add" ? parseInt(pointsAmount) : -parseInt(pointsAmount))
                  ).toLocaleString()}{" "}
                  points
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePointsDialog}>
              Cancel
            </Button>
            <Button
              onClick={handlePointsAction}
              disabled={updatingUser === pointsDialog.user?.uid}
              className={
                pointsDialog.type === "add"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }
            >
              {updatingUser === pointsDialog.user?.uid ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : pointsDialog.type === "add" ? (
                <Plus className="mr-2 h-4 w-4" />
              ) : (
                <Minus className="mr-2 h-4 w-4" />
              )}
              {pointsDialog.type === "add" ? "Add Points" : "Deduct Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
