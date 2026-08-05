import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Stethoscope, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor-panel")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Doctor Dashboard — HealthCuree AI" },
      { name: "description", content: "Consultation console: verify patients, add diagnosis, prescriptions and reports." },
    ],
  }),
});

const today = () => new Date().toISOString().slice(0, 10);

function Page() {
  const { roles, isLoading: rolesLoading, has } = useRoles();
  const qc = useQueryClient();
  const allowed = has("doctor") || has("admin");

  const [code, setCode] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: doctor } = useQuery({
    queryKey: ["my-doctor-record"],
    enabled: allowed,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      return (await supabase.from("doctors").select("*").eq("user_id", u.user.id).maybeSingle()).data;
    },
  });

  const { data: appts = [] } = useQuery({
    queryKey: ["doctor-today", doctor?.id],
    enabled: !!doctor?.id,
    queryFn: async () =>
      (
        await supabase
          .from("appointments")
          .select("*")
          .eq("doctor_id", doctor!.id)
          .eq("appointment_date", today())
          .order("appointment_time")
      ).data ?? [],
  });

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setPatient(null);
    if (!/^\d{5}$/.test(code)) return toast.error("Enter the 5-digit verification code");
    const { data, error } = await supabase
      .from("verification_codes")
      .select("*, appointments(appointment_date, appointment_time, reason, status)")
      .eq("code", code)
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Invalid verification code");
    if (data.used) return toast.error("This code has already been used");
    if (new Date(data.expires_at) < new Date()) return toast.error("This code has expired");
    if (data.payment_status !== "paid") return toast.error("Payment is not completed for this code");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, gender, date_of_birth, blood_group")
      .eq("id", data.patient_id)
      .maybeSingle();
    setPatient({ ...data, profile });
    toast.success("Patient found");
  }

  function age(dob?: string | null) {
    if (!dob) return "—";
    const d = new Date(dob);
    return String(Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
  }

  async function save() {
    if (!patient) return;
    if (!diagnosis.trim()) return toast.error("Add a diagnosis before saving");
    setSaving(true);
    try {
      let filePath: string | null = null;
      if (file) {
        const path = `${patient.patient_id}/${patient.code}-${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("medical-reports").upload(path, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        filePath = path;
      }

      const { error: repErr } = await supabase.from("medical_reports").insert({
        patient_id: patient.patient_id,
        doctor_id: patient.doctor_id ?? doctor?.id ?? null,
        title: diagnosis.slice(0, 120),
        report_type: file ? "Consultation report (PDF)" : "Consultation note",
        file_url: filePath,
        notes,
        verification_code: patient.code,
      });
      if (repErr) throw new Error(repErr.message);

      const meds = medicines
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean)
        .map((m) => ({ name: m }));
      if (meds.length || diagnosis) {
        const { error: rxErr } = await supabase.from("prescriptions").insert({
          patient_id: patient.patient_id,
          doctor_id: patient.doctor_id ?? doctor?.id,
          appointment_id: patient.appointment_id,
          diagnosis,
          medications: meds,
          instructions: notes,
          verification_code: patient.code,
        });
        if (rxErr) throw new Error(rxErr.message);
      }

      const { error: vcErr } = await supabase
        .from("verification_codes")
        .update({ report_status: "uploaded", used: true })
        .eq("id", patient.id);
      if (vcErr) throw new Error(vcErr.message);

      if (patient.appointment_id) {
        await supabase.from("appointments").update({ status: "completed" }).eq("id", patient.appointment_id);
      }

      toast.success("Saved. Patient can now see the report and the code is marked used.");
      setPatient(null);
      setCode(""); setDiagnosis(""); setMedicines(""); setNotes(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["doctor-today"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (rolesLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!allowed)
    return (
      <Card><CardContent className="p-10 text-center">
        <h1 className="text-xl font-bold">Doctor access only</h1>
        <p className="text-sm text-muted-foreground mt-2">Your account ({roles.join(", ") || "patient"}) cannot open this dashboard.</p>
      </CardContent></Card>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6 text-primary" /> Doctor Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{doctor?.full_name ?? "Consultant"} · {doctor?.specialization ?? ""}</p>
      </div>

      <Tabs defaultValue="consult">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="consult">Consultation</TabsTrigger>
          <TabsTrigger value="today">Today's appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="consult" className="mt-4 space-y-4">
          <Card><CardContent className="p-6">
            <form onSubmit={search} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-50">
                <Label htmlFor="dc">Search patient by verification code</Label>
                <Input id="dc" inputMode="numeric" maxLength={5} className="mt-1.5 tracking-widest"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="48371" />
              </div>
              <Button type="submit" className="bg-gradient-primary text-primary-foreground"><Search className="h-4 w-4" /> Search</Button>
            </form>
          </CardContent></Card>

          {patient && (
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid gap-1 text-sm">
                <div><b>Patient:</b> {patient.profile?.full_name ?? "—"}</div>
                <div><b>Age:</b> {age(patient.profile?.date_of_birth)} · <b>Gender:</b> {patient.profile?.gender ?? "—"} · <b>Blood group:</b> {patient.profile?.blood_group ?? "—"}</div>
                <div><b>Appointment:</b> {patient.appointments?.appointment_date} at {patient.appointments?.appointment_time}</div>
                <div><b>Symptoms:</b> {patient.appointments?.reason || "Not provided"}</div>
              </div>

              <div>
                <Label htmlFor="dx">Diagnosis *</Label>
                <Textarea id="dx" rows={3} className="mt-1.5" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="md">Medicines (one per line)</Label>
                <Textarea id="md" rows={4} className="mt-1.5" value={medicines} onChange={(e) => setMedicines(e.target.value)} placeholder={"Paracetamol 500mg — 1 tablet twice a day\nORS sachet — as needed"} />
              </div>
              <div>
                <Label htmlFor="nt">Notes</Label>
                <Textarea id="nt" rows={2} className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="fl">Upload medical report (PDF/image)</Label>
                <Input id="fl" type="file" accept=".pdf,image/*" className="mt-1.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                <Upload className="h-4 w-4" /> {saving ? "Saving…" : "Save & mark treatment completed"}
              </Button>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="today" className="mt-4 space-y-3">
          {appts.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No appointments today.</CardContent></Card>}
          {appts.map((a: any) => (
            <Card key={a.id}><CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{a.appointment_time}</div>
                <div className="text-xs text-muted-foreground capitalize">{a.status}{a.arrival_confirmed ? " · arrived" : ""}</div>
                {a.reason && <div className="text-xs text-muted-foreground mt-1">"{a.reason}"</div>}
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
