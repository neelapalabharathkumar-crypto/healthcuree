import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/lib/site";
import {
  ArrowRight, Sparkles, Phone, Calendar, Bot, ShieldCheck,
  Clock, Award, Users, HeartPulse, Stethoscope, Brain, Bone, Baby,
  Ear, Flower, Star, MapPin, Mail
} from "lucide-react";
import logoImg from "@/assets/healthcuree-logo.jpeg";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart: HeartPulse, Brain, Bone, Baby, Flower, Ear, Stethoscope, Sparkles,
};

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "HealthCuree AI — Smart Healthcare. Powered by AI." },
      { name: "description", content: "Book doctor appointments, access records and use the AI health assistant. Modern hospital management for Kakinada, Andhra Pradesh." },
    ],
  }),
});

function Home() {
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("is_active", true).order("name");
      return data ?? [];
    },
  });
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("doctors")
        .select("id, full_name, specialization, image_url, consultation_fee, experience_years, department_id, departments(name)")
        .eq("is_active", true)
        .limit(4);
      return data ?? [];
    },
  });
  const { data: testimonials = [] } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data } = await supabase.from("testimonials").select("*").eq("approved", true).limit(3);
      return data ?? [];
    },
  });
  const { data: blogs = [] } = useQuery({
    queryKey: ["blogs-latest"],
    queryFn: async () => {
      const { data } = await supabase.from("blogs").select("*").eq("published", true).order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.25), transparent 50%), radial-gradient(circle at 80% 80%, oklch(0.62 0.18 150 / 0.4), transparent 55%)" }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="text-primary-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> AI-Powered Healthcare
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Smart Healthcare.<br />
                <span className="text-white/90">Powered by AI.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base md:text-lg text-white/85">
                Book appointments, access medical records and get instant AI-guided
                symptom analysis — all from one secure platform trusted by patients
                and clinicians.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-elevated">
                  <Link to="/book"><Calendar className="h-4 w-4" /> Book Appointment</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20">
                  <Link to="/ai-assistant"><Bot className="h-4 w-4" /> AI Health Assistant</Link>
                </Button>
                <a href={`tel:${SITE.phone.replace(/\s/g,'')}`} className="inline-flex items-center gap-2 rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                  <Phone className="h-4 w-4" /> Emergency: {SITE.phone}
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                {[
                  { n: "50k+", l: "Happy Patients" },
                  { n: "120+", l: "Expert Doctors" },
                  { n: "24/7", l: "Emergency Care" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-white/10 backdrop-blur border border-white/15 px-3 py-4 text-center">
                    <div className="text-2xl font-bold">{s.n}</div>
                    <div className="text-[11px] uppercase tracking-wider text-white/80 mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-elevated">
                <img src={logoImg} alt="HealthCuree AI" className="w-full max-w-sm mx-auto rounded-2xl" />
                <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white p-4 shadow-elevated">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Secured &amp; HIPAA-aligned</div>
                      <div className="text-sm font-semibold">Your data, protected.</div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 rounded-2xl bg-white p-4 shadow-elevated">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Average wait</div>
                      <div className="text-sm font-semibold">Under 15 minutes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEPARTMENTS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Departments</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold">Comprehensive Care Under One Roof</h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/departments">View all <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {departments.slice(0, 8).map((d) => {
            const Icon = iconMap[d.icon ?? ""] ?? Stethoscope;
            return (
              <Link key={d.id} to="/departments" className="group rounded-2xl border border-border bg-card p-6 hover:shadow-elevated hover:-translate-y-1 transition-all">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft group-hover:shadow-glow">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mt-4 font-semibold">{d.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{d.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-gradient-soft border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why HealthCuree AI</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold">Care that's smart, timely and human.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Bot, title: "AI Health Assistant", desc: "Instant symptom analysis with department & urgency recommendations." },
              { icon: ShieldCheck, title: "Secure Records", desc: "Encrypted patient records with role-based access — always available." },
              { icon: Award, title: "Expert Doctors", desc: "Board-certified specialists across every major department." },
              { icon: Clock, title: "24/7 Emergency", desc: "Dedicated emergency team, ambulance & rapid response." },
              { icon: Users, title: "Family Care", desc: "Comprehensive family health packages and preventive screenings." },
              { icon: HeartPulse, title: "Modern Facilities", desc: "State-of-the-art diagnostics, ICU and surgical suites." },
            ].map((f) => (
              <Card key={f.title} className="border-border/70 hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-accent/15 flex items-center justify-center">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DOCTORS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Meet Our Doctors</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold">Featured Specialists</h2>
          </div>
          <Button asChild variant="ghost"><Link to="/doctors">All doctors <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {doctors.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-elevated transition-all">
              <div className="h-40 bg-gradient-primary flex items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold text-white">
                  {doc.full_name.split(" ").slice(-1)[0][0]}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold">{doc.full_name}</h3>
                <p className="text-sm text-primary mt-0.5">{doc.specialization}</p>
                <p className="text-xs text-muted-foreground mt-2">{doc.experience_years}+ yrs experience · ₹{doc.consultation_fee}</p>
                <Button asChild size="sm" className="w-full mt-4 bg-gradient-primary text-primary-foreground">
                  <Link to="/book" search={{ doctor: doc.id } as never}>Book</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-gradient-soft border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Testimonials</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold">Trusted by Patients Across India</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.id} className="border-border/70">
                <CardContent className="p-6">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-foreground/80">"{t.content}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Health Blog</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold">Latest From Our Experts</h2>
          </div>
          <Button asChild variant="ghost"><Link to="/blog">Read all <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {blogs.map((b) => (
            <article key={b.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-elevated transition-all">
              <div className="h-40 bg-gradient-accent" />
              <div className="p-6">
                <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</div>
                <h3 className="mt-2 font-semibold text-lg line-clamp-2">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{b.excerpt}</p>
                <div className="mt-4 text-sm font-medium text-primary">By {b.author}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CONTACT + MAP */}
      <section id="contact" className="bg-gradient-soft border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Get in touch</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold">We're here to help, 24/7.</h2>
              <p className="mt-4 text-muted-foreground max-w-lg">
                Reach us anytime for appointments, emergencies, or general enquiries.
                Our team responds within minutes.
              </p>
              <div className="mt-6 space-y-3">
                <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 rounded-xl bg-card border p-4 hover:shadow-soft">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-semibold">{SITE.email}</div>
                  </div>
                </a>
                <a href={`tel:${SITE.phone.replace(/\s/g,'')}`} className="flex items-center gap-3 rounded-xl bg-card border p-4 hover:shadow-soft">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Phone / WhatsApp</div>
                    <div className="font-semibold">{SITE.phone}</div>
                  </div>
                </a>
                <div className="flex items-center gap-3 rounded-xl bg-card border p-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="font-semibold">{SITE.address}</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/contact">Contact form</Link></Button>
                <Button asChild variant="outline"><Link to="/book">Book Appointment</Link></Button>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border shadow-elevated aspect-[4/3]">
              <iframe
                src={SITE.mapEmbed}
                className="w-full h-full"
                loading="lazy"
                title="HealthCuree AI location"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
