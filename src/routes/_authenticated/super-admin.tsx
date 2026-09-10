import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/roles";
import { createHospital } from "@/lib/hospitals.functions";
import { INDIAN_STATES } from "@/lib/blood";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Users, Stethoscope, CalendarDays, IndianRupee, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super-admin")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Super Admin — HealthCuree AI" },
      { name: "description", content: "Platform-wide control: hospitals, staff accounts, appointments and revenue across the HealthCuree network." },
    ],
  }),
});

const DEPT_PRESETS = [
  "General Medicine", "Cardiology", "Orthopaedics", "Paediatrics", "Gynaecology", "Dermatology",
  "ENT", "Ophthalmology", "Neurology", "Nephrology", "Gastroenterology", "Pulmonology",
  "Oncology", "Urology", "Psychiatry", "Dentistry", "Physiotherapy", "Emergency & Trauma",
];
const HOSPITAL_TYPES = ["Multispeciality", "Super Speciality", "General", "Clinic", "Nursing Home", "Diagnostic Centre"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Dept = { name: string; consultation_fee: string; available_time_start: string; available_time_end: string; available_days: string[]; emergency_available: boolean };
type Doc = { full_name: string; specialization: string; department_name: string; qualifications: string; experience_years: string; consultation_fee: string; phone: string; email: string; password: string };
type Staff = { full_name: string; email: string; password: string; phone: string; staff_type: "receptionist" | "hospital_admin" };

const emptyHospital = {
  name: "", type: "Multispeciality", description: "", phone: "", email: "", website: "",
  emergency_contact: "", emergency_available: true, ambulance_available: true, beds: "",
  working_hours: "24x7", address: "", area: "", city: "", state: "Andhra Pradesh", pin_code: "",
  latitude: "", longitude: "",
};

function Page() {
  const { isLoading, isPlatformAdmin, roles } = useRoles();
  const qc = useQueryClient();
  const createFn = useServerFn(createHospital);

  const [search, setSearch] = useState("");
  const [step, setStep] = useState(1);
  const [hospital, setHospital] = useState({ ...emptyHospital });
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [doctors, setDoctors] = useState<Doc[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("overview");

  const { data: hospitals = [] } = useQuery({
    queryKey: ["sa-hospitals"],
    enabled: isPlatformAdmin,
    queryFn: async () => (await supabase.from("hospitals").select("*").order("code")).data ?? [],
  });

  const { data: stats } = useQuery({
    queryKey: ["sa-stats"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const count = async (t: string) => (await supabase.from(t as never).select("id", { count: "exact", head: true })).count ?? 0;
      const { data: pay } = await supabase.from("payments").select("amount, status");
      const revenue = (pay ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
      return {
        hospitals: await count("hospitals"),
        doctors: await count("doctors"),
        patients: await count("profiles"),
        appointments: await count("appointments"),
        revenue,
      };
    },
  });

  const { data: staffRows = [] } = useQuery({
    queryKey: ["sa-staff"],
    enabled: isPlatformAdmin,
    queryFn: async () => (await supabase.from("hospital_staff").select("*").order("staff_code")).data ?? [],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hospitals;
    return (hospitals as any[]).filter((h) =>
      [h.name, h.code, h.city, h.state].join(" ").toLowerCase().includes(q));
  }, [hospitals, search]);

  async function toggleStatus(id: string, status: string) {
    const { error } = await supabase.from("hospitals").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Hospital activated" : "Hospital suspended");
    qc.invalidateQueries({ queryKey: ["sa-hospitals"] });
  }

  function resetWizard() {
    setHospital({ ...emptyHospital });
    setDepartments([]);
    setDoctors([]);
    setStaff([]);
    setStep(1);
  }

  async function submit() {
    if (!hospital.name.trim() || !hospital.city.trim()) return toast.error("Hospital name and city are required");
    if (staff.length === 0) return toast.error("Add at least one reception or hospital admin account");
    setSaving(true);
    try {
      const res = await createFn({
        data: {
          hospital: {
            name: hospital.name.trim(),
            type: hospital.type,
            description: hospital.description || undefined,
            phone: hospital.phone || undefined,
            email: hospital.email || undefined,
            website: hospital.website || undefined,
            emergency_contact: hospital.emergency_contact || undefined,
            emergency_available: hospital.emergency_available,
            ambulance_available: hospital.ambulance_available,
            beds: hospital.beds ? Number(hospital.beds) : undefined,
            working_hours: hospital.working_hours || undefined,
            address: hospital.address || undefined,
            area: hospital.area || undefined,
            city: hospital.city.trim(),
            state: hospital.state,
            pin_code: hospital.pin_code || undefined,
            latitude: hospital.latitude ? Number(hospital.latitude) : undefined,
            longitude: hospital.longitude ? Number(hospital.longitude) : undefined,
          },
          departments: departments.map((d) => ({
            name: d.name,
            consultation_fee: d.consultation_fee ? Number(d.consultation_fee) : undefined,
            available_days: d.available_days.length ? d.available_days : undefined,
            available_time_start: d.available_time_start || undefined,
            available_time_end: d.available_time_end || undefined,
            emergency_available: d.emergency_available,
          })),
          doctors: doctors.map((d) => ({
            full_name: d.full_name,
            specialization: d.specialization || "General Physician",
            department_name: d.department_name || undefined,
            qualifications: d.qualifications || undefined,
            experience_years: d.experience_years ? Number(d.experience_years) : undefined,
            consultation_fee: d.consultation_fee ? Number(d.consultation_fee) : undefined,
            phone: d.phone || undefined,
            email: d.email || undefined,
            password: d.password || undefined,
          })),
          staff: staff.map((s) => ({
            full_name: s.full_name,
            email: s.email,
            password: s.password,
            phone: s.phone || undefined,
            staff_type: s.staff_type,
          })),
        },
      });
      toast.success(`Hospital ${res.code} created with ${res.accounts.length} staff logins`);
      resetWizard();
      setTab("hospitals");
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isPlatformAdmin)
    return (
      <Card><CardContent className="p-10 text-center">
        <h1 className="text-xl font-bold">Super admin access only</h1>
        <p className="text-sm text-muted-foreground mt-2">Your account ({roles.join(", ") || "patient"}) cannot open this panel.</p>
      </CardContent></Card>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage every hospital on the HealthCuree network.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat icon={Building2} label="Hospitals" value={stats?.hospitals ?? 0} />
        <Stat icon={Users} label="Patients" value={stats?.patients ?? 0} />
        <Stat icon={Stethoscope} label="Doctors" value={stats?.doctors ?? 0} />
        <Stat icon={CalendarDays} label="Appointments" value={stats?.appointments ?? 0} />
        <Stat icon={IndianRupee} label="Revenue" value={stats?.revenue ?? 0} prefix="₹" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
          <TabsTrigger value="staff">Staff directory</TabsTrigger>
          <TabsTrigger value="add">Add hospital</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-3">
          {(hospitals as any[]).slice(0, 6).map((h) => (
            <Card key={h.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{h.code} · {h.name}</div>
                <div className="text-xs text-muted-foreground">{h.type} · {h.city}, {h.state} · {h.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {staffRows.filter((s: any) => s.hospital_id === h.id).length} staff accounts
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="hospitals" className="mt-4 space-y-3">
          <Input placeholder="Search by name, code or city" value={search} onChange={(e) => setSearch(e.target.value)} />
          {(filtered as any[]).map((h) => (
            <Card key={h.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{h.code} · {h.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {h.type} · {[h.area, h.city, h.state, h.pin_code].filter(Boolean).join(", ")} · {h.phone ?? "no phone"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleStatus(h.id, h.status === "active" ? "suspended" : "active")}>
                  {h.status === "active" ? "Suspend" : "Activate"}
                </Button>
              </div>
            </CardContent></Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No hospitals match that search.</p>}
        </TabsContent>

        <TabsContent value="staff" className="mt-4 space-y-3">
          {(staffRows as any[]).map((s) => {
            const h = (hospitals as any[]).find((x) => x.id === s.hospital_id);
            return (
              <Card key={s.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.full_name ?? s.email}</div>
                  <div className="text-xs text-muted-foreground">{s.staff_code} · {s.staff_type} · {h?.name ?? "—"}</div>
                </div>
                <div className="text-xs text-muted-foreground">{s.email}</div>
              </CardContent></Card>
            );
          })}
          {staffRows.length === 0 && <p className="text-sm text-muted-foreground">No hospital staff yet.</p>}
        </TabsContent>

        <TabsContent value="add" className="mt-4">
          <Card><CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap gap-2 text-xs">
              {["Basics", "Address", "Departments", "Doctors", "Reception", "Review"].map((s, i) => (
                <button key={s} onClick={() => setStep(i + 1)}
                  className={`rounded-full px-3 py-1 border ${step === i + 1 ? "bg-gradient-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground"}`}>
                  {i + 1}. {s}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Hospital name"><Input value={hospital.name} onChange={(e) => setHospital({ ...hospital, name: e.target.value })} /></Field>
                <Field label="Type">
                  <Select value={hospital.type} onChange={(v) => setHospital({ ...hospital, type: v })} options={HOSPITAL_TYPES} />
                </Field>
                <Field label="Phone"><Input value={hospital.phone} onChange={(e) => setHospital({ ...hospital, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={hospital.email} onChange={(e) => setHospital({ ...hospital, email: e.target.value })} /></Field>
                <Field label="Website"><Input value={hospital.website} onChange={(e) => setHospital({ ...hospital, website: e.target.value })} /></Field>
                <Field label="Emergency contact"><Input value={hospital.emergency_contact} onChange={(e) => setHospital({ ...hospital, emergency_contact: e.target.value })} /></Field>
                <Field label="Beds"><Input type="number" value={hospital.beds} onChange={(e) => setHospital({ ...hospital, beds: e.target.value })} /></Field>
                <Field label="Working hours"><Input value={hospital.working_hours} onChange={(e) => setHospital({ ...hospital, working_hours: e.target.value })} /></Field>
                <div className="sm:col-span-2">
                  <Field label="About this hospital">
                    <Textarea rows={3} value={hospital.description} onChange={(e) => setHospital({ ...hospital, description: e.target.value })} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hospital.emergency_available} onChange={(e) => setHospital({ ...hospital, emergency_available: e.target.checked })} /> Emergency available
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hospital.ambulance_available} onChange={(e) => setHospital({ ...hospital, ambulance_available: e.target.checked })} /> Ambulance available
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Street address"><Input value={hospital.address} onChange={(e) => setHospital({ ...hospital, address: e.target.value })} /></Field></div>
                <Field label="Area / locality"><Input value={hospital.area} onChange={(e) => setHospital({ ...hospital, area: e.target.value })} /></Field>
                <Field label="City"><Input value={hospital.city} onChange={(e) => setHospital({ ...hospital, city: e.target.value })} /></Field>
                <Field label="State"><Select value={hospital.state} onChange={(v) => setHospital({ ...hospital, state: v })} options={INDIAN_STATES} /></Field>
                <Field label="PIN code"><Input value={hospital.pin_code} onChange={(e) => setHospital({ ...hospital, pin_code: e.target.value })} /></Field>
                <Field label="Latitude"><Input value={hospital.latitude} onChange={(e) => setHospital({ ...hospital, latitude: e.target.value })} placeholder="17.3850" /></Field>
                <Field label="Longitude"><Input value={hospital.longitude} onChange={(e) => setHospital({ ...hospital, longitude: e.target.value })} placeholder="78.4867" /></Field>
                <p className="sm:col-span-2 text-xs text-muted-foreground">Coordinates power the “hospitals near me” distance search. Copy them from any map app.</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {DEPT_PRESETS.map((name) => {
                    const on = departments.some((d) => d.name === name);
                    return (
                      <button key={name} type="button"
                        onClick={() => setDepartments(on
                          ? departments.filter((d) => d.name !== name)
                          : [...departments, { name, consultation_fee: "500", available_time_start: "09:00", available_time_end: "17:00", available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], emergency_available: false }])}
                        className={`rounded-full px-3 py-1 text-xs border ${on ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}>
                        {name}
                      </button>
                    );
                  })}
                </div>
                {departments.map((d, i) => (
                  <Card key={d.name}><CardContent className="p-4 grid gap-3 sm:grid-cols-4">
                    <div className="sm:col-span-4 flex items-center justify-between">
                      <span className="font-semibold text-sm">{d.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setDepartments(departments.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <Field label="Fee (₹)"><Input type="number" value={d.consultation_fee} onChange={(e) => patch(setDepartments, departments, i, { consultation_fee: e.target.value })} /></Field>
                    <Field label="Opens"><Input type="time" value={d.available_time_start} onChange={(e) => patch(setDepartments, departments, i, { available_time_start: e.target.value })} /></Field>
                    <Field label="Closes"><Input type="time" value={d.available_time_end} onChange={(e) => patch(setDepartments, departments, i, { available_time_end: e.target.value })} /></Field>
                    <div className="sm:col-span-4 flex flex-wrap gap-2">
                      {DAYS.map((day) => {
                        const on = d.available_days.includes(day);
                        return (
                          <button key={day} type="button"
                            onClick={() => patch(setDepartments, departments, i, { available_days: on ? d.available_days.filter((x) => x !== day) : [...d.available_days, day] })}
                            className={`rounded-md px-2 py-1 text-xs border ${on ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent></Card>
                ))}
                {departments.length === 0 && <p className="text-sm text-muted-foreground">Pick the departments this hospital runs.</p>}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {doctors.map((d, i) => (
                  <Card key={i}><CardContent className="p-4 grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-3 flex items-center justify-between">
                      <span className="font-semibold text-sm">Doctor {i + 1}</span>
                      <Button size="sm" variant="ghost" onClick={() => setDoctors(doctors.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <Field label="Full name"><Input value={d.full_name} onChange={(e) => patch(setDoctors, doctors, i, { full_name: e.target.value })} /></Field>
                    <Field label="Specialization"><Input value={d.specialization} onChange={(e) => patch(setDoctors, doctors, i, { specialization: e.target.value })} /></Field>
                    <Field label="Department">
                      <Select value={d.department_name} onChange={(v) => patch(setDoctors, doctors, i, { department_name: v })} options={["", ...departments.map((x) => x.name)]} />
                    </Field>
                    <Field label="Qualifications"><Input value={d.qualifications} onChange={(e) => patch(setDoctors, doctors, i, { qualifications: e.target.value })} /></Field>
                    <Field label="Experience (years)"><Input type="number" value={d.experience_years} onChange={(e) => patch(setDoctors, doctors, i, { experience_years: e.target.value })} /></Field>
                    <Field label="Fee (₹)"><Input type="number" value={d.consultation_fee} onChange={(e) => patch(setDoctors, doctors, i, { consultation_fee: e.target.value })} /></Field>
                    <Field label="Phone"><Input value={d.phone} onChange={(e) => patch(setDoctors, doctors, i, { phone: e.target.value })} /></Field>
                    <Field label="Login email (optional)"><Input type="email" value={d.email} onChange={(e) => patch(setDoctors, doctors, i, { email: e.target.value })} /></Field>
                    <Field label="Password (8+ chars)"><Input type="password" value={d.password} onChange={(e) => patch(setDoctors, doctors, i, { password: e.target.value })} /></Field>
                  </CardContent></Card>
                ))}
                <Button variant="outline" onClick={() => setDoctors([...doctors, { full_name: "", specialization: "", department_name: "", qualifications: "", experience_years: "", consultation_fee: "500", phone: "", email: "", password: "" }])}>
                  <Plus className="h-4 w-4" /> Add doctor
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                {staff.map((s, i) => (
                  <Card key={i}><CardContent className="p-4 grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-3 flex items-center justify-between">
                      <span className="font-semibold text-sm">Staff {i + 1}</span>
                      <Button size="sm" variant="ghost" onClick={() => setStaff(staff.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <Field label="Full name"><Input value={s.full_name} onChange={(e) => patch(setStaff, staff, i, { full_name: e.target.value })} /></Field>
                    <Field label="Role">
                      <Select value={s.staff_type} onChange={(v) => patch(setStaff, staff, i, { staff_type: v as Staff["staff_type"] })} options={["receptionist", "hospital_admin"]} />
                    </Field>
                    <Field label="Phone"><Input value={s.phone} onChange={(e) => patch(setStaff, staff, i, { phone: e.target.value })} /></Field>
                    <Field label="Login email"><Input type="email" value={s.email} onChange={(e) => patch(setStaff, staff, i, { email: e.target.value })} /></Field>
                    <Field label="Password (8+ chars)"><Input type="password" value={s.password} onChange={(e) => patch(setStaff, staff, i, { password: e.target.value })} /></Field>
                  </CardContent></Card>
                ))}
                <Button variant="outline" onClick={() => setStaff([...staff, { full_name: "", email: "", password: "", phone: "", staff_type: "receptionist" }])}>
                  <Plus className="h-4 w-4" /> Add reception / hospital admin
                </Button>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-border p-4">
                  <div className="font-semibold">{hospital.name || "Unnamed hospital"}</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {hospital.type} · {[hospital.area, hospital.city, hospital.state, hospital.pin_code].filter(Boolean).join(", ")}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="font-semibold mb-1">{departments.length} departments</div>
                  <div className="text-muted-foreground text-xs">{departments.map((d) => d.name).join(", ") || "None"}</div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="font-semibold mb-1">{doctors.length} doctors</div>
                  <div className="text-muted-foreground text-xs">{doctors.map((d) => d.full_name).filter(Boolean).join(", ") || "None"}</div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="font-semibold mb-1">{staff.length} staff logins</div>
                  <div className="text-muted-foreground text-xs">{staff.map((s) => `${s.full_name} (${s.staff_type})`).join(", ") || "None"}</div>
                </div>
                <Button disabled={saving} onClick={submit} className="bg-gradient-primary text-primary-foreground">
                  {saving ? "Creating…" : "Create hospital & staff accounts"}
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button>
              <Button variant="outline" disabled={step === 6} onClick={() => setStep(step + 1)}>Next</Button>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function patch<T>(setter: (v: T[]) => void, list: T[], index: number, values: Partial<T>) {
  setter(list.map((item, i) => (i === index ? { ...item, ...values } : item)));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1.5">{children}</div></div>;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
      value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
    </select>
  );
}

function Stat({ icon: Icon, label, value, prefix = "" }: { icon: any; label: string; value: number; prefix?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4" /> {label}</div>
      <div className="text-2xl font-bold mt-1">{prefix}{value.toLocaleString("en-IN")}</div>
    </CardContent></Card>
  );
}
