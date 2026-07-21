import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, ShieldCheck, Sparkles, Users, Award, Bot } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({
    meta: [
      { title: "About HealthCuree AI — Our Mission & Vision" },
      { name: "description", content: "HealthCuree AI is an AI-powered healthcare platform helping hospitals manage appointments, records, doctors, billing and medical reports." },
    ],
  }),
});

function About() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="About Us"
        title="Rethinking Hospital Care with AI"
        description="HealthCuree AI is an AI-powered healthcare platform helping hospitals manage appointments, patient records, doctors, billing and medical reports through a secure, modern digital system."
      />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold">Our Mission</h2>
            <p className="mt-4 text-muted-foreground">
              To make quality healthcare accessible, efficient and personal — using
              AI to remove friction between patients and the right care.
            </p>
            <h2 className="mt-8 text-3xl font-bold">Our Vision</h2>
            <p className="mt-4 text-muted-foreground">
              A future where every hospital runs on connected data, every patient
              carries their history in one tap, and doctors spend more time healing
              than paperwork.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-hero p-10 text-primary-foreground shadow-elevated">
            <blockquote className="text-2xl font-semibold leading-snug">
              "Smart Healthcare. Powered by AI."
            </blockquote>
            <p className="mt-4 text-white/80">
              We built HealthCuree AI to give hospitals in tier-2 and tier-3 India
              the same digital tools as the best global hospitals.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            { icon: HeartPulse, title: "Patient-First", desc: "Every feature is designed to reduce wait time and stress." },
            { icon: ShieldCheck, title: "Privacy & Security", desc: "Encrypted, role-based access to your health data." },
            { icon: Sparkles, title: "Continuous Innovation", desc: "AI models updated to reflect the latest medical guidance." },
            { icon: Users, title: "Team of Experts", desc: "Board-certified doctors across every department." },
            { icon: Award, title: "Quality Care", desc: "Modern equipment and evidence-based protocols." },
            { icon: Bot, title: "Truly Digital", desc: "From booking to prescription — everything online." },
          ].map((v) => (
            <Card key={v.title} className="border-border/70">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
