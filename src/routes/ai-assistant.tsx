import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSymptoms } from "@/lib/ai-assistant.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, AlertTriangle, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-assistant")({
  component: Page,
  head: () => ({ meta: [
    { title: "AI Health Assistant — HealthCuree AI" },
    { name: "description", content: "Describe your symptoms and get instant AI-guided analysis with recommended department, urgency and next steps." },
  ]}),
});

function Page() {
  const [form, setForm] = useState({
    symptoms: "", age: "", gender: "", temperature: "", height: "", weight: "",
    bloodPressure: "", duration: "", existingDiseases: "", allergies: "",
  });
  const analyze = useServerFn(analyzeSymptoms);
  const mut = useMutation({
    mutationFn: () => analyze({ data: form }),
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.symptoms.trim().length < 3) return toast.error("Please describe your symptoms");
    mut.mutate();
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="AI Health Assistant"
        title="Get Instant Guidance for Your Symptoms"
        description="Answer a few questions and our AI will suggest possible conditions, the right department, urgency and home-care advice. Not a replacement for a doctor."
      />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 grid gap-8 lg:grid-cols-2">
        <Card className="shadow-elevated">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 text-primary">
              <Bot className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Symptom Check</span>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div><Label htmlFor="sym">Describe your symptoms *</Label>
                <Textarea id="sym" rows={4} value={form.symptoms} onChange={(e) => setForm({...form, symptoms: e.target.value})} placeholder="e.g., persistent headache with mild fever for 2 days…" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label>Age</Label><Input value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} placeholder="30" /></div>
                <div><Label>Gender</Label>
                  <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
                    <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} placeholder="2 days" /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div><Label>Temp (°F)</Label><Input value={form.temperature} onChange={(e) => setForm({...form, temperature: e.target.value})} /></div>
                <div><Label>Height</Label><Input value={form.height} onChange={(e) => setForm({...form, height: e.target.value})} placeholder="170cm" /></div>
                <div><Label>Weight</Label><Input value={form.weight} onChange={(e) => setForm({...form, weight: e.target.value})} placeholder="65kg" /></div>
                <div><Label>BP</Label><Input value={form.bloodPressure} onChange={(e) => setForm({...form, bloodPressure: e.target.value})} placeholder="120/80" /></div>
              </div>
              <div><Label>Existing diseases</Label><Input value={form.existingDiseases} onChange={(e) => setForm({...form, existingDiseases: e.target.value})} placeholder="Diabetes, hypertension…" /></div>
              <div><Label>Allergies</Label><Input value={form.allergies} onChange={(e) => setForm({...form, allergies: e.target.value})} placeholder="Penicillin…" /></div>

              <Button type="submit" disabled={mut.isPending} className="w-full bg-gradient-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" /> {mut.isPending ? "Analyzing…" : "Analyze Symptoms"}
              </Button>
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning shrink-0" />
                AI guidance is informational only and is not a substitute for professional medical advice. In an emergency, call our hospital immediately.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardContent className="p-6 md:p-8">
            <h3 className="font-semibold">AI Analysis</h3>
            {mut.isPending && <p className="text-sm text-muted-foreground mt-4">Analyzing your symptoms…</p>}
            {!mut.data && !mut.isPending && (
              <p className="text-sm text-muted-foreground mt-4">Your personalized analysis will appear here after you submit the form.</p>
            )}
            {mut.data && (
              <>
                <div className="prose prose-sm max-w-none mt-4 prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-primary">
                  <ReactMarkdown>{mut.data.content}</ReactMarkdown>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/book"><Calendar className="h-4 w-4" /> Book Appointment</Link></Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  );
}
