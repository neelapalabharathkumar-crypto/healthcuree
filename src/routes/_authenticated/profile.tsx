import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({ component: Page });

function Page() {
  const [profile, setProfile] = useState<any>({ full_name: "", phone: "", date_of_birth: "", gender: "", address: "", blood_group: "" });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (data) setProfile({ ...data });
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, ...profile });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <Card><CardContent className="p-6 md:p-8">
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Email</Label><Input value={email} disabled /></div>
            <div><Label>Full name</Label><Input value={profile.full_name ?? ""} onChange={(e) => setProfile({...profile, full_name: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={profile.phone ?? ""} onChange={(e) => setProfile({...profile, phone: e.target.value})} /></div>
            <div><Label>Date of birth</Label><Input type="date" value={profile.date_of_birth ?? ""} onChange={(e) => setProfile({...profile, date_of_birth: e.target.value})} /></div>
            <div><Label>Gender</Label>
              <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={profile.gender ?? ""} onChange={(e) => setProfile({...profile, gender: e.target.value})}>
                <option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div><Label>Blood group</Label>
              <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={profile.blood_group ?? ""} onChange={(e) => setProfile({...profile, blood_group: e.target.value})}>
                <option value="">Unknown</option>{["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Address</Label><Textarea rows={3} value={profile.address ?? ""} onChange={(e) => setProfile({...profile, address: e.target.value})} /></div>
          <Button type="submit" disabled={loading} className="bg-gradient-primary text-primary-foreground">{loading ? "Saving…" : "Save changes"}</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
