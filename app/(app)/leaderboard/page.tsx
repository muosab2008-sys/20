"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { Crown, Medal, Trophy, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LeaderboardUser {
  uid: string;
  username: string;
  photoURL: string | null;
  points: number;
  level: number;
}

const USERS_PER_PAGE = 10;

export default function LeaderboardPage() {
  const [topThree, setTopThree] = useState<LeaderboardUser[]>([]);
  const [restUsers, setRestUsers] = useState<LeaderboardUser[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Calculate level from totalEarned
  const calculateLevel = (totalEarned: number) => Math.floor(totalEarned / 10000) + 1;

  // Fetch initial leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const usersRef = collection(db, "users");
        
        // Get top 3
        const topQuery = query(
          usersRef,
          where("points", ">", 0),
          orderBy("points", "desc"),
          limit(3)
        );
        const topSnapshot = await getDocs(topQuery);
        const topUsers = topSnapshot.docs.map((doc) => ({
          uid: doc.id,
          username: doc.data().username,
          photoURL: doc.data().photoURL,
          points: doc.data().points,
          level: doc.data().level || calculateLevel(doc.data().totalEarned || 0),
        }));
        setTopThree(topUsers);

        // Get next batch (after top 3)
        if (topSnapshot.docs.length === 3) {
          const lastTopDoc = topSnapshot.docs[2];
          const restQuery = query(
            usersRef,
            where("points", ">", 0),
            orderBy("points", "desc"),
            startAfter(lastTopDoc),
            limit(USERS_PER_PAGE)
          );
          const restSnapshot = await getDocs(restQuery);
          const restUsersList = restSnapshot.docs.map((doc) => ({
            uid: doc.id,
            username: doc.data().username,
            photoURL: doc.data().photoURL,
            points: doc.data().points,
            level: doc.data().level || calculateLevel(doc.data().totalEarned || 0),
          }));
          setRestUsers(restUsersList);
          
          if (restSnapshot.docs.length > 0) {
            setLastDoc(restSnapshot.docs[restSnapshot.docs.length - 1]);
          }
          setHasMore(restSnapshot.docs.length === USERS_PER_PAGE);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Load more users
  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;

    setLoadingMore(true);
    try {
      const usersRef = collection(db, "users");
      const moreQuery = query(
        usersRef,
        where("points", ">", 0),
        orderBy("points", "desc"),
        startAfter(lastDoc),
        limit(USERS_PER_PAGE)
      );
      const snapshot = await getDocs(moreQuery);
      const moreUsers = snapshot.docs.map((doc) => ({
        uid: doc.id,
        username: doc.data().username,
        photoURL: doc.data().photoURL,
        points: doc.data().points,
        level: doc.data().level || calculateLevel(doc.data().totalEarned || 0),
      }));

      setRestUsers((prev) => [...prev, ...moreUsers]);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === USERS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more users:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Top earners in the MrCash community</p>
        </div>

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <div className="relative pt-8 pb-4">
            <div className="flex items-end justify-center gap-4">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-[#C0C0C0] shadow-lg shadow-[#C0C0C0]/20">
                      {topThree[1].photoURL ? (
                        <Image
                          src={topThree[1].photoURL}
                          alt={topThree[1].username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <span className="text-2xl font-bold text-muted-foreground">
                            {(topThree[1].username || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#C0C0C0] flex items-center justify-center shadow-lg">
                      <Medal className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 text-center min-w-[100px]">
                    <p className="font-bold text-foreground truncate max-w-[100px]">{topThree[1].username || "User"}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                      Lv.{topThree[1].level}
                    </span>
                    <p className="text-sm font-bold text-[#C0C0C0] mt-1">{topThree[1].points.toLocaleString()} pts</p>
                  </div>
                  <div className="w-24 sm:w-28 h-20 bg-gradient-to-t from-[#C0C0C0]/30 to-[#C0C0C0]/10 rounded-t-xl mt-3 flex items-center justify-center">
                    <span className="text-4xl font-black text-[#C0C0C0]">2</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center -mt-4">
                  <div className="relative mb-3">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-[#FFD700] shadow-lg shadow-[#FFD700]/30">
                      {topThree[0].photoURL ? (
                        <Image
                          src={topThree[0].photoURL}
                          alt={topThree[0].username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <span className="text-3xl font-bold text-muted-foreground">
                            {(topThree[0].username || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-lg">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="bg-card border border-[#FFD700]/30 rounded-xl p-4 text-center min-w-[120px] shadow-lg shadow-[#FFD700]/10">
                    <p className="font-bold text-foreground truncate max-w-[120px] text-lg">{topThree[0].username || "User"}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                      Lv.{topThree[0].level}
                    </span>
                    <p className="text-sm font-bold text-[#FFD700] mt-1">{topThree[0].points.toLocaleString()} pts</p>
                  </div>
                  <div className="w-28 sm:w-32 h-28 bg-gradient-to-t from-[#FFD700]/30 to-[#FFD700]/10 rounded-t-xl mt-3 flex items-center justify-center">
                    <span className="text-5xl font-black text-[#FFD700]">1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-[#CD7F32] shadow-lg shadow-[#CD7F32]/20">
                      {topThree[2].photoURL ? (
                        <Image
                          src={topThree[2].photoURL}
                          alt={topThree[2].username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <span className="text-2xl font-bold text-muted-foreground">
                            {(topThree[2].username || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#CD7F32] flex items-center justify-center shadow-lg">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 text-center min-w-[100px]">
                    <p className="font-bold text-foreground truncate max-w-[100px]">{topThree[2].username || "User"}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                      Lv.{topThree[2].level}
                    </span>
                    <p className="text-sm font-bold text-[#CD7F32] mt-1">{topThree[2].points.toLocaleString()} pts</p>
                  </div>
                  <div className="w-24 sm:w-28 h-16 bg-gradient-to-t from-[#CD7F32]/30 to-[#CD7F32]/10 rounded-t-xl mt-3 flex items-center justify-center">
                    <span className="text-4xl font-black text-[#CD7F32]">3</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rest of Leaderboard */}
        {restUsers.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-bold text-foreground">Rankings</h2>
            </div>
            <div className="divide-y divide-border">
              {restUsers.map((user, index) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                >
                  {/* Rank */}
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <span className="font-bold text-muted-foreground">
                      {index + 4}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <span className="text-lg font-bold text-muted-foreground">
                          {(user.username || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{user.username || "User"}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                      Lv.{user.level}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">{user.points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t border-border">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Show More
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {topThree.length === 0 && restUsers.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">No rankings yet</h3>
            <p className="text-muted-foreground">Start earning points to appear on the leaderboard!</p>
          </div>
        )}
      </div>
    </div>
  );
}
