"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Settings, DollarSign, Gift, Users } from "lucide-react";

interface PlatformSettings {
  pointsPerUsd: number;
  minWithdrawal: number;
  referralBonus: number;
  referralCommission: number;
  dailyBonusEnabled: boolean;
  dailyBonusPoints: number;
  levelUpBonus: number;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  withdrawalsEnabled: boolean;
}

const defaultSettings: PlatformSettings = {
  pointsPerUsd: 1000,
  minWithdrawal: 5000,
  referralBonus: 100,
  referralCommission: 10,
  dailyBonusEnabled: true,
  dailyBonusPoints: 10,
  levelUpBonus: 50,
  maintenanceMode: false,
  registrationEnabled: true,
  withdrawalsEnabled: true,
};

export default function AdminSettingsPage() {
  const { userData } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'platform')
        .single();
        
      if (error && error.code !== 'PGRST116') { // Record not found
         throw error;
      }
        
      if (data) {
        setSettings({ ...defaultSettings, ...data });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        id: 'platform',
        ...settings,
      });

      if (error) throw error;
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!userData?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-cyan)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure your MrCash platform</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Points & Withdrawal Settings */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[var(--brand-cyan)]" />
              Points & Withdrawals
            </CardTitle>
            <CardDescription>Configure points conversion and withdrawal settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Points per $1 USD</label>
              <Input
                type="number"
                value={settings.pointsPerUsd}
                onChange={(e) => updateSetting("pointsPerUsd", parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">How many points users earn per $1 from offerwalls</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Withdrawal (points)</label>
              <Input
                type="number"
                value={settings.minWithdrawal}
                onChange={(e) => updateSetting("minWithdrawal", parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Minimum points required to withdraw</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Withdrawals</label>
                <p className="text-xs text-muted-foreground">Allow users to withdraw</p>
              </div>
              <Switch
                checked={settings.withdrawalsEnabled}
                onCheckedChange={(checked) => updateSetting("withdrawalsEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Referral Settings */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--brand-purple)]" />
              Referral Program
            </CardTitle>
            <CardDescription>Configure referral bonuses and commissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Signup Bonus (points)</label>
              <Input
                type="number"
                value={settings.referralBonus}
                onChange={(e) => updateSetting("referralBonus", parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Points given to referrer when someone signs up</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Commission Rate (%)</label>
              <Input
                type="number"
                value={settings.referralCommission}
                onChange={(e) => updateSetting("referralCommission", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground">Percentage of referral earnings given to referrer</p>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Settings */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[var(--brand-cyan)]" />
              Bonuses
            </CardTitle>
            <CardDescription>Configure daily and level bonuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Daily Bonus</label>
                <p className="text-xs text-muted-foreground">Enable daily login bonus</p>
              </div>
              <Switch
                checked={settings.dailyBonusEnabled}
                onCheckedChange={(checked) => updateSetting("dailyBonusEnabled", checked)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Daily Bonus Points</label>
              <Input
                type="number"
                value={settings.dailyBonusPoints}
                onChange={(e) => updateSetting("dailyBonusPoints", parseInt(e.target.value) || 0)}
                disabled={!settings.dailyBonusEnabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Level Up Bonus (points)</label>
              <Input
                type="number"
                value={settings.levelUpBonus}
                onChange={(e) => updateSetting("levelUpBonus", parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Bonus points when user levels up</p>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[var(--brand-purple)]" />
              System
            </CardTitle>
            <CardDescription>System-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Maintenance Mode</label>
                <p className="text-xs text-muted-foreground">Disable site access for users</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => updateSetting("maintenanceMode", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Registration</label>
                <p className="text-xs text-muted-foreground">Allow new user signups</p>
              </div>
              <Switch
                checked={settings.registrationEnabled}
                onCheckedChange={(checked) => updateSetting("registrationEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="brand-gradient text-primary-foreground"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Postback URL Information */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Postback URLs</CardTitle>
          <CardDescription>Use these URLs to configure your offerwalls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">Credit Postback:</p>
            <code className="block overflow-x-auto rounded bg-background p-2 text-xs">
              {typeof window !== "undefined" ? window.location.origin : ""}/api/postback?wall=WALL_NAME&user_id=USER_ID&transaction_id=TX_ID&payout=AMOUNT&offer_name=OFFER
            </code>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">Chargeback Postback:</p>
            <code className="block overflow-x-auto rounded bg-background p-2 text-xs">
              {typeof window !== "undefined" ? window.location.origin : ""}/api/postback/chargeback?wall=WALL_NAME&user_id=USER_ID&transaction_id=TX_ID
            </code>
          </div>
          <p className="text-xs text-muted-foreground">
            Replace WALL_NAME with: lootably, offertoro, adgatemedia, cpxresearch, bitlabs, timewall, ayet, notik, torox, revu, mychips, hangmyads, mmwall
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
