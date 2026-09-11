import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { INDIAN_STATES } from "@/lib/blood";
import { Building2, MapPin, Phone, Ambulance, BedDouble, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/hospitals/")({
  component: HospitalsPage,
  head: () => ({
    meta: [
      { title: "Find Hospitals Near You — HealthCuree AI" },
      { name: "description", content: "Browse the HealthCuree AI hospital network. Search by city, state or name, or use your location to find the nearest hospital with emergency and ambulance services." },
      { property: "og:title", content: "Find Hospitals Near You — HealthCuree AI" },
      { property: "og:description", content: "Search the HealthCuree AI hospital network by city, state or distance from you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Coords = { lat: number; lng: number };

function distanceKm(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function HospitalsPage() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [me, setMe] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ["public-hospitals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospitals")
        .select("id, code, name, slug, type, description, phone, emergency_contact, emergency_available, ambulance_available, beds, working_hours, address, area, city, state, latitude, longitude, logo_url")
        .eq("status", "active")
        .order("name");
      return data ?? [];
    },
  });

  function locate() {
    if (!navigator.geolocation) return toast.error("Location is not available on this device");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMe({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
        toast.success("Showing hospitals nearest to you");
      },
      () => {
        setLocating(false);
        toast.error("Could not read your location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = hospitals.filter((h: any) => {
      if (state && h.state !== state) return false;
      if (city && !(h.city ?? "").toLowerCase().includes(city.trim().toLowerCase())) return false;
      if (term && !`${h.name} ${h.city} ${h.area ?? ""} ${h.code}`.toLowerCase().includes(term)) return false;
      return true;
    });
    if (me) {
      list = [...list].sort((a: any, b: any) => {
        const da = a.latitude != null && a.longitude != null ? distanceKm(me, { lat: a.latitude, lng: a.longitude }) : Infinity;
        const db = b.latitude != null && b.longitude != null ? distanceKm(me, { lat: b.latitude, lng: b.longitude }) : Infinity;
        return da - db;
      });
    }
    return list;
  }, [hospitals, q, state, city, me]);

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Hospital network"
        title="Hospitals near you"
        description="Every hospital on HealthCuree AI — with departments, doctors, emergency and ambulance availability. Book an appointment at the one closest to you."
      />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-border/70">
          <CardContent className="p-5 grid gap-4 md:grid-cols-4">
            <div>
              <Label>Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hospital name or area" />
            </div>
            <div>
              <Label>State</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">All states</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={locate} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                {me ? "Nearest first" : "Use my location"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          {isLoading ? "Loading hospitals…" : `${results.length} hospital${results.length === 1 ? "" : "s"} found`}
        </p>

        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((h: any) => {
            const dist = me && h.latitude != null && h.longitude != null
              ? distanceKm(me, { lat: h.latitude, lng: h.longitude })
              : null;
            return (
              <Card key={h.id} className="border-border/70 hover:shadow-elevated transition-shadow">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold leading-tight">{h.name}</h2>
                        <p className="text-xs text-muted-foreground">{h.code} · {h.type}</p>
                      </div>
                    </div>
                    {dist != null && <Badge variant="secondary">{dist.toFixed(1)} km</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{[h.area, h.city, h.state].filter(Boolean).join(", ")}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {h.emergency_available && <Badge variant="destructive">24/7 Emergency</Badge>}
                    {h.ambulance_available && <Badge variant="secondary"><Ambulance className="h-3 w-3" /> Ambulance</Badge>}
                    {h.beds ? <Badge variant="outline"><BedDouble className="h-3 w-3" /> {h.beds} beds</Badge> : null}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" className="flex-1">
                      <Link to="/hospitals/$slug" params={{ slug: h.slug }}>View hospital</Link>
                    </Button>
                    {h.phone && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${h.phone}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isLoading && results.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">No hospitals match your search. Try a different city or state.</p>
        )}
      </section>
    </SiteLayout>
  );
}
