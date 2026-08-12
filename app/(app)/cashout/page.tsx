"use client";



import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { fetchClientIp } from "@/lib/client-ip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Info, X, Wallet, ArrowRightLeft } from "lucide-react";
import Image from "next/image";

// Points to USD conversion (1000 points = $1)
const pointsToUSD = (points: number) => (points / 1000).toFixed(2);

const CASHOUT_CATEGORIES = [
  {
    title: "Cashout Methods",
    methods: [
      { 
        id: "paypal", 
        name: "PayPal", 
        icon: "https://earng.net/storage/images/oipeSzxn0qPxwAFms2XGG7K8cGO5TznxhlQ8TmcL.png", 
        minPoints: 2000, 
        inputLabel: "PayPal Email Address",
        placeholder: "example@mail.com",
        amounts: [{ points: 10000, usd: 10 }, { points: 5000, usd: 5 }, { points: 2000, usd: 2 }] 
      },
      { 
        id: "visa", 
        name: "Visa Tremendous", 
        icon: "https://earng.net/storage/images/b7e5Ish9TrqPixjxgUXjGIZfAizgbxivJTLm9Nhq.png", 
        minPoints: 1000, 
        inputLabel: "Email Address",
        placeholder: "Enter your email for the card",
        amounts: [{ points: 5000, usd: 5 }, { points: 2000, usd: 2 }, { points: 1000, usd: 1 }] 
      },
    ]
  },
  {
    title: "Crypto & Wallets",
    methods: [
      { 
        id: "faucetpay", 
        name: "FaucetPay", 
        icon: "https://earng.net/storage/temp-images/niLsNzBAPnZvq2XFAijzOc5fEXOFN0Fh1QKaE5Wv.png", 
        minPoints: 50, 
        inputLabel: "FaucetPay Email Address",
        placeholder: "Enter FaucetPay email",
        amounts: [{ points: 1000, usd: 1 }, { points: 500, usd: 0.5 }, { points: 50, usd: 0.05 }] 
      },
      { 
        id: "binance", 
        name: "Binance", 
        icon: "https://earng.net/storage/images/ZweowA5mo9MrohnCYKI3VkCfJGZwbVLBbH24QUXU.png", 
        minPoints: 50, 
        inputLabel: "Binance Pay ID / Email",
        placeholder: "Enter Binance ID or Email",
        amounts: [{ points: 1000, usd: 1 }, { points: 500, usd: 0.5 }, { points: 50, usd: 0.05 }] 
      },
      { 
        id: "litecoin", 
        name: "Litecoin", 
        icon: "https://earng.net/storage/images/c2YcgB4WR4QIpNjZWXULqMcthmyUQHKMg9o1Wnl6.png", 
        minPoints: 2000, 
        inputLabel: "LTC Wallet Address",
        placeholder: "Enter your LTC address",
        amounts: [{ points: 10000, usd: 10 }, { points: 5000, usd: 5 }, { points: 2000, usd: 2 }] 
      },
      { 
        id: "cwallet", 
        name: "cWallet", 
        icon: "https://earng.net/storage/images/CVMa2olhLqSdi0DhCsurT7qVZNzubx0Bv6yjaWE7.png", 
        minPoints: 50, 
        inputLabel: "cWallet ID / Email",
        placeholder: "Enter cWallet ID or Email",
        amounts: [{ points: 1000, usd: 1 }, { points: 500, usd: 0.5 }, { points: 50, usd: 0.05 }]
      },
    ]
  },
  {
    title: "Gift Cards",
    methods: [
      { id: "amazon", name: "Amazon", icon: "https://earng.net/storage/images/HjLzhYmDg1Kul5979jLDii0BCfiQdE8Z2fzaLFWT.png", minPoints: 1000, inputLabel: "Email Address", placeholder: "Email for delivery", amounts: [{ points: 5000, usd: 5 }, { points: 1000, usd: 1 }] },
      { id: "google", name: "Google Play US", icon: "https://earng.net/storage/images/cR9c5tKppt6nWks7U1WS2Hp2S10zX6gPHMEuYPII.png", minPoints: 5000, inputLabel: "Email Address", placeholder: "Email for delivery", amounts: [{ points: 10000, usd: 10 }, { points: 5000, usd: 5 }] },
      { id: "itunes", name: "iTunes Apple", icon: "https://earng.net/storage/images/fEtLXen6YAH82wW1uS5osza3t1APXcKINWrCOixH.png", minPoints: 5000, inputLabel: "Email Address", placeholder: "Email for delivery", amounts: [{ points: 10000, usd: 10 }, { points: 5000, usd: 5 }] },
    ]
  },
  {
    title: "Skins & Gaming",
    methods: [
      { id: "pubg", name: "PUBG Mobile", icon: "https://earng.net/storage/temp-images/33d2d2cjBBy67mkJkMPfREmBUtBkBy9drOEFBYPu.png", minPoints: 1000, inputLabel: "Player ID", placeholder: "Enter PUBG ID", amounts: [{ points: 5000, usd: 5 }, { points: 1000, usd: 1 }] },
      { id: "freefire", name: "Free Fire", icon: "https://earng.net/storage/images/OfIJyyst0nKyLpnm1yR12w3DUuNbhTJBIy9A3nXG.png", minPoints: 1000, inputLabel: "Player ID", placeholder: "Enter Free Fire ID", amounts: [{ points: 5000, usd: 5 }, { points: 1000, usd: 1 }] },
    ]
  }
];

export default function CashoutPage() {
  const { userData, refreshUserData } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [selectedAmount, setSelectedAmount] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [displayMode, setDisplayMode] = useState<"points" | "usd">("points");
  const supabase = createClient();

  const handleOpenWithdraw = (method: any) => {
    setSelectedMethod(method);
    setSelectedAmount(null);
    setPaymentDetails("");
    setIsModalOpen(true);
  };

  const submitWithdrawal = async () => {
    if (!userData || !selectedAmount || !paymentDetails) return toast.error("Please fill all details");
    if ((userData.points || 0) < selectedAmount.points) return toast.error("Insufficient balance");

    setSubmitting(true);
    try {
      // Capture the current device IP for anti-cheat tracking.
      const ipAddress = await fetchClientIp();

      // Grab the user's most recent completed offer to attach for admin review.
      let lastOfferName: string | null = null;
      let lastOfferwall: string | null = null;
      try {
        const { data: lastOfferSnap, error: lastOfferErr } = await supabase
          .from("transactions")
          .select("offerName, offerwallName, offerwall")
          .eq("userId", userData.uid)
          .order("createdAt", { ascending: false })
          .limit(1)
          .single();
          
        if (!lastOfferErr && lastOfferSnap) {
          lastOfferName = lastOfferSnap.offerName || null;
          lastOfferwall = lastOfferSnap.offerwallName || lastOfferSnap.offerwall || null;
        }
      } catch (err) {
        console.log("[v0] cashout: last offer lookup failed:", err);
      }

      // Call the API route since we shouldn't do complex auth logic client side
      // if we are mutating points (to prevent client manipulation)
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.uid,
          methodName: selectedMethod.name,
          pointsDeducted: selectedAmount.points,
          amountUSD: selectedAmount.usd,
          paymentDetails,
          ipAddress,
          lastOfferName,
          lastOfferwall,
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
          throw new Error(result.error || "Failed to process withdrawal");
      }

      await refreshUserData();
      toast.success("Withdrawal request submitted!");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  const userPoints = userData?.points || 0;

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 max-w-6xl mx-auto min-h-screen text-foreground pb-24">
      
      {/* Header & Balance */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4">
        <div className="flex-1 glass-card p-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Withdraw Funds</h1>
          <p className="text-muted-foreground text-sm font-medium">Choose your preferred withdrawal method below.</p>
        </div>

        <div className="lg:w-80 glass-card p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-12 h-12 text-primary" />
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Available Balance</span>
            <button
              onClick={() => setDisplayMode(displayMode === "points" ? "usd" : "points")}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRightLeft className="w-3 h-3" />
              Switch
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <Image src="/coin.png" alt="Points" width={36} height={36} className="w-9 h-9 object-contain" />
            </div>
            <div>
              <span className="text-4xl font-black block">
                {displayMode === "points" 
                  ? userPoints.toLocaleString()
                  : `$${pointsToUSD(userPoints)}`
                }
              </span>
              <span className="text-xs text-muted-foreground">
                {displayMode === "points" 
                  ? `= $${pointsToUSD(userPoints)} USD`
                  : `= ${userPoints.toLocaleString()} PTS`
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Info */}
      <Card className="glass-card p-4 flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Image src="/coin.png" alt="Points" width={20} height={20} className="w-5 h-5" />
          <span className="font-bold text-foreground">1000 PTS</span>
        </div>
        <span className="text-muted-foreground">=</span>
        <span className="font-bold text-primary">$1.00 USD</span>
      </Card>

      {/* Methods Grid */}
      {CASHOUT_CATEGORIES.map((cat) => (
        <div key={cat.title} className="space-y-4">
          <div className="flex items-center gap-3 ml-1">
            <div className="w-1 h-5 brand-gradient rounded-full" />
            <h2 className="text-lg font-bold">{cat.title}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {cat.methods.map((method) => (
              <Card 
                key={method.id} 
                onClick={() => handleOpenWithdraw(method)} 
                className="glass-card p-5 hover:border-primary/30 transition-all cursor-pointer group hover-lift flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-xl bg-secondary p-2 flex items-center justify-center border border-border">
                  <img src={method.icon} alt={method.name} className="h-10 w-10 object-contain group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors text-center">{method.name}</span>
                <span className="text-[9px] text-primary font-bold">Min: {method.minPoints.toLocaleString()} PTS</span>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Info: history moved to Profile page */}
      <Card className="glass-card p-4 flex items-center justify-center gap-3 text-sm">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <span className="text-muted-foreground">
          View your full withdrawal history in your{" "}
          <a href="/profile" className="text-primary font-semibold hover:underline">Profile</a> page.
        </span>
      </Card>

      {/* Withdrawal Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border border-border text-foreground rounded-2xl sm:max-w-[440px] p-0 overflow-hidden shadow-2xl">
          <DialogTitle className="sr-only">Withdraw to {selectedMethod?.name}</DialogTitle>
          
          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary p-2 flex items-center justify-center border border-border">
                <img src={selectedMethod?.icon} alt="" className="max-h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-base">{selectedMethod?.name}</h3>
                <p className="text-[10px] text-muted-foreground font-medium">Min: {(selectedMethod?.minPoints || 0).toLocaleString()} PTS</p>
              </div>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="bg-secondary p-2 rounded-xl hover:bg-secondary/80 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Info Banner */}
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <p className="text-[11px] font-medium text-primary/80">Requests are processed within 24 hours.</p>
            </div>

            {/* Amount Selection */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Select Amount</span>
              <div className="grid grid-cols-3 gap-3">
                {selectedMethod?.amounts?.map((amt: any) => (
                  <button 
                    key={amt.points} 
                    onClick={() => setSelectedAmount(amt)}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1 ${
                      selectedAmount?.points === amt.points 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border bg-secondary/30 hover:border-primary/30'
                    }`}
                  >
                    <span className="font-black text-xl">{amt.points.toLocaleString()}</span>
                    <span className="text-[9px] font-medium text-muted-foreground">PTS = ${amt.usd}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Details Input */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">{selectedMethod?.inputLabel}</span>
              <Input 
                placeholder={selectedMethod?.placeholder} 
                value={paymentDetails} 
                onChange={(e) => setPaymentDetails(e.target.value)}
                className="bg-secondary/30 border-border h-14 rounded-xl focus:border-primary/50 transition-all font-medium px-5 placeholder:text-muted-foreground" 
              />
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">You will receive</span>
              <div className="text-right">
                <div className="text-3xl font-black text-primary">${selectedAmount ? selectedAmount.usd.toFixed(2) : '0.00'}</div>
                <div className="text-xs text-muted-foreground">{selectedAmount ? selectedAmount.points.toLocaleString() : 0} PTS</div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-5 pt-0">
            <Button 
              className="w-full h-14 brand-gradient hover:opacity-90 text-white font-bold rounded-xl transition-all text-sm flex gap-2 shadow-lg glow-primary"
              onClick={submitWithdrawal} 
              disabled={submitting || !selectedAmount || !paymentDetails}
            >
              {submitting ? <Loader2 className="animate-spin" /> : <>Withdraw Now</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
