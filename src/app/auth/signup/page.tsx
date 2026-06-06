// src/app/auth/signup/page.tsx
"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Something went wrong"); setLoading(false); return; }
    // Auto sign in after register
    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center font-display text-white font-bold text-lg">K</div>
            <span className="font-display text-2xl text-white font-bold tracking-wide">KUROANIME</span>
          </div>
          <p className="text-gray-400 text-sm">Create your account</p>
        </div>

        <div className="bg-surface-1 border border-white/8 rounded-2xl p-6 shadow-2xl">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-3 text-sm font-medium transition-all mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-600 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Username" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-2 border border-white/8 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand transition-colors" />
            </div>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-surface-2 border border-white/8 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand transition-colors" />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type={showPw ? "text" : "password"} placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-surface-2 border border-white/8 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand transition-colors" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-white rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-4">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-brand hover:text-brand-light transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
