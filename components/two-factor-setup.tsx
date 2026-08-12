"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Shield, Smartphone, Key, Copy, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

interface TwoFactorSetupProps {
  userId: string;
  email: string;
  isEnabled: boolean;
  onComplete: () => void;
}

export function TwoFactorSetup({ userId, email, isEnabled, onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    manualKey: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [copied, setCopied] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to setup 2FA");
      }

      setSetupData(data);
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || "Failed to setup 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6 || !setupData) return;

    setVerifying(true);
    try {
      const response = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          secret: setupData.secret,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      toast.success("Two-factor authentication enabled successfully!");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to verify code");
      setVerificationCode("");
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async () => {
    if (!setupData) return;
    try {
      await navigator.clipboard.writeText(setupData.manualKey);
      setCopied(true);
      toast.success("Secret key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Already enabled state
  if (isEnabled) {
    return (
      <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-white">2FA Enabled</h3>
            <p className="text-sm text-white/60">
              Your account is protected with two-factor authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                step >= s
                  ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
                  : "bg-white/5 text-white/30"
              )}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className="w-8 h-[2px] bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: Introduction */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Enable Two-Factor Authentication</h3>
                <p className="text-sm text-white/60">Add an extra layer of security</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-white/70">
              <p>Two-factor authentication (2FA) adds an extra layer of security to your account. When enabled, you&apos;ll need to enter a code from your authenticator app in addition to your password.</p>
              
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                <Smartphone className="w-5 h-5 text-[#3B82F6] mt-0.5" />
                <div>
                  <p className="font-medium text-white">You&apos;ll need an authenticator app</p>
                  <p className="text-white/50">Google Authenticator, Authy, or similar</p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={startSetup}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step 2: QR Code & Manual Key */}
      {step === 2 && setupData && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <h3 className="font-bold text-white mb-2">Scan QR Code</h3>
            <p className="text-sm text-white/60 mb-4">
              Open your authenticator app and scan this QR code
            </p>
            
            {/* QR Code */}
            <div className="inline-block p-4 bg-white rounded-xl mb-4">
              <Image
                src={setupData.qrCodeDataUrl}
                alt="2FA QR Code"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>

            {/* Manual Key */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/40 uppercase tracking-wider">
                  Or enter this code manually
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="flex-1 text-sm font-mono text-[#3B82F6] break-all">
                  {setupData.manualKey}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 h-14 rounded-2xl bg-white/[0.02] border-white/5"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold"
            >
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Verification */}
      {step === 3 && setupData && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <h3 className="font-bold text-white mb-2">Enter Verification Code</h3>
            <p className="text-sm text-white/60 mb-6">
              Enter the 6-digit code from your authenticator app
            </p>

            <div className="flex justify-center mb-6">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-12 h-14 text-lg bg-white/[0.02] border-white/10 text-white" />
                  <InputOTPSlot index={1} className="w-12 h-14 text-lg bg-white/[0.02] border-white/10 text-white" />
                  <InputOTPSlot index={2} className="w-12 h-14 text-lg bg-white/[0.02] border-white/10 text-white" />
                  <InputOTPSlot index={3} className="w-12 h-14 text-lg bg-white/[0.02] border-white/10 text-white" />
                  <InputOTPSlot index={4} className="w-12 h-14 text-lg bg-white/[0.02] border-white/10 text-white" />
                  <InputOTPSlot index={5} className="w-12 h-14 text-lg bg-white/[0.02] border-white/10 text-white" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1 h-14 rounded-2xl bg-white/[0.02] border-white/5"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || verifying}
              className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold"
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Enable 2FA"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
