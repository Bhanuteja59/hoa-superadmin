"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { z } from "zod";
import { Shield, Lock, Mail, Loader2, ArrowRight, Activity, ChevronRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

function LoginForm() {
    const { data: session, status } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const authError = searchParams.get("error");

    useEffect(() => {
        if (status === "authenticated") {
            // @ts-ignore
            if (session?.user?.isPlatformAdmin) {
                router.replace("/admin/dashboard");
            } else {
                setErr("Access Denied: You do not have platform administrator privileges.");
            }
        }
    }, [status, router, session]);

    useEffect(() => {
        if (authError === "CredentialsSignin") {
            setErr("Invalid email or password.");
        } else if (authError === "access_denied") {
            setErr("You need platform administrator access for this portal.");
        }
    }, [authError]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErr(null);

        try {
            const parsed = loginSchema.safeParse({ email, password });
            if (!parsed.success) {
                setErr(parsed.error.errors[0].message);
                setIsLoading(false);
                return;
            }

            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setErr("Authentication failed. Please check your credentials.");
                setIsLoading(false);
            } else {
                // The logical redirect is handled by useEffect on status change
                // But we can trigger a refresh to be sure
                router.refresh();
            }
        } catch (e) {
            setErr("An unexpected error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a10]">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
            />

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-2xl shadow-violet-500/30 mb-6 group transition-transform hover:scale-110">
                        <Shield className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase italic">
                        HOA <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">Control</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                        Superadmin Core Access
                    </p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-[2.5rem] p-8 shadow-2xl shadow-black/50 overflow-hidden relative group">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                                    Admin Identifier
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input 
                                        type="email" 
                                        placeholder="admin@platform.com"
                                        className="h-12 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-600 pl-11 rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 font-medium transition-all"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                                    Security Key
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input 
                                        type="password" 
                                        placeholder="••••••••••••"
                                        className="h-12 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-600 pl-11 rounded-2xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>

                        {err && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                <Shield className="w-3.5 h-3.5 shrink-0" />
                                <span>{err}</span>
                            </div>
                        )}

                        <Button 
                            className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-bold rounded-2xl shadow-xl shadow-violet-500/20 group transition-all active:scale-95"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Establish Link <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-bold text-slate-600 tracking-widest uppercase">
                        <div className="flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                            System Live
                        </div>
                        <div className="flex items-center gap-1.5">
                            Status: <span className="text-amber-500">Restricted</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-10 opacity-40">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Shield className="w-3 h-3" /> Encrypted
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Lock className="w-3 h-3" /> Secure
                    </div>
                </div>
            </div>

            {/* Platform Status Bar (Floating) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-white/[0.02] border border-white/[0.05] backdrop-blur-md hidden sm:flex items-center gap-6 text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase transition-opacity hover:opacity-100 opacity-60">
                <div className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-violet-500" />
                    HOA Version 4.2.0-SA
                </div>
                <div className="w-px h-3 bg-white/[0.05]" />
                <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-3 h-3 text-blue-500" />
                    Control Center
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a10] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
