import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Ambulance, Phone, Clock, ShieldCheck, HeartPulse } from "lucide-react";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/emergency")({
  component: EmergencyPage,
  head: () => ({
    meta: [
      { title: "Emergency Care 24/7 — HealthCuree AI" },
      { name: "description", content: "24/7 emergency room, ambulance dispatch and rapid response. Call HealthCuree AI now." },
    ],
  }),
});

function EmergencyPage() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Emergency" title="24/7 Emergency Care" description="Every second matters. Our emergency team is on standby round-the-clock with ambulance dispatch, critical care and trauma response." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-3xl bg-gradient-hero p-10 text-primary-foreground shadow-elevated">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Call the Emergency Line</h2>
              <p className="mt-2 text-white/85">Ambulance dispatch within minutes, anywhere in Kakinada.</p>
            </div>
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-elevated">
              <a href={`tel:${SITE.phone.replace(/\s/g,'')}`}><Phone className="h-4 w-4" /> {SITE.phone}</a>
            </Button>
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {[
            { i: Ambulance, t: "Ambulance", d: "GPS-tracked, ICU-equipped." },
            { i: Clock, t: "< 15 min response", d: "Rapid triage on arrival." },
            { i: ShieldCheck, t: "Trauma team", d: "Ortho, neuro & general surgery on-call." },
            { i: HeartPulse, t: "Cardiac care", d: "24/7 cath lab & CCU." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border p-6 bg-card">
              <c.i className="h-6 w-6 text-primary" />
              <div className="mt-3 font-semibold">{c.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.d}</div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
