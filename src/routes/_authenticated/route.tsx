import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Calendar, FileText, Pill, Bot, CreditCard,
  Bell, User as UserIcon, LogOut, Menu, X, Droplet, ShieldCheck, ClipboardList, Stethoscope, Building2,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FloatingActions } from "@/components/site/FloatingActions";
import { useRoles } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/appointments", label: "Appointments", icon: Calendar },
  { to: "/records", label: "Medical Records", icon: FileText },
  { to: "/prescriptions", label: "Prescriptions", icon: Pill },
  { to: "/bills", label: "Bills", icon: CreditCard },
  { to: "/blood-donor", label: "Blood Donor", icon: Droplet },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

const staffNav = [
  { to: "/super-admin", label: "Super Admin", icon: Building2, role: "super_admin" },
  { to: "/admin", label: "Admin Panel", icon: ShieldCheck, role: "admin" },
  { to: "/admin", label: "Hospital Admin", icon: ShieldCheck, role: "hospital_admin" },
  { to: "/reception", label: "Reception", icon: ClipboardList, role: "receptionist" },
  { to: "/doctor-panel", label: "Doctor Panel", icon: Stethoscope, role: "doctor" },
] as const;

function AuthedLayout() {
  const [open, setOpen] = useState(false);
  const { has } = useRoles();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 px-4 flex items-center border-b border-border">
          <Logo />
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-primary/5 hover:text-primary"
                }`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
          {staffNav
            .filter((n) => has(n.role) || (n.role !== "admin" && has("admin")))
            .map((n) => {
              const active = pathname === n.to;
              return (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-primary/5 hover:text-primary"
                  }`}>
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3">
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4 lg:px-8">
          <button className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="text-sm text-muted-foreground">Patient Portal</div>
          <Button asChild size="sm" variant="ghost"><Link to="/">Home</Link></Button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <FloatingActions />
    </div>
  );
}
