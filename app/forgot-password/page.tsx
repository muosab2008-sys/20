"use client";



import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { Mail, KeyRound, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      if (err?.message?.includes("valid email")) {
        setError("Please enter a valid email address.");
      } else {
        // Show success state anyway to prevent account enumeration.
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="MrCash" width={48} height={48} className="rounded-2xl" />
            <span className="text-2xl font-black bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent italic tracking-tighter">
              MrCash
            </span>
          </Link>
        </div>

        <div className="bg-[#1e293b] border border-white/5 rounded-2xl p-8">
          {sent ? (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Check Your Inbox</h1>
              <p className="text-sm text-slate-400 mb-6">
                If an account exists for{" "}
                <span className="text-white font-medium">{email}</span>, we&apos;ve sent a password
                reset link. It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 text-sm text-[#3B82F6] hover:text-[#8B5CF6] transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Forgot Password</h1>
                  <p className="text-sm text-slate-400">Enter your email to reset it</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/40 p-4 rounded-xl text-red-400 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 h-14 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-[#3B82F6]/50 text-white placeholder:text-slate-500 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold shadow-lg shadow-[#3B82F6]/20 transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors py-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
