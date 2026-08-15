import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BLOOD_GROUPS, INDIAN_STATES } from "@/lib/blood";
import { searchBloodDonors, type DonorMatch } from "@/lib/blood.functions";
import { Droplet, Phone, MapPin, Search, HeartHandshake, LogIn } from "lucide-react";

export const Route = createFileRoute("/blood-bank")({
  component: BloodBankPage,
  head: () => ({
    meta: [
      { title: "Blood Bank — Find Blood Donors | HealthCuree AI" },
      { name: "description", content: "Search verified blood donors by state, city and blood group. Register as a donor and help save lives with HealthCuree AI." },
      { property: "og:title", content: "Blood Bank — Find Blood Donors | HealthCuree AI" },
      { property: "og:description", content: "Search available blood donors by state, city and blood group, or register to donate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ANY = "__any__";

function BloodBankPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(ANY);
  const [city, setCity] = useState("");
  const [group, setGroup] = useState(ANY);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const search = useServerFn(searchBloodDonors);

  const filtersReady = state !== ANY || group !== ANY || city.trim().length >= 2;

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["blood-donors", Boolean(user), state, group, city.trim().toLowerCase()],
    enabled: Boolean(user) && filtersReady,
    queryFn: () =>
      search({
        data: {
          state: state === ANY ? null : state,
          bloodGroup: group === ANY ? null : group,
          city: city.trim(),
        },
      }),
  });

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Blood Bank"
        title="Find a blood donor near you"
        description="Search our donor community by state, city and blood group — then call an available donor directly. Every registration helps save a life."
      >
        <Button asChild className="bg-gradient-primary text-primary-foreground">
          <Link to="/blood-donor">
            <HeartHandshake className="h-4 w-4" /> Register as a donor
          </Link>
        </Button>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <Card className="shadow-soft">
          <CardContent className="p-5 md:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div>
              <Label>State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any state</SelectItem>
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" className="mt-1.5" placeholder="e.g. Kakinada" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label>Blood group</Label>
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any group</SelectItem>
                  {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setState(ANY); setCity(""); setGroup(ANY); }}
            >
              <Search className="h-4 w-4" /> Reset filters
            </Button>
          </CardContent>
        </Card>

        {!ready ? null : !user ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Droplet className="mx-auto h-10 w-10 text-primary opacity-70" />
              <h2 className="mt-4 text-lg font-semibold">Sign in to view donor contacts</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Donor phone numbers are protected. Sign in to search and contact available donors.
              </p>
              <Button asChild className="mt-5 bg-gradient-primary text-primary-foreground">
                <Link to="/auth"><LogIn className="h-4 w-4" /> Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading donors…</p>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <Droplet className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-3 text-sm">No available donors match your search. Try widening the filters.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{results.length} available donor{results.length === 1 ? "" : "s"} found</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((d: DonorMatch) => (
                <Card key={d.id} className="hover:shadow-elevated transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{d.full_name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {d.city}, {d.state}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                        {d.blood_group}
                      </span>
                    </div>
                    {d.last_donation_date && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Last donated {new Date(d.last_donation_date).toLocaleDateString()}
                      </p>
                    )}
                    <Button asChild className="mt-4 w-full bg-gradient-primary text-primary-foreground">
                      <a href={`tel:${d.phone.replace(/\s/g, "")}`}>
                        <Phone className="h-4 w-4" /> Call {d.phone}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
