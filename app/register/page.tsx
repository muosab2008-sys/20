"use client";



import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, IdCard, Link2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { AvatarSelector } from "@/components/avatar-selector";
import { cn } from "@/lib/utils";

const ALNUM_RE = /^[A-Za-z0-9]+$/;

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const referralCodeParam = searchParams.get("ref") || "";

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(referralCodeParam);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (!ALNUM_RE.test(username.trim())) {
      toast.error("Username may only contain English letters and numbers");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!ALNUM_RE.test(fullName.trim())) {
      toast.error("Full name may only contain English letters and numbers");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!selectedAvatar) {
      toast.error("Please select an avatar to continue");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          fullName: fullName.trim(),
          password,
          photoURL: selectedAvatar,
          referralCode: referralCode || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Email verification is disabled — sign the user in immediately.
      try {
        await login(email.trim(), password);
        toast.success("Welcome to MrCash!");
        router.push("/");
      } catch {
        toast.success("Account created! Please sign in.");
        router.push("/login");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="MrCash" width={48} height={48} className="rounded-2xl" />
            <span className="text-2xl font-black bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent italic tracking-tighter">
              MrCash
            </span>
          </Link>
        </div>

        {(
          <>
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    step >= 1 ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white" : "bg-white/5 text-white/30"
                  )}
                >
                  {step > 1 ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <span className={cn("text-sm font-medium transition-colors", step >= 1 ? "text-white" : "text-white/30")}>
                  Account
                </span>
              </div>
              <div className="w-8 h-[2px] bg-white/10" />
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    step >= 2 ? "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white" : "bg-white/5 text-white/30"
                  )}
                >
                  2
                </div>
                <span className={cn("text-sm font-medium transition-colors", step >= 2 ? "text-white" : "text-white/30")}>
                  Avatar
                </span>
              </div>
            </div>

            {/* Register Card */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8">
              {/* Step 1: Account Details */}
              {step === 1 && (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-sm text-white/40">Join MrCash and start earning rewards</p>
                  </div>

                  <form onSubmit={handleStep1Submit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/30 tracking-widest ml-1">Username</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                        <Input
                          type="text"
                          placeholder="Choose a username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-12 h-14 rounded-2xl bg-white/[0.02] border-white/5 focus:border-[#3B82F6]/50 text-white placeholder:text-white/20"
                          required
                          minLength={3}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/30 tracking-widest ml-1">Full Name</label>
                      <div className="relative">
                        <IdCard className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                        <Input
                          type="text"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-12 h-14 rounded-2xl bg-white/[0.02] border-white/5 focus:border-[#3B82F6]/50 text-white placeholder:text-white/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/30 tracking-widest ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-14 rounded-2xl bg-white/[0.02] border-white/5 focus:border-[#3B82F6]/50 text-white placeholder:text-white/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/30 tracking-widest ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                        <Input
                          type="password"
                          placeholder="Create a password (min 8 chars)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 h-14 rounded-2xl bg-white/[0.02] border-white/5 focus:border-[#3B82F6]/50 text-white placeholder:text-white/20"
                          minLength={8}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-white/30 tracking-widest ml-1">
                        Referral Code (Optional)
                      </label>
                      <div className="relative">
                        <Link2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                        <Input
                          type="text"
                          placeholder="Enter referral code"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          className="pl-12 h-14 rounded-2xl bg-white/[0.02] border-white/5 focus:border-[#3B82F6]/50 text-white placeholder:text-white/20"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold shadow-lg shadow-[#3B82F6]/20"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </form>
                </>
              )}

              {/* Step 2: Avatar Selection */}
              {step === 2 && (
                <>
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">Choose Your Avatar</h1>
                    <p className="text-sm text-white/40">Pick a profile picture that represents you</p>
                  </div>

                  <AvatarSelector selectedAvatar={selectedAvatar} onSelect={setSelectedAvatar} />

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 h-14 rounded-2xl bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-white font-medium"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleFinalSubmit}
                      className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold shadow-lg shadow-[#3B82F6]/20"
                      disabled={loading || !selectedAvatar}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* Sign In Link */}
              <p className="mt-6 text-center text-sm text-white/50">
                Already have an account?{" "}
                <Link href="/login" className="text-[#3B82F6] hover:text-[#8B5CF6] font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080808] p-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
