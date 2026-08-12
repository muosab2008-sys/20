"use client";



import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Copy,
  Coins,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface PromoCode {
  id: string;
  code: string;
  pointsReward: number;
  fragmentsReward: number;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  createdAt: Date;
}

export default function AdminPromoPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const supabase = createClient();
  
  // Form state
  const [newCode, setNewCode] = useState("");
  const [newPoints, setNewPoints] = useState("");
  const [newFragments, setNewFragments] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");

  useEffect(() => {
    const fetchCodes = async () => {
      const { data } = await supabase
        .from('promoCodes')
        .select('*')
        .order('createdAt', { ascending: false });
        
      if (data) {
        setPromoCodes(data.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt)
        })));
      }
      setLoading(false);
    };

    fetchCodes();
    
    const channel = supabase.channel('promo_codes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promoCodes' }, payload => {
          fetchCodes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const createPromoCode = async () => {
    if (!newCode.trim()) {
      toast.error("Please enter a code");
      return;
    }

    const points = parseInt(newPoints) || 0;
    const fragments = parseInt(newFragments) || 0;
    const maxUses = parseInt(newMaxUses) || 0;

    if (points === 0 && fragments === 0) {
      toast.error("Please enter at least points or fragments reward");
      return;
    }

    setCreating(true);
    try {
      const codeId = newCode.toUpperCase();
      const { error } = await supabase.from('promoCodes').insert({
        id: codeId,
        code: codeId,
        pointsReward: points,
        fragmentsReward: fragments,
        maxUses: maxUses,
        usesCount: 0,
        isActive: true,
      });

      if (error) throw error;

      toast.success("Promo code created!");
      setNewCode("");
      setNewPoints("");
      setNewFragments("");
      setNewMaxUses("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create promo code");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (code: PromoCode) => {
    try {
      const { error } = await supabase.from('promoCodes').update({
        isActive: !code.isActive,
      }).eq('id', code.id);
      
      if (error) throw error;
      toast.success(code.isActive ? "Code deactivated" : "Code activated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update code");
    }
  };

  const deleteCode = async (id: string) => {
    try {
      const { error } = await supabase.from('promoCodes').delete().eq('id', id);
      if (error) throw error;
      toast.success("Promo code deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete code");
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

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
            <Ticket className="h-6 w-6 text-[var(--brand-cyan)]" />
            Promo Codes
          </h1>
          <p className="text-muted-foreground">
            Create and manage promotional codes
          </p>
        </div>
      </div>

      {/* Create New Code */}
      <Card className="border-[var(--brand-cyan)]/30 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              placeholder="CODE"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="uppercase font-mono"
            />
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Points"
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Fragments"
                value={newFragments}
                onChange={(e) => setNewFragments(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="number"
              placeholder="Max Uses (0 = unlimited)"
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
            />
            <Button
              onClick={createPromoCode}
              disabled={creating}
              className="brand-gradient text-primary-foreground"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codes List */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
          <CardDescription>{promoCodes.length} codes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-secondary p-4 animate-pulse"
                >
                  <div className="h-5 w-40 bg-muted rounded" />
                  <div className="h-5 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : promoCodes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No promo codes yet
            </p>
          ) : (
            <div className="space-y-3">
              {promoCodes.map((code) => (
                <div
                  key={code.id}
                  className={`rounded-lg border p-4 ${
                    code.isActive
                      ? "border-border bg-secondary"
                      : "border-border bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{code.code}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {!code.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-[var(--brand-cyan)]" />
                          <span>{code.pointsReward}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-[var(--brand-purple)]" />
                          <span>{code.fragmentsReward}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {code.usesCount}/{code.maxUses || "∞"} uses
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={code.isActive}
                          onCheckedChange={() => toggleActive(code)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteCode(code.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
