import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/gallery")({
  component: Page,
  head: () => ({ meta: [{ title: "Gallery — HealthCuree AI" }, { name: "description", content: "A glimpse of our facilities, teams and events." }] }),
});
function Page() {
  const tiles = Array.from({ length: 9 }).map((_, i) => i);
  return (
    <SiteLayout>
      <PageHeader eyebrow="Gallery" title="Inside HealthCuree AI" description="Our facilities, teams and moments of care." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((i) => (
          <div key={i} className="aspect-[4/3] rounded-2xl bg-gradient-primary shadow-soft overflow-hidden relative">
            <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at ${20 + i * 8}% ${30 + i * 6}%, oklch(0.62 0.18 150 / 0.6), transparent 60%)` }} />
            <div className="absolute bottom-4 left-4 text-white text-sm font-medium">Facility {i + 1}</div>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
