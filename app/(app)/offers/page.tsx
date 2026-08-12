"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */



import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  ExternalLink, 
  Search, 
  LayoutGrid, 
  List, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2, 
  TrendingUp,
  Info,
  CheckCircle2,
  Milestone
} from "lucide-react";

interface OfferTask {
  taskName: string;
  points: any; 
}

interface Offer {
  id: string;
  name: string;
  description: string;
  provider: string;
  payout: number;
  mcPoints: any; 
  image?: string;
  url: string;
  steps?: string[];
  requirements?: string;
  multiTasks?: OfferTask[]; 
}

interface OfferVotes {
  likes: number;
  dislikes: number;
  userVote: "like" | "dislike" | null;
}

export default function OffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("points-high");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [votes, setVotes] = useState<Record<string, OfferVotes>>({});
  const [votingOfferId, setVotingOfferId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const supabase = createClient();

  // 1. 🌐 جلب البيانات وعرض نقاط الشركة الخام القادمة مباشرة 100%
  useEffect(() => {
    async function fetchOffersDirectly() {
      setLoading(true);
      try {
        const currentUid = user ? user.uid : "demo-user-1";
        const notikUrl = new URL("https://notik.me/api/v1/live-campaigns-for-user");
        
        notikUrl.searchParams.append("api_key", "NofGnODVnHB3werypR5PRKx5ew8fTbB4");
        notikUrl.searchParams.append("pub_id", "Yog41D");
        notikUrl.searchParams.append("app_id", "psPQDvAS3y");
        notikUrl.searchParams.append("user_id", currentUid);

        const response = await fetch(notikUrl.toString());
        if (!response.ok) throw new Error("Failed to fetch from Notik");

        const result = await response.json();
        const campaigns = result.campaigns || result.data || [];
        
        if (Array.isArray(campaigns) && campaigns.length > 0) {

          const formattedOffers = campaigns.map((campaign: any, index: number) => {
            const offerId = campaign.campaign_id || campaign.id || `notik-offer-${index}`;
            const realPayout = Number(campaign.payout) || 0;

            // نأخذ القيمة كما هي تماماً من الشركة بدون لمسها
            const companyPoints = campaign.points !== undefined ? campaign.points : realPayout;

            let extractedSteps: string[] = [];
            if (campaign.steps && Array.isArray(campaign.steps)) {
              extractedSteps = campaign.steps;
            } else if (campaign.action) {
              extractedSteps = [campaign.action];
            }

            // 🛠️ دالة الفحص الشاملة لاستخراج قيم النقاط الحقيقية من داخل أحداث شركة Notik مهما اختلف المسمى
            const getTaskPointsRaw = (item: any) => {
              if (!item) return 0;
              
              // قائمة المفاتيح المحتملة بالترتيب
              const keysToCheck = [
                'points', 'amount', 'reward', 'bonus', 'pub_bonus', 
                'user_payout', 'payout', 'credits', 'value', 'mcPoints'
              ];
              
              for (const key of keysToCheck) {
                if (item[key] !== undefined && item[key] !== null && item[key] !== 0 && item[key] !== "0") {
                  return item[key];
                }
              }
              
              // في حال أرسلت الشركة رقم الحدث كقيمة نصية أو رقمية أخرى داخل الـ Object
              const objectValues = Object.keys(item);
              for (const k of objectValues) {
                if (k.toLowerCase().includes('point') || k.toLowerCase().includes('reward') || k.toLowerCase().includes('amt')) {
                  return item[k];
                }
              }
              
              return item.points !== undefined ? item.points : 0;
            };

            let parsedTasks: OfferTask[] = [];
            if (campaign.events && Array.isArray(campaign.events)) {
              parsedTasks = campaign.events.map((ev: any) => ({
                taskName: ev.event_name || ev.description || ev.name || ev.title || "Task Requirement",
                points: getTaskPointsRaw(ev)
              }));
            } else if (campaign.requirements_items && Array.isArray(campaign.requirements_items)) {
              parsedTasks = campaign.requirements_items.map((item: any) => ({
                taskName: item.taskName || item.description || item.name || item.title || "Task Requirement",
                points: getTaskPointsRaw(item)
              }));
            }

            return {
              id: String(offerId),
              name: campaign.name || campaign.title || "Offer",
              description: campaign.description || campaign.action || "Complete the required actions inside the offer.",
              provider: "Notik",
              payout: realPayout,
              mcPoints: companyPoints, 
              image: campaign.image_url || campaign.icon_url || "/placeholder.svg",
              url: campaign.url || campaign.click_url,
              steps: extractedSteps,
              requirements: campaign.requirements || campaign.description || "Follow the offer details closely.",
              multiTasks: parsedTasks.length > 0 ? parsedTasks : undefined
            };
          });

          const uniqueOffers = formattedOffers.filter(
            (offer, idx, self) => self.findIndex((o) => o.id === offer.id) === idx
          );

          setOffers(uniqueOffers);
        } else {
          setOffers([]);
        }
      } catch (error) {
        console.error("Error fetching directly from Notik API:", error);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOffersDirectly();
  }, [user]);

  // 2. 🛡️ جلب التصويتات من Supabase
  useEffect(() => {
    if (offers.length === 0) return;

    async function fetchAllVotes() {
      try {
        const { data: offerwallsData, error: offerwallsError } = await supabase
          .from('offerwalls')
          .select('id, likes, dislikes');
          
        if (offerwallsError) throw offerwallsError;

        let userVotesData: any[] = [];
        if (user) {
          const { data, error } = await supabase
            .from('offerwall_votes')
            .select('offerwall_id, type')
            .eq('user_id', user.uid);
            
          if (error) throw error;
          userVotesData = data || [];
        }

        const fetchedVotes: Record<string, OfferVotes> = {};

        for (const offerwall of offerwallsData || []) {
          const userVoteObj = userVotesData.find(v => v.offerwall_id === offerwall.id);
          fetchedVotes[offerwall.id] = {
            likes: offerwall.likes || 0,
            dislikes: offerwall.dislikes || 0,
            userVote: userVoteObj ? userVoteObj.type : null,
          };
        }

        setVotes(fetchedVotes);
      } catch (error) {
        console.error("Error fetching votes:", error);
      }
    }

    fetchAllVotes();
  }, [offers, user, supabase]);

  const handleStartOffer = useCallback((baseUrl: string) => {
    if (!user) {
      alert("Please log in first to earn points!");
      return;
    }

    let finalUrl = baseUrl;
    if (finalUrl.includes("[USER_ID]")) {
      finalUrl = finalUrl.replace("[USER_ID]", user.uid);
    } else if (!finalUrl.includes("user_id=") && !finalUrl.includes("subId=")) {
      const separator = finalUrl.includes("?") ? "&" : "?";
      finalUrl = `${finalUrl}${separator}user_id=${user.uid}`;
    }

    window.open(finalUrl, "_blank");
  }, [user]);

  const handleVote = useCallback(async (offerId: string, voteType: "like" | "dislike", e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    setVotingOfferId(offerId);
    try {
      
      const { data: offerSnap, error: offerErr } = await supabase
        .from('offerwalls')
        .select('*')
        .eq('id', offerId)
        .single();

      if (offerErr && offerErr.code !== 'PGRST116') {
        throw offerErr;
      }

      const { data: userVoteSnap, error: userVoteErr } = await supabase
        .from('offerwall_votes')
        .select('type')
        .eq('offerwall_id', offerId)
        .eq('user_id', user.uid)
        .single();
        
      if (userVoteErr && userVoteErr.code !== 'PGRST116') {
          throw userVoteErr;
      }
      
      if (!offerSnap) {
        // Create offerwall record if it doesn't exist
        await supabase.from('offerwalls').insert({
          id: offerId,
          likes: voteType === "like" ? 1 : 0,
          dislikes: voteType === "dislike" ? 1 : 0,
        });
        
        await supabase.from('offerwall_votes').insert({
          offerwall_id: offerId,
          user_id: user.uid,
          type: voteType
        });
      } else if (!userVoteSnap) {
        // Update counts using RPC or fallback to direct update (subject to race conditions without RPC)
         await supabase.rpc('increment_offerwall_vote', {
             p_offerwall_id: offerId,
             p_column_name: voteType === "like" ? "likes" : "dislikes",
             p_amount: 1
         });

        await supabase.from('offerwall_votes').insert({
          offerwall_id: offerId,
          user_id: user.uid,
          type: voteType
        });
      } else {
        const existingVote = userVoteSnap.type;
        if (existingVote === voteType) {
          // Remove vote
          await supabase.rpc('increment_offerwall_vote', {
             p_offerwall_id: offerId,
             p_column_name: voteType === "like" ? "likes" : "dislikes",
             p_amount: -1
         });
          await supabase.from('offerwall_votes').delete().eq('offerwall_id', offerId).eq('user_id', user.uid);
        } else {
          // Change vote
           await supabase.rpc('increment_offerwall_vote', {
             p_offerwall_id: offerId,
             p_column_name: existingVote === "like" ? "likes" : "dislikes",
             p_amount: -1
         });
          await supabase.rpc('increment_offerwall_vote', {
             p_offerwall_id: offerId,
             p_column_name: voteType === "like" ? "likes" : "dislikes",
             p_amount: 1
         });
          await supabase.from('offerwall_votes').update({ type: voteType }).eq('offerwall_id', offerId).eq('user_id', user.uid);
        }
      }

      setVotes((prev) => {
        const current = prev[offerId] || { likes: 0, dislikes: 0, userVote: null };
        const isSelected = current.userVote === voteType;
        return {
          ...prev,
          [offerId]: {
            likes: voteType === "like" ? (isSelected ? current.likes - 1 : current.likes + 1) : (current.userVote === "like" ? current.likes - 1 : current.likes),
            dislikes: voteType === "dislike" ? (isSelected ? current.dislikes - 1 : current.dislikes + 1) : (current.userVote === "dislike" ? current.dislikes - 1 : current.dislikes),
            userVote: isSelected ? null : voteType
          }
        };
      });
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVotingOfferId(null);
    }
  }, [user, supabase]);

  const filteredOffers = useMemo(() => {
    return offers
      .filter((offer) => {
        return offer.name.toLowerCase().includes(search.toLowerCase()) ||
               offer.description.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => {
        const pointsA = Number(a.mcPoints) || 0;
        const pointsB = Number(b.mcPoints) || 0;
        if (sortBy === "points-high") return pointsB - pointsA;
        if (sortBy === "points-low") return pointsA - pointsB;
        if (sortBy === "popular") {
          const aLikes = votes[a.id]?.likes || 0;
          const bLikes = votes[b.id]?.likes || 0;
          return bLikes - aLikes;
        }
        return a.name.localeCompare(b.name);
      });
  }, [offers, search, sortBy, votes]);

  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6 text-white selection:bg-primary/30">
        
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Available Offers</h1>
        <p className="text-white/50 text-sm mt-1">Complete offers and earn MC instantly</p>
      </div>

      {/* Filters & Search */}
      <div className="backdrop-blur-xl bg-background/40 border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search offers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-primary"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-48 h-12 rounded-xl bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a]/95 text-white border-white/10">
              <SelectItem value="points-high">Highest MC</SelectItem>
              <SelectItem value="points-low">Lowest MC</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex rounded-xl border border-white/10 overflow-hidden bg-white/5">
            <Button variant="ghost" onClick={() => setViewMode("grid")} className={`px-4 h-12 rounded-none ${viewMode === "grid" ? "bg-primary/20 text-primary" : "text-white/50"}`}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant="ghost" onClick={() => setViewMode("list")} className={`px-4 h-12 rounded-none ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-white/50"}`}><List className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-white/60">
        <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" />{filteredOffers.length} offers available</span>
      </div>

      {/* Grid/List Offers */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-56 bg-white/5 border border-white/10 animate-pulse rounded-2xl" />)}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="backdrop-blur-xl bg-background/40 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-white/50 text-lg">No offers found</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
          {filteredOffers.map((offer) => {
            const offerVotes = votes[offer.id] || { likes: 0, dislikes: 0, userVote: null };
            const isVoting = votingOfferId === offer.id;
            
            return (
              <Card key={offer.id} onClick={() => setSelectedOffer(offer)} className="backdrop-blur-xl bg-background/40 border border-white/10 rounded-2xl hover:border-primary/40 transition-all duration-300 group overflow-hidden cursor-pointer relative">
                <CardContent className={`p-5 flex ${viewMode === "list" ? "flex-row items-center gap-6" : "flex-col"} h-full`}>
                  <div className={`flex items-center gap-4 ${viewMode === "list" ? "flex-1" : "mb-4"}`}>
                    <img src={offer.image || "/placeholder.svg"} alt={offer.name} className="w-14 h-14 rounded-xl object-cover border border-white/10 bg-white/5 shadow-md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">{offer.name}</h3>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{offer.provider}</p>
                    </div>
                  </div>

                  {viewMode === "grid" && <p className="text-white/50 text-sm line-clamp-2 mb-4 flex-grow leading-relaxed">{offer.description}</p>}

                  <div className={`flex items-center w-full ${viewMode === "list" ? "justify-end gap-6" : "justify-between mt-auto"}`}>
                    <div className="flex items-center gap-2">
                      <img src="/coin.png" alt="MC Coin" className="h-5 w-5 object-contain" />
                      <span className="text-white font-black text-lg">{offer.mcPoints}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" disabled={!user || isVoting} onClick={(e) => handleVote(offer.id, "like", e)} className={`h-9 px-3 rounded-lg ${offerVotes.userVote === "like" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/50"}`}>
                        {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ThumbsUp className="h-4 w-4 mr-1" />{offerVotes.likes}</>}
                      </Button>
                      <Button variant="ghost" size="sm" disabled={!user || isVoting} onClick={(e) => handleVote(offer.id, "dislike", e)} className={`h-9 px-3 rounded-lg ${offerVotes.userVote === "dislike" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/5 text-white/50"}`}>
                        {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ThumbsDown className="h-4 w-4 mr-1" />{offerVotes.dislikes}</>}
                      </Button>
                      <Button className="rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold px-5 h-9" onClick={(e) => { e.stopPropagation(); handleStartOffer(offer.url); }}><ExternalLink className="h-4 w-4 mr-1.5" />Start</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="bg-[#0b0b0c] border border-white/10 text-white max-w-xl rounded-2xl p-6 backdrop-blur-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
          {selectedOffer && (
            <>
              <DialogHeader className="flex flex-row items-center gap-4 text-left">
                <img src={selectedOffer.image || "/placeholder.svg"} alt={selectedOffer.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedOffer.name}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-white/40">Provided by <span className="text-primary font-medium">{selectedOffer.provider}</span></DialogDescription>
                </div>
              </DialogHeader>

              <hr className="border-white/10 my-2" />

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Description</h4>
                <p className="text-sm text-white/60 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">{selectedOffer.description}</p>
              </div>

              {selectedOffer.multiTasks && selectedOffer.multiTasks.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2"><Milestone className="h-4 w-4 text-primary" /> Multi-Rewards Breakdown</h4>
                  <div className="space-y-2 bg-white/5 p-2 rounded-xl border border-white/5">
                    {selectedOffer.multiTasks.map((task, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                        <span className="text-sm text-white/80 font-medium">{task.taskName}</span>
                        <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                          + {task.points} MC
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Requirements & Steps</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedOffer.steps && selectedOffer.steps.length > 0 ? (
                      selectedOffer.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-start gap-3">
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold mt-0.5">{idx + 1}</span>
                            <p className="text-sm text-white/80 max-w-[340px]">{step}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-white/80 leading-relaxed">
                        {selectedOffer.requirements}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between gap-4 border-t border-white/10 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Total Max Reward:</span>
                  <div className="flex items-center gap-1.5">
                    <img src="/coin.png" alt="MC Coin" className="h-5 w-5 object-contain" />
                    <span className="text-lg font-black text-primary">{selectedOffer.mcPoints}</span>
                  </div>
                </div>
                <Button className="flex-1 max-w-xs h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" onClick={() => handleStartOffer(selectedOffer.url)}><ExternalLink className="h-4 w-4" />Earn Reward Now</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
