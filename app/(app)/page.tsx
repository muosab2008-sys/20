"use client";

// Force rebuild


import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, Maximize2, ThumbsUp, ThumbsDown, Flame, Trophy, TrendingUp, Lock } from "lucide-react"; 

import Image from "next/image";

// Helper function to convert points to USD (1000 points = $1)
const pointsToUSD = (points: number) => (points / 1000).toFixed(2);

interface Offerwall { 
  id: string; 
  name: string; 
  description: string; 
  logoUrl: string; 
  avgPoints: number; 
  isActive: boolean; 
  url: string; 
  color: string;
  likes?: number;
  dislikes?: number;
  isHot?: boolean;
}

const defaultOfferwalls: Offerwall[] = [
  { id: "playtime", name: "PlayTimeSdk", description: "Play games and complete tasks to earn high rewards", logoUrl: "https://earng.net/storage/providers/zeG92gZZxlLyVw6nTwvBWeFN4eV6l1Lqy90xQzHZ.webp", avgPoints: 1200, isActive: true, url: "#", color: "#9333ea", likes: 25, dislikes: 10, isHot: true },
  { id: "pubscale", name: "PubScale", description: "Discover new apps and complete quick offers", logoUrl: "https://cashlyearn.com/storage/providers/oEfGzXHjrQMaKUZCf1uiT5tv4xvDSwVqsXsZccSl.webp", avgPoints: 850, isActive: true, url: "#", color: "#2563eb", likes: 18, dislikes: 5, isHot: false },
  { id: "gemiad", name: "GemiAd", description: "Access the highest paying tasks and complete instant surveys", logoUrl: "https://earng.net/storage/providers/5t91vghsZuzh5mBa1uDlmfpjjMH05idKJtU8VjcB.png", avgPoints: 1500, isActive: true, url: "#", color: "#ff5722", likes: 32, dislikes: 8, isHot: true },
  { id: "offery", name: "Offery", description: "Maximize your earnings with instant, verified surveys", logoUrl: "https://earng.net/storage/providers/x5v40jKJIoMPSNXMmiyTkK0eWIGXHPXSsAT2QRYb.png", avgPoints: 1600, isActive: true, url: "#", color: "#ffc107", likes: 28, dislikes: 6, isHot: false },
  { id: "adtogame", name: "AdToGame", description: "Unlock exclusive high-payout opportunities", logoUrl: "https://adtowall.com/7683/", avgPoints: 2200, isActive: true, url: "#", color: "#25D3C2", likes: 52, dislikes: 15, isHot: true },
  { id: "pixylabs", name: "PixyLabs", description: "Complete high-paying offers and tasks from PixyLabs", logoUrl: "https://offerwall.pixylabs.co/230", avgPoints: 2000, isActive: true, url: "#", color: "#6366f1", likes: 38, dislikes: 9, isHot: false },
  { id: "taskwall", name: "TaskWall", description: "Complete premium tasks and high-paying offers with TaskWall", logoUrl: "http://publishers.taskwall.io//manager/uploads/logo-2.png", avgPoints: 2100, isActive: true, url: "#", color: "#10b981", likes: 41, dislikes: 11, isHot: true },
  { id: "flexwall", name: "Flex Wall", description: "Complete high-paying offers and premium tasks with Flex Wall", logoUrl: "https://mistcash.co/assets/images/networks/69f9fedd46a09.png", avgPoints: 2200, isActive: true, url: "#", color: "#6366f1", likes: 29, dislikes: 6, isHot: false },
  { id: "tplayad", name: "Tplayad", description: "Complete high-paying offers and premium tasks with Flex Wall", logoUrl: "https://mistcash.co/assets/images/networks/68b3359a3c6e5.png", avgPoints: 2200, isActive: true, url: "#", color: "#6366f1", likes: 29, dislikes: 6, isHot: false },
  { id: "klink", name: "klink", description: "Complete premium tasks and high-paying offers with TaskWall", logoUrl: "https://assets.klink.finance/klink/klinklabs/klink-labs-dark.png", avgPoints: 2100, isActive: true, url: "#", color: "#10b981", likes: 41, dislikes: 11, isHot: true },
  { id: "clickwall", name: "clickwall", description: "Complete premium tasks and high-paying offers with TaskWall", logoUrl: "https://mistcash.co/assets/images/networks/69fb3a0a5bce7.png", avgPoints: 2100, isActive: true, url: "#", color: "#10b981", likes: 41, dislikes: 11, isHot: true },
  { id: "ovnix", name: "ovnix", description: "Complete premium tasks and high-paying offers with TaskWall", logoUrl: "https://mistcash.co/assets/images/networks/69fb831157dcd.png", avgPoints: 2100, isActive: true, url: "#", color: "#10b981", likes: 41, dislikes: 11, isHot: true },
  { id: "notik", name: "notik", description: "Complete premium tasks and high-paying offers with TaskWall", logoUrl: "https://mistcash.co/assets/images/networks/690b3e0d553c7.png", avgPoints: 2100, isActive: true, url: "#", color: "#10b981", likes: 41, dislikes: 11, isHot: true },
  { id: "upwall", name: "upwall", description: "Complete premium tasks and high-paying offers with TaskWall", logoUrl: "https://mistcash.co/assets/images/networks/6809146f505d9.png", avgPoints: 2100, isActive: true, url: "#", color: "#10b981", likes: 41, dislikes: 11, isHot: true },
  { id: "adbreak", name: "adbreak", description: "Complete premium tasks and high-paying offers with TaskWall", logoUrl: "https://dashboard.adbreakmedia.com/images/vertical_text_logo/text_bluish_transparent.png", avgPoints: 2100, isActive: true, url: "#", color: "#10b981", likes: 41, dislikes: 11, isHot: true },
];

interface VoteData {
  likes: number;
  dislikes: number;
  userVote: "like" | "dislike" | null;
}

export default function EarnPage() {
  const { userData } = useAuth();
  const [offerwalls, setOfferwalls] = useState<Offerwall[]>(defaultOfferwalls);
  const [loading, setLoading] = useState(true);
  const [activeOffer, setActiveOffer] = useState<{url: string, title: string} | null>(null);
  const [votes, setVotes] = useState<Record<string, VoteData>>({});
  const [votingId, setVotingId] = useState<string | null>(null);
  const supabase = createClient();

  // ستايت لحساب النقرات السرية والتخطي الوهمي
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [isBypassed, setIsBypassed] = useState(false);

  // استرجاع حالة التخطي عند تحميل الصفحة من المتصفح
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedBypass = localStorage.getItem("mrcash_adtogame_bypass");
      if (savedBypass === "true") {
        setIsBypassed(true);
      }
    }
  }, []);

  useEffect(() => {
    const fetchOfferwalls = async () => {
      const { data } = await supabase.from('offerwalls').select('*').order('avgPoints', { ascending: false });
      if (data && data.length > 0) {
        setOfferwalls(data.filter((w) => w.isActive));
      }
      setLoading(false);
    };
    fetchOfferwalls();
  }, [supabase]);

  useEffect(() => {
    const fetchVotes = async () => {
      const votesMap: Record<string, VoteData> = {};
      
      for (const wall of defaultOfferwalls) {
        let userVote: "like" | "dislike" | null = null;
        let likes = wall.likes || 0;
        let dislikes = wall.dislikes || 0;
        
        try {
          const { data: wallData } = await supabase.from('offerwalls').select('likes, dislikes').eq('id', wall.id).single();
          if (wallData) {
            likes = wallData.likes || 0;
            dislikes = wallData.dislikes || 0;
          }
          
          if (userData?.uid) {
            const { data: userVoteData } = await supabase.from('offerwall_votes').select('type').eq('offerwall_id', wall.id).eq('user_id', userData.uid).single();
            if (userVoteData) {
              userVote = userVoteData.type;
            }
          }
        } catch (e) {
          // ignore
        }
        
        votesMap[wall.id] = { likes, dislikes, userVote };
      }
      
      setVotes(votesMap);
    };
    
    fetchVotes();
  }, [supabase, userData?.uid]);

  const handleVote = async (wallId: string, voteType: "like" | "dislike", e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userData?.uid || votingId) return;
    
    setVotingId(wallId);
    const currentVote = votes[wallId] || { likes: 0, dislikes: 0, userVote: null };
    const newVotes = { ...votes };
    
    if (currentVote.userVote === voteType) {
      newVotes[wallId] = {
        ...currentVote,
        [voteType === "like" ? "likes" : "dislikes"]: Math.max(0, currentVote[voteType === "like" ? "likes" : "dislikes"] - 1),
        userVote: null,
      };
    } else if (currentVote.userVote) {
      newVotes[wallId] = {
        likes: voteType === "like" ? currentVote.likes + 1 : Math.max(0, currentVote.likes - 1),
        dislikes: voteType === "dislike" ? currentVote.dislikes + 1 : Math.max(0, currentVote.dislikes - 1),
        userVote: voteType,
      };
    } else {
      newVotes[wallId] = {
        ...currentVote,
        [voteType === "like" ? "likes" : "dislikes"]: currentVote[voteType === "like" ? "likes" : "dislikes"] + 1,
        userVote: voteType,
      };
    }
    setVotes(newVotes);
    
    try {
      const { data: offerData } = await supabase.from('offerwalls').select('likes, dislikes').eq('id', wallId).single();
      const { data: userVoteData } = await supabase.from('offerwall_votes').select('type').eq('offerwall_id', wallId).eq('user_id', userData.uid).single();
      
      let newLikes = offerData?.likes || 0;
      let newDislikes = offerData?.dislikes || 0;
      
      if (!offerData) {
        newLikes = voteType === "like" ? 1 : 0;
        newDislikes = voteType === "dislike" ? 1 : 0;
        await supabase.from('offerwalls').insert({ id: wallId, likes: newLikes, dislikes: newDislikes });
        await supabase.from('offerwall_votes').insert({ offerwall_id: wallId, user_id: userData.uid, type: voteType });
      } else if (!userVoteData) {
        newLikes += voteType === "like" ? 1 : 0;
        newDislikes += voteType === "dislike" ? 1 : 0;
        await supabase.from('offerwalls').update({ likes: newLikes, dislikes: newDislikes }).eq('id', wallId);
        await supabase.from('offerwall_votes').insert({ offerwall_id: wallId, user_id: userData.uid, type: voteType });
      } else {
        const existingVote = userVoteData.type;
        if (existingVote === voteType) {
          newLikes -= voteType === "like" ? 1 : 0;
          newDislikes -= voteType === "dislike" ? 1 : 0;
          await supabase.from('offerwalls').update({ likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) }).eq('id', wallId);
          await supabase.from('offerwall_votes').delete().eq('offerwall_id', wallId).eq('user_id', userData.uid);
        } else {
          newLikes += voteType === "like" ? 1 : -1;
          newDislikes += voteType === "dislike" ? 1 : -1;
          await supabase.from('offerwalls').update({ likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) }).eq('id', wallId);
          await supabase.from('offerwall_votes').update({ type: voteType }).eq('offerwall_id', wallId).eq('user_id', userData.uid);
        }
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVotingId(null);
    }
  };

  const getDynamicUrl = (wall: Offerwall) => {
    if (!userData?.uid) return "#";
    const uid = userData.uid;
    const urls: Record<string, string> = {
      playtime: `https://web.playtimeads.com/index.php?app_id=6d186de0e9e5e8d7&user_id=${uid}`,
      pubscale: `https://wow.pubscale.com?app_id=18233528&user_id=${uid}`,
      gemiad: `https://gemiwall.com/6a253b429b8d7eab85227756/${uid}`,
      offery: `https://offery.io/offerwall/wxmtheoaq6qgk8262kuarqbpqu8fe7/${uid}`,
      adtogame: `https://adtowall.com/7683/${uid}`,
      pixylabs: `https://offerwall.pixylabs.co/230?uid=${uid}`,
      taskwall: `https://wall.taskwall.io/?app_id=e723adebdbab293255deefe5fe401b43&userid=${uid}`,
      flexwall: `https://flexwall.net/iframe?app_id=490&user_id=${uid}`,
      tplayad: `https://tplayad.com/offer/Br9Dd7/${uid}`,
      klink: `https://offerwall.klinkfinance.com/wall?pub_id=a8d01294-6455-411d-8f03-cc1d716c241d&user_id=${uid}`,
      clickwall: `https://clickwall.net/app/iframe/10656/${uid}`,
      notik: `https://notik.me/coins?api_key=NofGnODVnHB3werypR5PRKx5ew8fTbB4&pub_id=Yog41D&app_id=psPQDvAS3y&user_id=${uid}`,
      ovnix: `https://offerwall.ovnix.io?pk=02AA7F9AFBA05DB22666&sub1=${uid}`,
      upwall: `https://offerwall.upwall.io/?app_id=6ff3-bd30-f8e8-4fa9&userid=${uid}`,
      adbreak: `https://wall.adbreakmedia.com/11fff2ba859f2bc8b975d98d3d93b104c5c0389ff1fed4cbded445571a0c63da/${uid}`,
    };
    return urls[wall.id] || wall.url;
  };

  const pointsPerLevel = 10000;
  const currentLevel = Math.floor((userData?.totalEarned || 0) / pointsPerLevel) + 1;
  const pointsInCurrentLevel = (userData?.totalEarned || 0) % pointsPerLevel;
  const levelProgress = (pointsInCurrentLevel / pointsPerLevel) * 100;

  // دالة زيادة عداد النقرات للثغرة السرية مع الحفظ في المتصفح
  const handleLockedCardClick = (wallId: string) => {
    if (wallId !== "adtogame" || isBypassed) return;

    const nextCount = secretClickCount + 1;
    setSecretClickCount(nextCount);

    if (nextCount >= 10) {
      setIsBypassed(true); 
      if (typeof window !== "undefined") {
        localStorage.setItem("mrcash_adtogame_bypass", "true"); // حفظ حالة الفتح تماماً هنا
      }
    }
  };

  const getLikePercentage = (likes: number = 0, dislikes: number = 0) => {
    const total = likes + dislikes;
    if (total === 0) return 50;
    return (likes / total) * 100;
  };

  if (activeOffer) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="flex items-center justify-between p-4 bg-card/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveOffer(null)} className="text-foreground rounded-xl hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-bold text-foreground text-sm">{activeOffer.title}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => window.open(activeOffer.url, '_blank')} className="text-muted-foreground rounded-xl hover:bg-secondary">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveOffer(null)} className="text-muted-foreground rounded-xl hover:bg-secondary">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <iframe src={activeOffer.url} className="w-full flex-1 border-0" title={activeOffer.title} allow="autoplay; fullscreen" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full p-4 sm:p-6"> 
      {/* Balance and Level Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className="backdrop-blur-xl bg-background/40 border border-white/10 overflow-hidden hover-lift">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary border border-border">
              <Image src="/coin.png" alt="Points" width={32} height={32} className="w-8 h-8 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-foreground">{(userData?.points ?? 0).toLocaleString()}</p>
                <span className="text-sm text-muted-foreground">MC</span>
              </div>
              <p className="text-xs text-primary font-medium">= ${pointsToUSD(userData?.points ?? 0)} USD</p>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-background/40 border border-white/10 overflow-hidden hover-lift">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl brand-gradient shadow-lg glow-primary">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground font-medium">Current Level</p>
              <p className="text-3xl font-black text-foreground">Level {currentLevel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="backdrop-blur-xl bg-background/40 border border-white/10">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 text-foreground font-bold text-sm">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <span>Level {currentLevel} Progress</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{pointsInCurrentLevel.toLocaleString()} / {pointsPerLevel.toLocaleString()} MC</span>
          </div>
          <div className="h-3 w-full bg-secondary rounded-xl overflow-hidden border border-border">
            <div className="h-full brand-gradient transition-all duration-500 rounded-xl" style={{ width: `${levelProgress}%` }}></div>
          </div>
        </CardContent>
      </Card>

      {/* Offerwalls Section */}
      <div>
        <h2 className="mb-4 text-xl font-black text-foreground tracking-tight">Earn MC</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? ( 
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">Loading...</p> 
          ) : (
            offerwalls.map((wall) => {
              const wallVotes = votes[wall.id] || { likes: wall.likes || 0, dislikes: wall.dislikes || 0, userVote: null };
              const isVoting = votingId === wall.id;
              
              // التحقق من حالة القفل
              const isLocked = wall.id === "adtogame" && currentLevel < 10 && !isBypassed;

              return (
                <div 
                  key={wall.id} 
                  onClick={() => { 
                    if (isLocked) {
                      handleLockedCardClick(wall.id);
                      return; 
                    }
                    const url = getDynamicUrl(wall); 
                    if (url !== "#") setActiveOffer({ url, title: wall.name }); 
                  }}
                  className={`relative backdrop-blur-xl bg-background/40 border p-5 rounded-2xl transition-all group ${
                    isLocked 
                      ? "border-red-500/20 bg-red-950/5 cursor-pointer select-none" 
                      : "border-white/10 cursor-pointer hover:border-primary/30 hover-lift"
                  }`}
                >
                  {/* واجهة القفل النظيفة والمطابقة لتصميم الصورة تماماً وبدون أي تلميحات */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-2xl z-10 flex flex-col items-center justify-center p-4 text-center transition-all duration-300">
                      <Lock className="h-8 w-8 text-white/90 mb-2 drop-shadow-md" />
                      <p className="text-sm font-bold text-white tracking-wide max-w-[200px] leading-tight">
                        Reach Level 10 to unlock
                      </p>
                    </div>
                  )}

                  {/* Hot Badge */}
                  {wall.isHot && !isLocked && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        Hot
                      </Badge>
                    </div>
                  )}

                  {/* Logo and Name */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/5 p-2 shrink-0 border border-white/10">
                      <img src={wall.logoUrl} alt={wall.name} className="h-full w-full object-contain" />
                    </div>
                    <span className="font-bold text-foreground text-lg">{wall.name}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/10">
                      <div 
                        className="h-full brand-gradient transition-all duration-500" 
                        style={{ width: `${getLikePercentage(wallVotes.likes, wallVotes.dislikes)}%` }}
                      ></div>
                      <div 
                        className="h-full bg-white/10" 
                        style={{ width: `${100 - getLikePercentage(wallVotes.likes, wallVotes.dislikes)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Interactive Like/Dislike Buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      disabled={!userData?.uid || isVoting || isLocked}
                      onClick={(e) => handleVote(wall.id, "like", e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        wallVotes.userVote === "like"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/5 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent"
                      } ${isVoting ? "opacity-50" : ""}`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span className="font-medium text-xs">{wallVotes.likes}</span>
                    </button>
                    <button
                      disabled={!userData?.uid || isVoting || isLocked}
                      onClick={(e) => handleVote(wall.id, "dislike", e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        wallVotes.userVote === "dislike"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-white/5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent"
                      } ${isVoting ? "opacity-50" : ""}`}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      <span className="font-medium text-xs">{wallVotes.dislikes}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
