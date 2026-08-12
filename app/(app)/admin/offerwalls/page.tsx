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
  Settings,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface Offerwall {
  id: string;
  name: string;
  description: string;
  url: string;
  postbackUrl: string;
  pointsPerFragment: number;
  avgPoints: number;
  color: string;
  isActive: boolean;
  createdAt: Date;
}

export default function AdminOfferwallsPage() {
  const [offerwalls, setOfferwalls] = useState<Offerwall[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    postbackUrl: "",
    pointsPerFragment: "10",
    avgPoints: "500",
    color: "#00D4FF",
  });

  useEffect(() => {
    const fetchOfferwalls = async () => {
      const { data } = await supabase
        .from('offerwalls')
        .select('*')
        .order('createdAt', { ascending: false });
        
      if (data) {
        setOfferwalls(data.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt)
        })));
      }
      setLoading(false);
    };

    fetchOfferwalls();
    
    const channel = supabase.channel('offerwalls_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offerwalls' }, payload => {
          fetchOfferwalls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const createOfferwall = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error("Please fill in name and URL");
      return;
    }

    setCreating(true);
    try {
      const id = formData.name.toLowerCase().replace(/\s+/g, "-");
      
      const { error } = await supabase.from('offerwalls').insert({
        id,
        name: formData.name,
        description: formData.description,
        url: formData.url,
        postbackUrl: formData.postbackUrl,
        pointsPerFragment: parseInt(formData.pointsPerFragment) || 10,
        avgPoints: parseInt(formData.avgPoints) || 500,
        color: formData.color,
        isActive: true,
      });

      if (error) throw error;

      toast.success("Offerwall created!");
      setFormData({
        name: "",
        description: "",
        url: "",
        postbackUrl: "",
        pointsPerFragment: "10",
        avgPoints: "500",
        color: "#00D4FF",
      });
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create offerwall");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (wall: Offerwall) => {
    try {
      const { error } = await supabase.from('offerwalls').update({
        isActive: !wall.isActive,
      }).eq('id', wall.id);
      
      if (error) throw error;
      toast.success(wall.isActive ? "Offerwall disabled" : "Offerwall enabled");
    } catch (error: any) {
      toast.error(error.message || "Failed to update offerwall");
    }
  };

  const updateFragments = async (wall: Offerwall, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return;

    try {
      const { error } = await supabase.from('offerwalls').update({
        pointsPerFragment: num,
      }).eq('id', wall.id);
      
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const deleteOfferwall = async (id: string) => {
    try {
      const { error } = await supabase.from('offerwalls').delete().eq('id', id);
      
      if (error) throw error;
      toast.success("Offerwall deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete offerwall");
    }
  };

  // Generate postback URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const postbackExample = `${baseUrl}/api/postback?userId={user_id}&points={points}&offerwall={offerwall_name}&txid={transaction_id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-[var(--brand-cyan)]" />
              Offerwalls
            </h1>
            <p className="text-muted-foreground">
              Configure offerwall integrations
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="brand-gradient text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Offerwall
        </Button>
      </div>

      {/* Postback URL Info */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Postback URL Format</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="block rounded-lg bg-secondary p-3 text-xs break-all">
            {postbackExample}
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            Use this format when setting up postbacks in your offerwall provider dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Create Form */}
      {showForm && (
        <Card className="border-[var(--brand-cyan)]/30 bg-card">
          <CardHeader>
            <CardTitle>Add New Offerwall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Name (e.g., OfferToro)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Input
                placeholder="Offerwall URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
              <Input
                placeholder="Average Points per Offer"
                type="number"
                value={formData.avgPoints}
                onChange={(e) => setFormData({ ...formData, avgPoints: e.target.value })}
              />
              <Input
                placeholder="Fragments per Task"
                type="number"
                value={formData.pointsPerFragment}
                onChange={(e) => setFormData({ ...formData, pointsPerFragment: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20"
                />
                <span className="text-sm text-muted-foreground">Brand Color</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createOfferwall}
                disabled={creating}
                className="brand-gradient text-primary-foreground"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Offerwall"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offerwalls List */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Configured Offerwalls</CardTitle>
          <CardDescription>{offerwalls.length} offerwalls</CardDescription>
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
          ) : offerwalls.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No offerwalls configured yet
            </p>
          ) : (
            <div className="space-y-3">
              {offerwalls.map((wall) => (
                <div
                  key={wall.id}
                  className={`rounded-lg border p-4 ${
                    wall.isActive
                      ? "border-border bg-secondary"
                      : "border-border bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: wall.color }}
                      >
                        {wall.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{wall.name}</span>
                          {!wall.isActive && (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {wall.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[var(--brand-purple)]" />
                        <Input
                          type="number"
                          value={wall.pointsPerFragment}
                          onChange={(e) => updateFragments(wall, e.target.value)}
                          className="w-20 h-8 text-center"
                        />
                        <span className="text-xs text-muted-foreground">
                          frags/task
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(wall.url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      <Switch
                        checked={wall.isActive}
                        onCheckedChange={() => toggleActive(wall)}
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteOfferwall(wall.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
