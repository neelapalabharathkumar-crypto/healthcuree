import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/health-packages")({
  component: Page,
  head: () => ({ meta: [{ title: "Health Packages — HealthCuree AI" }, { name: "description", content: "Preventive health check-up packages: basic, comprehensive, executive and cardiac screenings." }] }),
});

const packages = [
  { name: "Basic", price: 999, includes: ["Complete Blood Count", "Blood Sugar", "Urine Routine", "BP & BMI", "Physician Consult"] },
  { name: "Comprehensive", price: 2499, popular: true, includes: ["Everything in Basic", "Lipid Profile", "LFT & KFT", "Thyroid (TSH)", "ECG & Chest X-Ray"] },
  { name: "Executive", price: 4999, includes: ["Everything in Comprehensive", "USG Abdomen", "2D Echo", "TMT", "HbA1c & Vitamin D/B12"] },
  { name: "Cardiac Care", price: 3499, includes: ["ECG", "2D Echo", "TMT", "Lipid Profile", "Cardiology Consult"] },
];

function Page() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Health Packages" title="Preventive Health Check-ups" description="Screening packages tailored for every age and lifestyle." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((p) => (
          <div key={p.name} className={`rounded-2xl border p-6 bg-card ${p.popular ? "border-primary shadow-elevated" : ""}`}>
            {p.popular && <div className="text-xs font-semibold text-primary mb-2">MOST POPULAR</div>}
            <h3 className="text-xl font-bold">{p.name}</h3>
            <div className="mt-2 text-3xl font-bold text-gradient-primary">₹{p.price}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {p.includes.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent mt-0.5" /> {i}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full mt-6 bg-gradient-primary text-primary-foreground">
              <Link to="/book">Book Now</Link>
            </Button>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
