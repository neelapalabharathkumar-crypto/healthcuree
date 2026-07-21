import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/terms")({
  component: Page,
  head: () => ({ meta: [{ title: "Terms & Conditions — HealthCuree AI" }, { name: "description", content: "Terms governing your use of HealthCuree AI." }] }),
});
function Page() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Terms & Conditions" />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 prose prose-slate">
        <p>By using HealthCuree AI you agree to the following terms. The AI Health Assistant provides informational guidance only and is not a substitute for professional medical advice, diagnosis or treatment. Always seek a qualified physician for medical concerns.</p>
        <h3>Accounts</h3>
        <p>Keep your credentials confidential. You are responsible for activity under your account.</p>
        <h3>Payments</h3>
        <p>Bills issued through the platform are payable per invoice terms. Refunds are subject to hospital policy.</p>
        <h3>Content</h3>
        <p>All content on this platform is owned by HealthCuree AI or its licensors and is provided for personal, non-commercial use.</p>
        <h3>Liability</h3>
        <p>To the extent permitted by law, HealthCuree AI is not liable for indirect or consequential damages arising from platform use.</p>
        <h3>Contact</h3>
        <p>Questions? Email rameshmanepalli.in@gmail.com.</p>
      </article>
    </SiteLayout>
  );
}
