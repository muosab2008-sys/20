"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Loader2 } from "lucide-react";

interface OfferRecord {
  id: string;
  offerName: string;
  points: number;
  company: string;
  date: any;
  sortMs: number;
}

function toMs(value: any): number {
  try {
    if (!value) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    const d = new Date(value);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}

function formatDate(value: any) {
  try {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return date ? date.toLocaleString() : "N/A";
  } catch {
    return "N/A";
  }
}

function normalize(id: string, d: any): OfferRecord {
  const rawDate = d.createdAt ?? d.timestamp ?? null;
  return {
    id,
    offerName: d.offerName || d.offer_name || d.name || "Offer",
    points: Number(d.points ?? d.amount ?? d.amountUSD ?? 0),
    company: d.offerwallName || d.offerwall || d.source || d.company || d.provider || "—",
    date: rawDate,
    sortMs: toMs(rawDate),
  };
}

export function ProfileOffersHistory({ userId }: { userId?: string }) {
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const fetchOffers = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(50);
        
      if (data) {
        const rows = data
          .map((d) => normalize(d.id, d))
          .sort((a, b) => b.sortMs - a.sortMs);
        setOffers(rows);
      }
      setLoading(false);
    };
    
    fetchOffers();

    const channel = supabase.channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `userId=eq.${userId}` }, payload => {
          fetchOffers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return (
    <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground text-lg">
          <Gift className="h-5 w-5 text-primary" /> Offers History
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Offers you completed and the rewards you earned
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : offers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No completed offers yet</p>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="space-y-3 sm:hidden">
              {offers.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground break-words">{o.offerName || "Offer"}</p>
                    <span className="shrink-0 font-bold text-emerald-500">
                      +{(o.points || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{o.company || "—"}</span>
                    <span>{formatDate(o.date)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop / tablet: table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                    <th className="py-3 pr-4 font-bold">Offer</th>
                    <th className="py-3 pr-4 font-bold text-right">Points</th>
                    <th className="py-3 pr-4 font-bold">Company</th>
                    <th className="py-3 font-bold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offers.map((o) => (
                    <tr key={o.id} className="hover:bg-secondary/20">
                      <td className="py-3 pr-4 font-medium text-foreground max-w-[160px] truncate">
                        {o.offerName || "Offer"}
                      </td>
                      <td className="py-3 pr-4 text-right font-bold text-emerald-500">
                        +{(o.points || 0).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground capitalize">{o.company || "—"}</td>
                      <td className="py-3 text-right text-muted-foreground whitespace-nowrap">
                        {formatDate(o.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
