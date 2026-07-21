import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Brain, Bone, Baby, Flower, Sparkles, Ear, Stethoscope } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart: HeartPulse, Brain, Bone, Baby, Flower, Sparkles, Ear, Stethoscope,
};

export const Route = createFileRoute("/departments")({
  component: DepartmentsPage,
  head: () => ({
    meta: [
      { title: "Departments — HealthCuree AI" },
      { name: "description", content: "Explore HealthCuree AI's departments: cardiology, neurology, orthopedics, pediatrics, gynecology, dermatology, ENT and more." },
    ],
  }),
});

function DepartmentsPage() {
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-all"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("is_active", true).order("name");
      return data ?? [];
    },
  });
  return (
    <SiteLayout>
      <PageHeader eyebrow="Departments" title="Specialties & Departments" description="Board-certified specialists across every major clinical department, supported by modern diagnostics and 24/7 emergency care." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => {
            const Icon = iconMap[d.icon ?? ""] ?? Stethoscope;
            return (
              <Card key={d.id} className="border-border/70 hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{d.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{d.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
