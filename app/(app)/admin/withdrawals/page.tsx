"use client";



import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  CheckCheck,
  RotateCcw,
  Ban,
  Globe,
  Gift,
} from "lucide-react";
import Link from "next/link";

interface Withdrawal {
  id: string;
  userId: string;
  username: string;
  email: string;
  amountUSD: number;
  pointsDeducted: number;
  method: string;
  paymentDetails: string;
  status: "pending" | "completed" | "rejected";
  createdAt: Date;
  processedAt?: Date;
  ipAddress?: string | null;
  lastOfferName?: string | null;
  lastOfferwall?: string | null;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    const fetchWithdrawals = async () => {
      const { data } = await supabase
        .from('withdrawals')
        .select('*')
        .order('createdAt', { ascending: false });
        
      if (data) {
        setWithdrawals(data.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          processedAt: d.processedAt ? new Date(d.processedAt) : undefined
        })));
      }
      setLoading(false);
    };

    fetchWithdrawals();
    
    const channel = supabase.channel('withdrawals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, payload => {
          fetchWithdrawals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const updateWithdrawalStatus = async (
    id: string,
    status: "completed" | "rejected",
    refundPoints: boolean = false,
    userId?: string,
    pointsToRefund?: number
  ) => {
    setProcessing(id);
    try {
      if (status === "rejected" && refundPoints && userId && pointsToRefund) {
          const { error: refundError } = await supabase.rpc('increment_user_points', {
              user_id: userId,
              amount: pointsToRefund
          });
          if (refundError) throw refundError;
      }
      
      const { error } = await supabase.from('withdrawals').update({
        status,
        processedAt: new Date().toISOString(),
        refunded: refundPoints,
      }).eq('id', id);

      if (error) throw error;
      
      if (status === "completed") {
        toast.success("Withdrawal approved");
      } else if (refundPoints) {
        toast.success("Withdrawal rejected - Points refunded");
      } else {
        toast.success("Withdrawal rejected - No refund");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update withdrawal");
    } finally {
      setProcessing(null);
    }
  };

  // Selection handlers
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const completedWithdrawals = withdrawals.filter((w) => w.status === "completed");
  
  // Calculate total paid to users (completed withdrawals)
  const totalPaidUSD = completedWithdrawals.reduce((acc, w) => acc + (w.amountUSD || 0), 0);
  const pendingAmountUSD = pendingWithdrawals.reduce((acc, w) => acc + (w.amountUSD || 0), 0);
  
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === pendingWithdrawals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingWithdrawals.map((w) => w.id)));
    }
  };

  const approveSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("No withdrawals selected");
      return;
    }

    setMarkingAll(true);
    try {
      const idsToApprove = Array.from(selectedIds);
      const { error } = await supabase.from('withdrawals')
        .update({
          status: "completed",
          processedAt: new Date().toISOString(),
        })
        .in('id', idsToApprove);

      if (error) throw error;
      toast.success(`Approved ${selectedIds.size} withdrawals`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to approve selected");
    } finally {
      setMarkingAll(false);
    }
  };

  const markAllAsPaid = async () => {
    if (pendingWithdrawals.length === 0) {
      toast.info("No pending withdrawals");
      return;
    }

    setMarkingAll(true);
    try {
      const pendingIds = pendingWithdrawals.map((w) => w.id);
      const { error } = await supabase.from('withdrawals')
        .update({
          status: "completed",
          processedAt: new Date().toISOString(),
        })
        .in('id', pendingIds);

      if (error) throw error;
      toast.success(`Marked ${pendingWithdrawals.length} withdrawals as paid`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to mark all as paid");
    } finally {
      setMarkingAll(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <DollarSign className="h-6 w-6 text-[#3B82F6]" />
              Withdrawals
            </h1>
            <p className="text-white/50">
              Process withdrawal requests
            </p>
          </div>
        </div>
        {pendingWithdrawals.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button
                onClick={approveSelected}
                disabled={markingAll}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                {markingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approve Selected ({selectedIds.size})
              </Button>
            )}
            <Button
              onClick={markAllAsPaid}
              disabled={markingAll}
              className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-xl"
            >
              {markingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Approve All ({pendingWithdrawals.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-black text-amber-500">{pendingWithdrawals.length}</p>
            <p className="text-sm text-white/50">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-black text-[#8B5CF6]">${pendingAmountUSD.toFixed(2)}</p>
            <p className="text-sm text-white/50">Pending Amount</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-black text-emerald-500">${totalPaidUSD.toFixed(2)}</p>
            <p className="text-sm text-white/50">Total Paid to Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals List */}
      <Card className="border-white/5 bg-[#0a0a0a] rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-white">All Withdrawals</CardTitle>
              <CardDescription className="text-white/40">
                {withdrawals.length} total withdrawal requests
              </CardDescription>
            </div>
            {pendingWithdrawals.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === pendingWithdrawals.length && pendingWithdrawals.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-white/50">Select All Pending</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl bg-white/5 p-5 animate-pulse"
                >
                  <div className="h-5 w-40 bg-white/10 rounded-lg" />
                  <div className="h-5 w-20 bg-white/10 rounded-lg" />
                </div>
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <p className="py-8 text-center text-white/40">
              No withdrawal requests yet
            </p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className={`rounded-2xl border p-5 ${
                    withdrawal.status === "pending"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      {withdrawal.status === "pending" && (
                        <Checkbox
                          checked={selectedIds.has(withdrawal.id)}
                          onCheckedChange={() => toggleSelection(withdrawal.id)}
                          className="mt-1"
                        />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xl text-white">
                            ${(withdrawal.amountUSD || 0).toFixed(2)}
                          </span>
                          {getStatusBadge(withdrawal.status)}
                        </div>
                        <p className="text-sm font-medium text-white">{withdrawal.username}</p>
                        <p className="text-xs text-white/40">
                          {withdrawal.method}: {withdrawal.paymentDetails}
                        </p>
                        <p className="text-xs text-white/40">
                          {withdrawal.createdAt.toLocaleString()}
                        </p>
                        <p className="text-xs text-white/40">
                          Points deducted: {withdrawal.pointsDeducted?.toLocaleString() || 0}
                        </p>

                        {/* Anti-cheat: IP + last completed offer */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <span className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-xs font-medium text-red-400">
                            <Globe className="h-3.5 w-3.5" />
                            IP: <span className="font-mono">{withdrawal.ipAddress || "unknown"}</span>
                          </span>
                          {(withdrawal.lastOfferName || withdrawal.lastOfferwall) && (
                            <span className="flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 px-2.5 py-1 text-xs font-medium text-[#a78bfa]">
                              <Gift className="h-3.5 w-3.5" />
                              Last offer: {withdrawal.lastOfferName || "—"}
                              {withdrawal.lastOfferwall ? ` (${withdrawal.lastOfferwall})` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {withdrawal.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        {/* Approve Button */}
                        <Button
                          size="sm"
                          onClick={() =>
                            updateWithdrawalStatus(withdrawal.id, "completed", false)
                          }
                          disabled={processing === withdrawal.id}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                        >
                          {processing === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Approve
                            </>
                          )}
                        </Button>
                        
                        {/* Reject & Refund Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateWithdrawalStatus(
                              withdrawal.id,
                              "rejected",
                              true,
                              withdrawal.userId,
                              withdrawal.pointsDeducted
                            )
                          }
                          disabled={processing === withdrawal.id}
                          className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10 rounded-xl"
                        >
                          {processing === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="mr-1 h-4 w-4" />
                              Reject & Refund
                            </>
                          )}
                        </Button>
                        
                        {/* Reject No Refund Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateWithdrawalStatus(
                              withdrawal.id,
                              "rejected",
                              false
                            )
                          }
                          disabled={processing === withdrawal.id}
                          className="text-red-500 border-red-500/30 hover:bg-red-500/10 rounded-xl"
                        >
                          {processing === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Ban className="mr-1 h-4 w-4" />
                              Reject (No Refund)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
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
