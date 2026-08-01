import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BLOOD_GROUPS, INDIAN_STATES } from "@/lib/blood";
import { toast } from "sonner";
import { z } from "zod";
import { Droplet, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/blood-donor")({ component: DonorPage });

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  email: z.string().trim().email("Enter a valid email").max(255),
  blood_group: z.string().min(1, "Select your blood group"),
  city: z.string().trim().min(2, "Enter your city").max(80),
  state: z.string().min(1, "Select your state"),
  age: z.union([z.literal(""), z.coerce.number().int().min(16, "Donors must be 16+").max(100)]),
  last_donation_date: z.string(),
});

function DonorPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", blood_group: "", city: "", state: "",
    age: "", last_donation_date: "", is_available: true,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: donor, isLoading } = useQuery({
    queryKey: ["my-donor"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return null;
      const { data, error } = await supabase
        .from("blood_donors").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (donor) {
      setForm({
        full_name: donor.full_name ?? "",
        phone: donor.phone ?? "",
        email: donor.email ?? "",
        blood_group: donor.blood_group ?? "",
        city: donor.city ?? "",
        state: donor.state ?? "",
        age: donor.age != null ? String(donor.age) : "",
        last_donation_date: donor.last_donation_date ?? "",
        is_available: donor.is_available,
      });
    } else if (me) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || (me.user_metadata?.full_name as string) || "",
        email: f.email || me.email || "",
        phone: f.phone || (me.user_metadata?.phone as string) || "",
      }));
    }
  }, [donor, me]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return toast.error("You must be signed in");

    setSaving(true);
    const payload = {
      user_id: user.id,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      blood_group: parsed.data.blood_group,
      city: parsed.data.city,
      state: parsed.data.state,
      age: parsed.data.age === "" ? null : Number(parsed.data.age),
      last_donation_date: form.last_donation_date || null,
      is_available: form.is_available,
    };
    const { error } = await supabase.from("blood_donors").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(donor ? "Donor details updated" : "You're registered as a blood donor");
    qc.invalidateQueries({ queryKey: ["my-donor"] });
    qc.invalidateQueries({ queryKey: ["blood-donors"] });
  }

  async function remove() {
    if (!donor) return;
    const { error } = await supabase.from("blood_donors").delete().eq("id", donor.id);
    if (error) return toast.error(error.message);
    toast.success("Removed from the blood bank");
    setForm({ full_name: "", phone: "", email: "", blood_group: "", city: "", state: "", age: "", last_donation_date: "", is_available: true });
    qc.invalidateQueries({ queryKey: ["my-donor"] });
    qc.invalidateQueries({ queryKey: ["blood-donors"] });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Droplet className="h-6 w-6 text-primary" /> Blood Donor Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your details appear in the Blood Bank search only while availability is on.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/blood-bank"><Search className="h-4 w-4" /> Find donors</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="fn">Full name *</Label>
                <Input id="fn" className="mt-1.5" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="ph">Phone number *</Label>
                <Input id="ph" className="mt-1.5" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="em">Email *</Label>
                <Input id="em" type="email" className="mt-1.5" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div>
                <Label>Blood group *</Label>
                <Select value={form.blood_group} onValueChange={(v) => set("blood_group", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State *</Label>
                <Select value={form.state} onValueChange={(v) => set("state", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ct">City *</Label>
                <Input id="ct" className="mt-1.5" value={form.city} onChange={(e) => set("city", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="ag">Age (optional)</Label>
                <Input id="ag" type="number" min={16} max={100} className="mt-1.5" value={form.age} onChange={(e) => set("age", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="ld">Last blood donation date (optional)</Label>
                <Input id="ld" type="date" className="mt-1.5" value={form.last_donation_date} onChange={(e) => set("last_donation_date", e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-4">
                <div>
                  <div className="font-medium text-sm">Availability status</div>
                  <div className="text-xs text-muted-foreground">
                    {form.is_available ? "Available — visible in donor search" : "Not available — hidden from search"}
                  </div>
                </div>
                <Switch checked={form.is_available} onCheckedChange={(v) => set("is_available", v)} />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground">
                  {saving ? "Saving…" : donor ? "Update details" : "Register as donor"}
                </Button>
                {donor && (
                  <Button type="button" variant="outline" onClick={remove}>
                    <Trash2 className="h-4 w-4" /> Remove me
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
