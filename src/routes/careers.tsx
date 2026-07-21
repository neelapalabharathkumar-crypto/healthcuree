import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/careers")({
  component: Page,
  head: () => ({ meta: [{ title: "Careers — HealthCuree AI" }, { name: "description", content: "Join our team of doctors, nurses and technologists shaping the future of hospital care." }] }),
});
const openings = [
  { title: "Consultant Cardiologist", type: "Full-time · Kakinada" },
  { title: "Registered Nurse — ICU", type: "Full-time · Kakinada" },
  { title: "Radiographer", type: "Full-time · Kakinada" },
  { title: "Front-Desk Executive", type: "Full-time · Kakinada" },
];
function Page() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Careers" title="Grow Your Career with HealthCuree AI" description="Build a career at the intersection of medicine and technology." />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 grid gap-4">
        {openings.map((o) => (
          <Card key={o.title}><CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"><Briefcase className="h-5 w-5 text-primary" /></div>
              <div>
                <div className="font-semibold">{o.title}</div>
                <div className="text-sm text-muted-foreground">{o.type}</div>
              </div>
            </div>
            <a href={`mailto:${SITE.email}?subject=Application: ${encodeURIComponent(o.title)}`} className="text-sm font-medium text-primary hover:underline">Apply →</a>
          </CardContent></Card>
        ))}
      </section>
    </SiteLayout>
  );
}
