import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Stethoscope, Ambulance, Pill, FlaskConical, HeartHandshake,
  Baby, ScanLine, Syringe,
} from "lucide-react";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Services — HealthCuree AI" },
      { name: "description", content: "OPD consultations, emergency care, pharmacy, laboratory, health packages, diagnostics, vaccination and more." },
    ],
  }),
});

const services = [
  { icon: Stethoscope, title: "OPD Consultations", desc: "Online & in-person visits with specialists across all departments." },
  { icon: Ambulance, title: "Emergency Care", desc: "24/7 emergency room with rapid-response and ambulance services." },
  { icon: Pill, title: "Pharmacy", desc: "In-house pharmacy with home delivery for prescriptions." },
  { icon: FlaskConical, title: "Laboratory", desc: "Full-service pathology, biochemistry and microbiology labs." },
  { icon: HeartHandshake, title: "Health Packages", desc: "Preventive check-ups for individuals, couples and families." },
  { icon: Baby, title: "Maternal Care", desc: "Pregnancy, delivery, neonatal and pediatric services." },
  { icon: ScanLine, title: "Diagnostics", desc: "X-Ray, ECG, ultrasound, CT and MRI with expert reporting." },
  { icon: Syringe, title: "Vaccination", desc: "Adult, child and travel vaccinations administered on schedule." },
];

function ServicesPage() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Services" title="Comprehensive Healthcare Services" description="From daily OPD care to specialist surgery, diagnostics and preventive health packages — all in one place." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Card key={s.title} className="border-border/70 hover:shadow-elevated transition-shadow">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-xl bg-accent/15 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
