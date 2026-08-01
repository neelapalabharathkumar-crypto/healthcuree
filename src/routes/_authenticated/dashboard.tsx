import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Pill, Bot, CreditCard, Bell, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const { data: appts = [] } = useQuery({
    queryKey: ["my-appts"],
    queryFn: async () => (await supabase.from("appointments").select("*, doctors(full_name, specialization)").order("appointment_date", { ascending: false }).limit(5)).data ?? [],
  });
  const { data: rx = [] } = useQuery({
    queryKey: ["my-rx"],
    queryFn: async () => (await supabase.from("prescriptions").select("id").limit(1)).data ?? [],
  });
  const { data: notifs = [] } = useQuery({
    queryKey: ["my-notifs"],
    queryFn: async () => (await supabase.from("notifications").select("*").eq("read", false)).data ?? [],
  });
  const { data: donor, isLoading: donorLoading } = useQuery({
    queryKey: ["my-donor"],
    queryFn: async () => {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) return null;
      return (await supabase.from("blood_donors").select("*").eq("user_id", u.id).maybeSingle()).data;
    },
  });

  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "there";

  const stats = [
    { label: "Appointments", value: appts.length, icon: Calendar, to: "/appointments" },
    { label: "Prescriptions", value: rx.length, icon: Pill, to: "/prescriptions" },
    { label: "Unread notifications", value: notifs.length, icon: Bell, to: "/notifications" },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-hero p-8 md:p-10 text-primary-foreground shadow-elevated">
        <p className="text-white/80 text-sm">Welcome back</p>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold">Hello, {name} 👋</h1>
        <p className="mt-2 text-white/85 max-w-lg">Manage appointments, view records and chat with our AI health assistant — all in one place.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-white text-primary hover:bg-white/90"><Link to="/book"><Calendar className="h-4 w-4" /> Book Appointment</Link></Button>
          <Button asChild variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20"><Link to="/ai-assistant"><Bot className="h-4 w-4" /> AI Assistant</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="hover:shadow-elevated transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Appointments</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/appointments">All <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {appts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No appointments yet.</p>
              <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground"><Link to="/book">Book your first appointment</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {appts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <div className="font-semibold">{a.doctors?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{a.doctors?.specialization} · {a.appointment_date} at {a.appointment_time}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" /><h3 className="font-semibold">Medical Records</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">View reports and download PDFs.</p>
          <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/records">Open</Link></Button>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" /><h3 className="font-semibold">Bills & Payments</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Review invoices and pay online.</p>
          <Button asChild size="sm" variant="outline" className="mt-4"><Link to="/bills">Open</Link></Button>
        </CardContent></Card>
      </div>
    </div>
  );
}
