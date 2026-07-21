import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/blog")({
  component: BlogPage,
  head: () => ({ meta: [{ title: "Health Blog — HealthCuree AI" }, { name: "description", content: "Health articles from our specialists — cardiology, neurology, pediatrics, wellness and more." }] }),
});

function BlogPage() {
  const { data: blogs = [] } = useQuery({
    queryKey: ["blogs-all"],
    queryFn: async () => (await supabase.from("blogs").select("*").eq("published", true).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <SiteLayout>
      <PageHeader eyebrow="Health Blog" title="Insights from Our Doctors" description="Evidence-based articles to help you live healthier." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {blogs.map((b) => (
          <article key={b.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-elevated transition-all">
            <div className="h-40 bg-gradient-accent" />
            <div className="p-6">
              <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()} · {b.author}</div>
              <h3 className="mt-2 font-semibold text-lg">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.excerpt}</p>
              <p className="mt-4 text-sm whitespace-pre-line line-clamp-4">{b.content}</p>
            </div>
          </article>
        ))}
      </section>
    </SiteLayout>
  );
}
