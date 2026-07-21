import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () => ({
    meta: [
      { title: "Contact HealthCuree AI" },
      { name: "description", content: "Get in touch with HealthCuree AI. Kakinada, Andhra Pradesh. Email, phone, WhatsApp." },
    ],
  }),
});

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Message required").max(5000),
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Thank you! We'll get back to you shortly.");
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  }

  return (
    <SiteLayout>
      <PageHeader eyebrow="Contact" title="Get in Touch" description="We're here 24/7 for appointments, emergencies and enquiries." />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={submit} className="rounded-2xl border bg-card p-6 md:p-8 space-y-4 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="name">Name</Label><Input id="name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
              <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
            <div><Label htmlFor="subject">Subject</Label><Input id="subject" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} /></div>
            <div><Label htmlFor="message">Message</Label><Textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} required /></div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              <Send className="h-4 w-4" /> {loading ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
        <div className="space-y-4">
          <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 rounded-xl bg-card border p-4 hover:shadow-soft">
            <Mail className="h-5 w-5 text-primary" /><div><div className="text-xs text-muted-foreground">Email</div><div className="font-semibold">{SITE.email}</div></div>
          </a>
          <a href={`tel:${SITE.phone.replace(/\s/g,'')}`} className="flex items-center gap-3 rounded-xl bg-card border p-4 hover:shadow-soft">
            <Phone className="h-5 w-5 text-primary" /><div><div className="text-xs text-muted-foreground">Phone</div><div className="font-semibold">{SITE.phone}</div></div>
          </a>
          <a href={`https://wa.me/${SITE.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-card border p-4 hover:shadow-soft">
            <MessageCircle className="h-5 w-5 text-accent" /><div><div className="text-xs text-muted-foreground">WhatsApp</div><div className="font-semibold">{SITE.phone}</div></div>
          </a>
          <div className="flex items-center gap-3 rounded-xl bg-card border p-4">
            <MapPin className="h-5 w-5 text-primary" /><div><div className="text-xs text-muted-foreground">Address</div><div className="font-semibold">{SITE.address}</div></div>
          </div>
          <div className="rounded-2xl overflow-hidden border shadow-elevated aspect-video">
            <iframe src={SITE.mapEmbed} className="w-full h-full" loading="lazy" title="HealthCuree AI location" />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
