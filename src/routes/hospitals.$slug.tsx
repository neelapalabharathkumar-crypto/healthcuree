import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone, Mail, Clock, Ambulance, BedDouble, Stethoscope, Droplet } from "lucide-react";

export const Route = createFileRoute("/hospitals/$slug")({
  component: HospitalDetail,
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — HealthCuree AI` },
        { name: "description", content: `Departments, doctors, emergency services and appointment booking at ${name} on HealthCuree AI.` },
        { property: "og:title", content: `${name} — HealthCuree AI` },
        { property: "og:description", content: `Departments, doctors and appointment booking at ${name}.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function HospitalDetail() {
  const { slug } = Route.useParams();

  const { data: hospital, isLoading } = useQuery({
    queryKey: ["hospital", slug],
    queryFn: async () => {
      const { data } = await supabase.from("hospitals").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
      return data;
    },
  });

  const hospitalId = hospital?.id;

  const { data: departments = [] } = useQuery({
    enabled: !!hospitalId,
    queryKey: ["hospital-departments", hospitalId],
    queryFn: async () =>
      (await supabase.from("departments").select("*").eq("hospital_id", hospitalId!).eq("is_active", true).order("name")).data ?? [],
  });

  const { data: doctors = [] } = useQuery({
    enabled: !!hospitalId,
    queryKey: ["hospital-doctors", hospitalId],
    queryFn: async () =>
      (await supabase.from("doctors").select("id, full_name, specialization, qualifications, experience_years, consultation_fee, image_url").eq("hospital_id", hospitalId!).eq("is_active", true).order("full_name")).data ?? [],
  });

  const { data: blood = [] } = useQuery({
    enabled: !!hospitalId,
    queryKey: ["hospital-blood", hospitalId],
    queryFn: async () =>
      (await supabase.from("blood_bank_stock").select("blood_group, units").eq("hospital_id", hospitalId!).order("blood_group")).data ?? [],
  });

  if (isLoading) {
    return <SiteLayout><div className="mx-auto max-w-7xl px-4 py-24 text-muted-foreground">Loading hospital…</div></SiteLayout>;
  }
  if (!hospital) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center space-y-4">
          <h1 className="text-2xl font-semibold">Hospital not found</h1>
          <p className="text-muted-foreground">This hospital may have been removed or is not active.</p>
          <Button asChild><Link to="/hospitals">Browse all hospitals</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow={`${hospital.code} · ${hospital.type}`}
        title={hospital.name}
        description={hospital.description ?? `${hospital.name} on the HealthCuree AI network — book appointments, view departments and reach emergency services.`}
      />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border/70">
            <CardContent className="p-6 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Departments</h2>
              {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Departments are being added for this hospital.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {departments.map((d: any) => (
                    <div key={d.id} className="rounded-lg border border-border/70 p-4">
                      <p className="font-medium">{d.name}</p>
                      {d.consultation_fee != null && <p className="text-xs text-muted-foreground">Consultation ₹{d.consultation_fee}</p>}
                      {d.available_time_start && (
                        <p className="text-xs text-muted-foreground">{d.available_time_start} – {d.available_time_end}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardContent className="p-6 space-y-3">
              <h2 className="font-semibold">Doctors</h2>
              {doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Doctor profiles are being added for this hospital.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {doctors.map((d: any) => (
                    <div key={d.id} className="rounded-lg border border-border/70 p-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialization}</p>
                        {d.experience_years ? <p className="text-xs text-muted-foreground">{d.experience_years} yrs experience</p> : null}
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/book" search={{ doctor: d.id }}>Book</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {blood.length > 0 && (
            <Card className="border-border/70">
              <CardContent className="p-6 space-y-3">
                <h2 className="font-semibold flex items-center gap-2"><Droplet className="h-4 w-4 text-primary" /> Blood bank stock</h2>
                <div className="flex flex-wrap gap-2">
                  {blood.map((b: any) => (
                    <Badge key={b.blood_group} variant={b.units > 0 ? "secondary" : "outline"}>
                      {b.blood_group}: {b.units} units
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="border-border/70">
            <CardContent className="p-6 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{hospital.name}</p>
                  <p className="text-xs text-muted-foreground">{hospital.code}</p>
                </div>
              </div>
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{[hospital.address, hospital.area, hospital.city, hospital.state, hospital.pin_code].filter(Boolean).join(", ")}</span>
              </p>
              {hospital.working_hours && (
                <p className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> {hospital.working_hours}</p>
              )}
              {hospital.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> <a className="hover:text-primary" href={`tel:${hospital.phone}`}>{hospital.phone}</a></p>}
              {hospital.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> <a className="hover:text-primary" href={`mailto:${hospital.email}`}>{hospital.email}</a></p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {hospital.emergency_available && <Badge variant="destructive">24/7 Emergency</Badge>}
                {hospital.ambulance_available && <Badge variant="secondary"><Ambulance className="h-3 w-3" /> Ambulance</Badge>}
                {hospital.beds ? <Badge variant="outline"><BedDouble className="h-3 w-3" /> {hospital.beds} beds</Badge> : null}
              </div>
              <div className="grid gap-2 pt-2">
                <Button asChild><Link to="/book">Book appointment</Link></Button>
                {hospital.emergency_contact && (
                  <Button asChild variant="outline"><a href={`tel:${hospital.emergency_contact}`}>Emergency: {hospital.emergency_contact}</a></Button>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </SiteLayout>
  );
}
