import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export const Route = createFileRoute("/testimonials")({
  component: Page,
  head: () => ({ meta: [{ title: "Patient Testimonials — HealthCuree AI" }, { name: "description", content: "Real stories from patients across India." }] }),
});
function Page() {
  const { data: items = [] } = useQuery({
    queryKey: ["testimonials-all"],
    queryFn: async () => (await supabase.from("testimonials").select("*").eq("approved", true)).data ?? [],
  });
  return (
    <SiteLayout>
      <PageHeader eyebrow="Testimonials" title="What Our Patients Say" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <Card key={t.id}><CardContent className="p-6">
            <div className="flex gap-0.5">{Array.from({ length: t.rating ?? 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}</div>
            <p className="mt-4 text-sm text-foreground/80">"{t.content}"</p>
            <div className="mt-5 text-sm"><b>{t.name}</b> · {t.role}</div>
          </CardContent></Card>
        ))}
      </section>
    </SiteLayout>
  );
}
