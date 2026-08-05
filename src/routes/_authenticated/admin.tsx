import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, type AppRole } from "@/lib/roles";
import { adminCreateStaff, adminDeleteUser, adminListUsers, adminSetRole, adminUpdateUser } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Activity, Droplet, FileText, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Admin Dashboard — HealthCuree AI" },
      { name: "description", content: "Hospital-wide administration: users, staff, appointments, payments and announcements." },
    ],
  }),
});

const ROLES: AppRole[] = ["patient", "doctor", "receptionist", "admin"];

function Page() {
  const { roles, isLoading: rolesLoading, has } = useRoles();
  const qc = useQueryClient();
  const allowed = has("admin");

  const listUsers = useServerFn(adminListUsers);
  const setRoleFn = useServerFn(adminSetRole);
  const deleteUserFn = useServerFn(adminDeleteUser);
  const updateUserFn = useServerFn(adminUpdateUser);
  const createStaffFn = useServerFn(adminCreateStaff);

  const [staff, setStaff] = useState({ email: "", password: "", fullName: "", role: "doctor" as AppRole });
  const [ann, setAnn] = useState({ title: "", body: "" });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    enabled: allowed,
    queryFn: async () => {
      const authUsers = await listUsers({ data: undefined as never });
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone");
      const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
      return authUsers.map((u) => ({
        ...u,
        full_name: profiles?.find((p) => p.id === u.id)?.full_name ?? null,
        phone: profiles?.find((p) => p.id === u.id)?.phone ?? null,
        role: (roleRows?.find((r) => r.user_id === u.id)?.role ?? "patient") as AppRole,
      }));
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats", users.length],
    enabled: allowed,
    queryFn: async () => {
      const count = async (t: string) =>
        (await supabase.from(t as never).select("id", { count: "exact", head: true })).count ?? 0;
      return {
        users: users.length,
        doctors: await count("doctors"),
        donors: await count("blood_donors"),
        appointments: await count("appointments"),
        reports: await count("medical_reports"),
        payments: await count("payments"),
      };
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["admin-appointments"],
    enabled: allowed,
    queryFn: async () =>
      (await supabase.from("appointments").select("*, doctors(full_name)").order("appointment_date", { ascending: false }).limit(100)).data ?? [],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-payments"],
    enabled: allowed,
    queryFn: async () => (await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const { data: donors = [] } = useQuery({
    queryKey: ["admin-donors"],
    enabled: allowed,
    queryFn: async () => (await supabase.from("blood_donors").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports"],
    enabled: allowed,
    queryFn: async () => (await supabase.from("medical_reports").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["admin-doctors"],
    enabled: allowed,
    queryFn: async () => (await supabase.from("doctors").select("*").order("full_name")).data ?? [],
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["admin-announcements"],
    enabled: allowed,
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const receptionists = users.filter((u) => u.role === "receptionist").length;

  const chartData = [
    { name: "Users", total: stats?.users ?? 0 },
    { name: "Doctors", total: stats?.doctors ?? 0 },
    { name: "Donors", total: stats?.donors ?? 0 },
    { name: "Appts", total: stats?.appointments ?? 0 },
    { name: "Reports", total: stats?.reports ?? 0 },
    { name: "Payments", total: stats?.payments ?? 0 },
  ];

  async function changeRole(userId: string, role: AppRole) {
    try {
      await setRoleFn({ data: { userId, role } });
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function removeUser(userId: string) {
    try {
      await deleteUserFn({ data: { userId } });
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function editUser(userId: string, currentEmail: string | null) {
    const email = window.prompt("New email (leave unchanged to keep)", currentEmail ?? "") ?? "";
    const password = window.prompt("New password (leave blank to keep)") ?? "";
    if (!email && !password) return;
    try {
      await updateUserFn({ data: { userId, email: email || undefined, password: password || undefined } });
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!staff.email || staff.password.length < 8 || !staff.fullName) return toast.error("Fill name, email and an 8+ character password");
    try {
      await createStaffFn({ data: staff });
      toast.success("Staff account ready");
      setStaff({ email: "", password: "", fullName: "", role: "doctor" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function saveAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!ann.title.trim() || !ann.body.trim()) return toast.error("Title and message are required");
    const { error } = await supabase.from("announcements").insert({ title: ann.title, body: ann.body });
    if (error) return toast.error(error.message);
    toast.success("Announcement published");
    setAnn({ title: "", body: "" });
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  }

  async function toggleAnnouncement(id: string, is_active: boolean) {
    const { error } = await supabase.from("announcements").update({ is_active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  }

  async function deleteAnnouncement(id: string) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Announcement deleted");
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  }

  async function toggleDoctor(id: string, is_active: boolean) {
    const { error } = await supabase.from("doctors").update({ is_active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-doctors"] });
  }

  async function deleteRow(table: string, id: string, key: string) {
    const { error } = await supabase.from(table as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: [key] });
  }

  if (rolesLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!allowed)
    return (
      <Card><CardContent className="p-10 text-center">
        <h1 className="text-xl font-bold">Admin access only</h1>
        <p className="text-sm text-muted-foreground mt-2">Your account ({roles.join(", ") || "patient"}) cannot open this dashboard.</p>
      </CardContent></Card>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Full control over users, staff, operations and content.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Stat icon={Users} label="Users" value={stats?.users ?? 0} />
        <Stat icon={Activity} label="Doctors" value={stats?.doctors ?? 0} />
        <Stat icon={Users} label="Receptionists" value={receptionists} />
        <Stat icon={Droplet} label="Blood donors" value={stats?.donors ?? 0} />
        <Stat icon={Activity} label="Appointments" value={stats?.appointments ?? 0} />
        <Stat icon={FileText} label="Reports" value={stats?.reports ?? 0} />
        <Stat icon={FileText} label="Payments" value={stats?.payments ?? 0} />
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="blood">Blood bank</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <Card><CardContent className="p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} className="fill-primary" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          {users.map((u) => (
            <Card key={u.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{u.full_name ?? "Unnamed"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email} · {u.phone ?? "no phone"}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={u.role} onChange={(e) => changeRole(u.id, e.target.value as AppRole)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={() => editUser(u.id, u.email)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => removeUser(u.id)}>Delete</Button>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="staff" className="mt-4 space-y-4">
          <Card><CardContent className="p-6">
            <h2 className="font-semibold mb-4">Create doctor / receptionist / admin</h2>
            <form onSubmit={createStaff} className="grid gap-3 sm:grid-cols-2">
              <div><Label>Full name</Label><Input className="mt-1.5" value={staff.fullName} onChange={(e) => setStaff({ ...staff, fullName: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" className="mt-1.5" value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" className="mt-1.5" value={staff.password} onChange={(e) => setStaff({ ...staff, password: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <select className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={staff.role} onChange={(e) => setStaff({ ...staff, role: e.target.value as AppRole })}>
                  {ROLES.filter((r) => r !== "patient").map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="bg-gradient-primary text-primary-foreground">Create staff account</Button>
              </div>
            </form>
          </CardContent></Card>

          {doctors.map((d: any) => (
            <Card key={d.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{d.full_name}</div>
                <div className="text-xs text-muted-foreground">{d.specialization} · ₹{d.consultation_fee} · {d.is_active ? "active" : "hidden"}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleDoctor(d.id, !d.is_active)}>{d.is_active ? "Hide" : "Activate"}</Button>
                <Button size="sm" variant="outline" onClick={() => deleteRow("doctors", d.id, "admin-doctors")}>Delete</Button>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4 space-y-3">
          {appointments.map((a: any) => (
            <Card key={a.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{a.doctors?.full_name ?? "Doctor"}</div>
                <div className="text-xs text-muted-foreground">{a.appointment_date} · {a.appointment_time} · {a.status}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => deleteRow("appointments", a.id, "admin-appointments")}>Delete</Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-3">
          {payments.map((p: any) => (
            <Card key={p.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">₹{p.amount}</div>
                <div className="text-xs text-muted-foreground">{p.description} · {p.status} · {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => deleteRow("payments", p.id, "admin-payments")}>Delete</Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="blood" className="mt-4 space-y-3">
          {donors.map((d: any) => (
            <Card key={d.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{d.full_name} · {d.blood_group}</div>
                <div className="text-xs text-muted-foreground">{d.city}, {d.state} · {d.phone} · {d.is_available ? "available" : "unavailable"}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => deleteRow("blood_donors", d.id, "admin-donors")}>Delete</Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-3">
          {reports.map((r: any) => (
            <Card key={r.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.report_type} · {new Date(r.created_at).toLocaleDateString()} · code {r.verification_code ?? "—"}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => deleteRow("medical_reports", r.id, "admin-reports")}>Delete</Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="announcements" className="mt-4 space-y-4">
          <Card><CardContent className="p-6">
            <form onSubmit={saveAnnouncement} className="space-y-3">
              <div><Label>Title</Label><Input className="mt-1.5" value={ann.title} onChange={(e) => setAnn({ ...ann, title: e.target.value })} /></div>
              <div><Label>Message</Label><Textarea rows={3} className="mt-1.5" value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} /></div>
              <Button type="submit" className="bg-gradient-primary text-primary-foreground">Publish announcement</Button>
            </form>
          </CardContent></Card>
          {announcements.map((a: any) => (
            <Card key={a.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.body}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleAnnouncement(a.id, !a.is_active)}>{a.is_active ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="outline" onClick={() => deleteAnnouncement(a.id)}>Delete</Button>
              </div>
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
