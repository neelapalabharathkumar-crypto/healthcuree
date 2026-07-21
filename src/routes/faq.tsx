import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  component: Page,
  head: () => ({ meta: [{ title: "FAQ — HealthCuree AI" }, { name: "description", content: "Frequently asked questions about appointments, billing, records and more." }] }),
});
const faqs = [
  { q: "How do I book an appointment?", a: "Sign in, go to Book Appointment, pick a department, doctor, date and time." },
  { q: "Is the AI Health Assistant a replacement for a doctor?", a: "No. It provides guidance and triage; always confirm with a licensed physician." },
  { q: "How are my medical records stored?", a: "Encrypted and accessible only to you, your treating clinicians, and authorized admins." },
  { q: "Can I pay online?", a: "Yes — patients can pay bills online from the dashboard." },
  { q: "Do you offer emergency ambulance service?", a: "Yes, ICU-equipped ambulances are dispatched 24/7." },
  { q: "How can I get my prescription?", a: "After every visit your prescription is available for download from your dashboard." },
];
function Page() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="FAQ" title="Frequently Asked Questions" />
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="rounded-xl border px-4">
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </SiteLayout>
  );
}
