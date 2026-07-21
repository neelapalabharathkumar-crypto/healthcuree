import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — HealthCuree AI" }, { name: "description", content: "Sign in or create your HealthCuree AI account." }] }),
});

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate, pathname]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    if (!em.success) return toast.error("Enter a valid email");
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) return toast.error(pw.error.issues[0].message);

    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: em.data,
        password: pw.data,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created! Check your email to confirm.");
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: em.data, password: pw.data });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error(String((result.error as Error).message ?? "Google sign-in failed"));
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-16">
        <Card className="shadow-elevated">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">HealthCuree AI</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin" ? "Access your appointments, records and AI assistant." : "Join in a minute — no credit card needed."}
            </p>

            <Button onClick={google} variant="outline" className="w-full mt-6">
              Continue with Google
            </Button>
            <div className="relative my-5 text-center text-xs text-muted-foreground">
              <span className="bg-card px-2 relative z-10">or with email</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <>
                  <div><Label htmlFor="fn">Full name</Label><Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                  <div><Label htmlFor="ph">Phone</Label><Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </>
              )}
              <div><Label htmlFor="em">Email</Label><Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>New to HealthCuree AI? <button className="text-primary font-medium" onClick={() => setMode("signup")}>Create account</button></>
              ) : (
                <>Already have an account? <button className="text-primary font-medium" onClick={() => setMode("signin")}>Sign in</button></>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  );
}
