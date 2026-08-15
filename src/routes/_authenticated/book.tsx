import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarCheck, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated/book")({
  component: Book,
  validateSearch: (s: Record<string, unknown>): { doctor?: string } => ({
    doctor: typeof s.doctor === "string" && s.doctor ? s.doctor : undefined,
  }),
});

function Book() {
  const search = Route.useSearch();
  const [departmentId, setDepartmentId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>(search.doctor ?? "");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("10:00");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("*").eq("is_active", true).order("name")).data ?? [],
  });
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", departmentId],
    queryFn: async () => {
      let q = supabase.from("doctors").select("id, full_name, specialization, department_id, consultation_fee").eq("is_active", true).order("full_name");
      if (departmentId) q = q.eq("department_id", departmentId);
      return (await q).data ?? [];
    },
  });

  const selectedDoctor = useMemo(() => doctors.find((d: any) => d.id === doctorId), [doctors, doctorId]);
  useEffect(() => {
    if (selectedDoctor?.department_id && !departmentId) setDepartmentId(selectedDoctor.department_id);
  }, [selectedDoctor, departmentId]);

  const slots = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30"];

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorId || !date || !time) return toast.error("Please pick doctor, date and time");
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return toast.error("Please sign in"); }
    const { data: appt, error } = await supabase.from("appointments").insert({
      patient_id: userData.user.id,
      doctor_id: doctorId,
      department_id: departmentId || null,
      appointment_date: date,
      appointment_time: time,
      reason,
      status: "pending",
    }).select("id").single();
    if (error || !appt) { setLoading(false); return toast.error(error?.message ?? "Could not book"); }

    // Mock online payment — records a paid transaction for this consultation.
    const amount = Number(selectedDoctor?.consultation_fee ?? 0);
    const { data: payment } = await supabase.from("payments").insert({
      patient_id: userData.user.id,
      appointment_id: appt.id,
      amount,
      status: "paid",
      method: "online",
      description: `Consultation — ${selectedDoctor?.full_name ?? "Doctor"}`,
    }).select("id").single();

    // Unique 5-digit verification code issued server-side after successful payment.
    try {
      const { code } = await issueVerificationCode({
        data: { appointmentId: appt.id, doctorId, paymentId: payment?.id ?? null },
      });
      setLoading(false);
      toast.success(`Payment successful! Your verification code is ${code}`, { duration: 10000 });
    } catch (err) {
      setLoading(false);
      return toast.error((err as Error).message);
    }
    navigate({ to: "/appointments" });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Book an Appointment</h1>
        <p className="text-muted-foreground mt-1">Choose a department, doctor and time that works for you.</p>
      </div>
      <Card>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={book} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label>Department</Label>
                <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setDoctorId(""); }}>
                  <option value="">All departments</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Doctor</Label>
                <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
                  <option value="">Select a doctor</option>
                  {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>Time</Label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button key={s} type="button" onClick={() => setTime(s)}
                      className={`h-9 rounded-md border text-sm ${time===s?"bg-gradient-primary text-primary-foreground border-primary":"hover:bg-secondary"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason for visit</Label>
              <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your symptoms or reason for the appointment" />
            </div>
            {selectedDoctor && (
              <div className="rounded-xl border bg-secondary/50 p-4 flex items-center gap-3">
                <Stethoscope className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{selectedDoctor.full_name}</div>
                  <div className="text-xs text-muted-foreground">{selectedDoctor.specialization}</div>
                </div>
                <div className="text-sm font-bold">₹{selectedDoctor.consultation_fee}</div>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              <CalendarCheck className="h-4 w-4" /> {loading ? "Booking…" : "Confirm Appointment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
