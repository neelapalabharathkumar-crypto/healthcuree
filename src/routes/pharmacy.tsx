import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Pill, Truck, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/pharmacy")({
  component: Page,
  head: () => ({ meta: [{ title: "Pharmacy — HealthCuree AI" }, { name: "description", content: "In-house pharmacy with authentic medicines and home delivery across Kakinada." }] }),
});
function Page() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Pharmacy" title="In-house Pharmacy" description="Authentic medicines dispensed by licensed pharmacists, with prescription verification and home delivery." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-5 md:grid-cols-4">
        {[
          { i: Pill, t: "10,000+ SKUs", d: "Branded and generic medicines." },
          { i: Truck, t: "Home Delivery", d: "Free within Kakinada city." },
          { i: ShieldCheck, t: "Verified", d: "Every prescription checked." },
          { i: Clock, t: "24/7", d: "Emergency medicines round the clock." },
        ].map((c) => (
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
