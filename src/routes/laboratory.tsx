import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { FlaskConical, ScanLine, TestTube2, Microscope } from "lucide-react";

export const Route = createFileRoute("/laboratory")({
  component: Page,
  head: () => ({ meta: [{ title: "Laboratory & Diagnostics — HealthCuree AI" }, { name: "description", content: "Full-service pathology, biochemistry, microbiology and radiology with digital report delivery." }] }),
});
function Page() {
  const items = [
    { i: FlaskConical, t: "Pathology", d: "Blood, urine, biopsy & histopathology." },
    { i: TestTube2, t: "Biochemistry", d: "Liver, kidney, thyroid, diabetes panels." },
    { i: Microscope, t: "Microbiology", d: "Culture sensitivity, PCR & infection screening." },
    { i: ScanLine, t: "Radiology", d: "X-Ray, USG, ECG, CT, MRI with expert reporting." },
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow="Laboratory" title="Diagnostics & Laboratory" description="Accurate, timely results with digital reports delivered to your patient dashboard." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-5 md:grid-cols-4">
        {items.map((c) => (
          <div key={c.t} className="rounded-2xl border p-6 bg-card">
            <c.i className="h-6 w-6 text-primary" />
            <div className="mt-3 font-semibold">{c.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.d}</div>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
