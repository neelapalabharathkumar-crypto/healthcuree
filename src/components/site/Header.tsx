import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Phone, X, LogIn, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS, SITE } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "text-primary bg-primary/10" : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <a
            href={`tel:${SITE.phone.replace(/\s/g, "")}`}
            className="hidden lg:inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4" />
            {SITE.phone}
          </a>
          {user ? (
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-soft">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-soft">
                <Link to="/book">Book Appointment</Link>
              </Button>
            </>
          )}
        </div>
        <button
          className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-secondary"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border/60 bg-background">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/5 hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {user ? (
                <Button asChild className="bg-gradient-primary text-primary-foreground">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <Button asChild className="bg-gradient-primary text-primary-foreground">
                    <Link to="/book">Book Appointment</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
