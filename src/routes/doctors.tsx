import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, Award } from "lucide-react";

export const Route = createFileRoute("/doctors")({
  component: DoctorsPage,
  head: () => ({
    meta: [
      { title: "Our Doctors — HealthCuree AI" },
      { name: "description", content: "Meet HealthCuree AI's specialists. Search by name, specialization or department, and book online in seconds." },
    ],
  }),
});

function DoctorsPage() {
  const [q, setQ] = useState("");
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("doctors")
        .select("id, full_name, specialization, image_url, consultation_fee, experience_years, qualifications, bio, departments(name)")
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
  });
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return doctors;
    return doctors.filter((d: any) =>
      d.full_name.toLowerCase().includes(s) ||
      d.specialization.toLowerCase().includes(s) ||
      d.departments?.name?.toLowerCase().includes(s),
    );
  }, [doctors, q]);

  return (
    <SiteLayout>
      <PageHeader eyebrow="Doctors" title="Meet Our Specialists" description="Search doctors by name, specialization or department." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, specialty…" className="pl-9 h-11" />
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc: any) => (
            <div key={doc.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-elevated transition-all">
              <div className="h-40 bg-gradient-primary flex items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold text-white">
                  {doc.full_name.split(" ").slice(-1)[0][0]}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold">{doc.full_name}</h3>
                <p className="text-sm text-primary mt-0.5">{doc.specialization}</p>
                <p className="text-xs text-muted-foreground mt-2">{doc.departments?.name} · {doc.experience_years}+ yrs</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Award className="h-3.5 w-3.5" /> {doc.qualifications}
                </div>
                <div className="mt-3 text-sm font-semibold">₹{doc.consultation_fee}</div>
                <Button asChild size="sm" className="w-full mt-4 bg-gradient-primary text-primary-foreground">
                  <Link to="/book" search={{ doctor: doc.id } as never}>Book Appointment</Link>
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm">No doctors match your search.</p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
