import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/privacy")({
  component: Page,
  head: () => ({ meta: [{ title: "Privacy Policy — HealthCuree AI" }, { name: "description", content: "How HealthCuree AI collects, uses and protects your health data." }] }),
});
function Page() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Privacy Policy" />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 prose prose-slate prose-headings:font-semibold">
        <p>At HealthCuree AI ("we", "us"), we take your privacy seriously. This policy explains what personal and medical data we collect, how we use it, and the choices you have.</p>
        <h3>Information we collect</h3>
        <p>Name, contact details, date of birth, gender, medical history you share, appointment records, prescriptions, payments and reports uploaded by you or your treating clinician.</p>
        <h3>How we use your data</h3>
        <p>To deliver care, manage appointments and billing, communicate with you, improve our services, and comply with applicable healthcare regulations.</p>
        <h3>Sharing</h3>
        <p>Your health information is shared only with your treating clinicians and authorized administrative staff. We never sell your data.</p>
        <h3>Security</h3>
        <p>Data is encrypted in transit and at rest. Access is role-based and auditable. You may request export or deletion at any time by writing to us.</p>
        <h3>Contact</h3>
        <p>For privacy questions, email rameshmanepalli.in@gmail.com.</p>
      </article>
    </SiteLayout>
  );
}
