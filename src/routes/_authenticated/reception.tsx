import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { CalendarDays, CheckCircle2, Clock, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reception")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Reception Dashboard — HealthCuree AI" },
      { name: "description", content: "Front-desk console for appointments, patient verification and payments." },
    ],
  }),
});

const today = () => new Date().toISOString().slice(0, 10);

function Page() {
  const { roles, isLoading: rolesLoading, has } = useRoles();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState<any>(null);
  const [patientQuery, setPatientQuery] = useState("");

  const allowed = has("receptionist") || has("admin");

  const { data: appts = [] } = useQuery({
    queryKey: ["reception-today"],
    enabled: allowed,
    queryFn: async () =>
      (
        await supabase
          .from("appointments")
          .select("*, doctors(full_name, specialization)")
          .eq("appointment_date", today())
          .order("appointment_time")
      ).data ?? [],
  });

  const { data: counts } = useQuery({
    queryKey: ["reception-counts"],
    enabled: allowed,
    queryFn: async () => {
      const statuses = ["pending", "confirmed", "completed"] as const;
      const out: Record<string, number> = {};
      for (const s of statuses) {
        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        out[s] = count ?? 0;
      }
      return out;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["reception-payments"],
    enabled: allowed,
    queryFn: async () =>
      (await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["reception-patients", patientQuery],
    enabled: allowed && patientQuery.trim().length > 1,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("id, full_name, phone, blood_group, gender")
          .or(`full_name.ilike.%${patientQuery}%,phone.ilike.%${patientQuery}%`)
          .limit(25)
      ).data ?? [],
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Appointment ${status}`);
    qc.invalidateQueries({ queryKey: ["reception-today"] });
    qc.invalidateQueries({ queryKey: ["reception-counts"] });
  }

  async function confirmArrival(id: string) {
    const { error } = await supabase.from("appointments").update({ arrival_confirmed: true, status: "confirmed" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Patient arrival confirmed");
    qc.invalidateQueries({ queryKey: ["reception-today"] });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setVerified(null);
    if (!/^\d{5}$/.test(code)) return toast.error("Enter the 5-digit verification code");
    const { data, error } = await supabase
      .from("verification_codes")
      .select("*, doctors(full_name), appointments(appointment_date, appointment_time, reason, status)")
      .eq("code", code)
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Invalid verification code");
    if (data.payment_status !== "paid") return toast.error("Payment not completed for this code");
    if (data.used) return toast.error("This code has already been used");
    if (new Date(data.expires_at) < new Date()) return toast.error("This code has expired");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, gender, date_of_birth")
      .eq("id", data.patient_id)
      .maybeSingle();
    setVerified({ ...data, profile });
    toast.success("Code verified — payment successful");
  }

  async function confirmVerified() {
    if (!verified) return;
    const { error } = await supabase
      .from("verification_codes")
      .update({ reception_status: "confirmed" })
      .eq("id", verified.id);
    if (error) return toast.error(error.message);
    if (verified.appointment_id) {
      await supabase.from("appointments").update({ status: "confirmed", arrival_confirmed: true }).eq("id", verified.appointment_id);
    }
    toast.success("Appointment confirmed at reception");
    setVerified({ ...verified, reception_status: "confirmed" });
    qc.invalidateQueries({ queryKey: ["reception-today"] });
  }

  function slip(v: any) {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("HealthCuree AI — Appointment Slip", 14, 20);
    doc.setFontSize(11);
    const lines = [
      `Verification code: ${v.code ?? "-"}`,
      `Patient: ${v.profile?.full_name ?? v.patientName ?? "-"}`,
      `Doctor: ${v.doctors?.full_name ?? v.doctorName ?? "-"}`,
      `Date: ${v.appointments?.appointment_date ?? v.appointment_date ?? "-"}`,
      `Time: ${v.appointments?.appointment_time ?? v.appointment_time ?? "-"}`,
      `Payment: ${v.payment_status ?? "paid"}`,
      `Issued: ${new Date().toLocaleString()}`,
    ];
    lines.forEach((l, i) => doc.text(l, 14, 36 + i * 8));
    doc.save(`appointment-slip-${v.code ?? Date.now()}.pdf`);
  }

  async function updatePayment(id: string, status: string) {
    const { error } = await supabase.from("payments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payment status updated");
    qc.invalidateQueries({ queryKey: ["reception-payments"] });
  }

  if (rolesLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!allowed)
    return (
      <Card><CardContent className="p-10 text-center">
        <h1 className="text-xl font-bold">Reception access only</h1>
        <p className="text-sm text-muted-foreground mt-2">Your account ({roles.join(", ") || "patient"}) cannot open this dashboard.</p>
      </CardContent></Card>
    );

  const todaysPatients = new Set(appts.map((a: any) => a.patient_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reception Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Verify patients, manage today's schedule and payments.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Today's patients" value={todaysPatients} />
        <Stat icon={Clock} label="Pending" value={counts?.pending ?? 0} />
        <Stat icon={CheckCircle2} label="Confirmed" value={counts?.confirmed ?? 0} />
        <Stat icon={CalendarDays} label="Completed" value={counts?.completed ?? 0} />
      </div>

      <Tabs defaultValue="verify">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="verify">Verify patient</TabsTrigger>
          <TabsTrigger value="today">Today's appointments</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="patients">Search patient</TabsTrigger>
        </TabsList>

        <TabsContent value="verify" className="mt-4">
          <Card><CardContent className="p-6 space-y-5">
            <form onSubmit={verify} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-50">
                <Label htmlFor="vc">5-digit verification code</Label>
                <Input id="vc" inputMode="numeric" maxLength={5} className="mt-1.5 tracking-widest"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="48371" />
              </div>
              <Button type="submit" className="bg-gradient-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" /> Verify
              </Button>
            </form>

            {verified && (
              <div className="rounded-xl border p-4 space-y-2">
                <div className="text-sm"><b>Patient:</b> {verified.profile?.full_name ?? "—"}</div>
                <div className="text-sm"><b>Doctor:</b> {verified.doctors?.full_name ?? "—"}</div>
                <div className="text-sm"><b>Appointment:</b> {verified.appointments?.appointment_date} at {verified.appointments?.appointment_time}</div>
                <div className="text-sm text-accent font-medium">Payment successful</div>
                <div className="text-xs text-muted-foreground">Reception status: {verified.reception_status}</div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" onClick={confirmVerified} className="bg-gradient-primary text-primary-foreground">Confirm appointment</Button>
                  <Button size="sm" variant="outline" onClick={() => slip(verified)}>Generate slip (PDF)</Button>
                </div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="today" className="mt-4 space-y-3">
          {appts.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No appointments today.</CardContent></Card>}
          {appts.map((a: any) => (
            <Card key={a.id}><CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{a.doctors?.full_name}</div>
                <div className="text-xs text-muted-foreground">{a.appointment_time} · {a.status}{a.arrival_confirmed ? " · arrived" : ""}</div>
                {a.reason && <div className="text-xs text-muted-foreground mt-1">"{a.reason}"</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "confirmed")}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "cancelled")}>Reject</Button>
                <Button size="sm" variant="outline" onClick={() => confirmArrival(a.id)}>Arrived</Button>
                <Button size="sm" variant="outline" onClick={() => slip({ code: "-", doctorName: a.doctors?.full_name, appointment_date: a.appointment_date, appointment_time: a.appointment_time })}>Slip</Button>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {payments.map((p: any) => (
            <Card key={p.id}><CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">₹{p.amount} <span className="text-xs font-normal text-muted-foreground">· {p.method ?? "—"}</span></div>
                <div className="text-xs text-muted-foreground">{p.description} · {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">{p.status}</span>
                <Button size="sm" variant="outline" onClick={() => updatePayment(p.id, "paid")}>Mark paid</Button>
                <Button size="sm" variant="outline" onClick={() => updatePayment(p.id, "pending")}>Mark pending</Button>
              </div>
            </CardContent></Card>
          ))}
          {payments.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No payments yet.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="patients" className="mt-4 space-y-3">
          <Input placeholder="Search by name or phone" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
          {patients.map((p: any) => (
            <Card key={p.id}><CardContent className="p-4">
              <div className="font-semibold">{p.full_name ?? "Unnamed"}</div>
              <div className="text-xs text-muted-foreground">{p.phone ?? "No phone"} · {p.gender ?? "—"} · {p.blood_group ?? "—"}</div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4" /> {label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
