"use client";



import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Activity,
  Clock,
  Shield,
  Gift,
  Ticket,
  Settings,
  CheckCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Stats {
  totalUsers: number;
  activeToday: number;
  totalPaidUSD: number;
  pendingWithdrawals: number;
  pendingAmountUSD: number;
}

interface Transaction {
  id: string;
  type: "earn" | "withdraw" | "referral" | "bonus";
  userId: string;
  username: string;
  amount: number;
  createdAt: Date;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeToday: 0,
    totalPaidUSD: 0,
    pendingWithdrawals: 0,
    pendingAmountUSD: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; users: number; earnings: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      // 1. Total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // 2. Pending withdrawals
      const { data: pending } = await supabase
        .from('withdrawals')
        .select('amountUSD')
        .eq('status', 'pending');
        
      const pendingCount = pending?.length || 0;
      const pendingTotal = pending?.reduce((sum, row) => sum + (Number(row.amountUSD) || 0), 0) || 0;

      // 3. Completed withdrawals
      const { data: completed } = await supabase
        .from('withdrawals')
        .select('amountUSD')
        .eq('status', 'completed');
        
      const completedTotal = completed?.reduce((sum, row) => sum + (Number(row.amountUSD) || 0), 0) || 0;

      setStats(prev => ({
        ...prev,
        totalUsers: usersCount || 0,
        pendingWithdrawals: pendingCount,
        pendingAmountUSD: pendingTotal,
        totalPaidUSD: completedTotal,
      }));
    };
    
    fetchStats();

    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(10);
        
      if (data) {
        setRecentTransactions(data.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt || d.timestamp)
        })));
      }
      setLoading(false);
    };

    fetchTransactions();

    // Generate mock daily data for charts
    const mockDailyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        users: Math.floor(Math.random() * 50) + 10,
        earnings: Math.floor(Math.random() * 50000) + 10000,
      };
    });
    setDailyData(mockDailyData);

    // Channels
    const usersChannel = supabase.channel('dashboard_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { fetchStats(); })
      .subscribe();
      
    const withdrawalsChannel = supabase.channel('dashboard_withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => { fetchStats(); })
      .subscribe();

    const transactionsChannel = supabase.channel('dashboard_transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { fetchTransactions(); })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [supabase]);

  const adminLinks = [
    { href: "/admin/users", label: "Manage Users", icon: Users, description: "View, ban, and manage users" },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: DollarSign, description: "Process withdrawal requests" },
    { href: "/admin/giveaways", label: "Giveaways", icon: Gift, description: "Manage giveaway prizes" },
    { href: "/admin/promo", label: "Promo Codes", icon: Ticket, description: "Create and manage promo codes" },
    { href: "/admin/offerwalls", label: "Offerwalls", icon: Settings, description: "Configure offerwall settings" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Shield className="h-6 w-6 text-[#3B82F6]" />
            Admin Dashboard
          </h1>
          <p className="text-white/50">
            Monitor and manage your rewards platform
          </p>
        </div>
        <Badge className="bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 rounded-xl px-3 py-1.5">
          <Activity className="mr-1 h-3 w-3" />
          Live
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] shadow-lg shadow-[#3B82F6]/20">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/50">Total Users</p>
              <p className="text-3xl font-black text-white">
                {stats.totalUsers.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/50">Total Paid to Users</p>
              <p className="text-3xl font-black text-emerald-500">
                ${stats.totalPaidUSD.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/50">Pending Withdrawals</p>
              <p className="text-3xl font-black text-amber-500">
                {stats.pendingWithdrawals}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] shadow-lg shadow-[#8B5CF6]/20">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/50">Pending Amount</p>
              <p className="text-3xl font-black text-[#8B5CF6]">
                ${stats.pendingAmountUSD.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Daily Active Users</CardTitle>
            <CardDescription className="text-white/40">User activity over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                  <YAxis stroke="rgba(255,255,255,0.3)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: "#3B82F6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Points Earned</CardTitle>
            <CardDescription className="text-white/40">Total points earned by users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                  <YAxis stroke="rgba(255,255,255,0.3)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="earnings" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-white">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl transition-all hover:border-[#3B82F6]/30 hover:shadow-lg hover:shadow-[#3B82F6]/5">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                      <Icon className="h-6 w-6 text-[#3B82F6]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{link.label}</p>
                      <p className="text-sm text-white/40">{link.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/30" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5 text-[#3B82F6]" />
            Live Transaction Flow
          </CardTitle>
          <CardDescription className="text-white/40">Real-time transaction activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl bg-white/5 p-4 animate-pulse"
                >
                  <div className="h-5 w-40 bg-white/10 rounded-lg" />
                  <div className="h-5 w-20 bg-white/10 rounded-lg" />
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-white/40">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        tx.type === "earn"
                          ? "bg-emerald-500"
                          : tx.type === "withdraw"
                          ? "bg-amber-500"
                          : "bg-[#8B5CF6]"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{tx.username}</p>
                      <p className="text-xs text-white/40 capitalize">
                        {tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        tx.type === "withdraw" ? "text-amber-500" : "text-emerald-500"
                      }`}
                    >
                      {tx.type === "withdraw" ? "-" : "+"}${((tx.amount || 0) / 1000).toFixed(2)}
                    </p>
                    <p className="text-xs text-white/40">
                      {tx.createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
