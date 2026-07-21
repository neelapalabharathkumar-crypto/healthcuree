import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill, Download } from "lucide-react";
import jsPDF from "jspdf";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/prescriptions")({ component: Page });

function downloadRx(rx: any) {
  const doc = new jsPDF();
  doc.setFontSize(20); doc.setTextColor("#1e40af");
  doc.text("HealthCuree AI", 15, 20);
  doc.setFontSize(10); doc.setTextColor("#666");
  doc.text(SITE.tagline, 15, 26);
  doc.setDrawColor("#1e40af"); doc.line(15, 30, 195, 30);
  doc.setTextColor("#111"); doc.setFontSize(14);
  doc.text("Prescription", 15, 40);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date(rx.created_at).toLocaleDateString()}`, 15, 48);
  doc.text(`Diagnosis: ${rx.diagnosis || "-"}`, 15, 56);
  doc.setFontSize(12); doc.text("Medications:", 15, 68);
  let y = 76;
  const meds = Array.isArray(rx.medications) ? rx.medications : [];
  meds.forEach((m: any, i: number) => {
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${m.name || "-"}  |  ${m.dose || ""}  |  ${m.frequency || ""}`, 20, y);
    y += 8;
  });
  if (rx.instructions) { doc.setFontSize(12); doc.text("Instructions:", 15, y + 4); doc.setFontSize(10); doc.text(rx.instructions, 15, y + 12, { maxWidth: 180 }); }
  doc.setFontSize(9); doc.setTextColor("#666");
  doc.text(`${SITE.address}  ·  ${SITE.phone}  ·  ${SITE.email}`, 15, 285);
  doc.save(`prescription-${rx.id.slice(0, 8)}.pdf`);
}

function Page() {
  const { data = [] } = useQuery({
    queryKey: ["rx"],
    queryFn: async () => (await supabase.from("prescriptions").select("*, doctors(full_name, specialization)").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Prescriptions</h1>
      {data.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Pill className="h-10 w-10 mx-auto opacity-50" />
          <p className="mt-3 text-sm">No prescriptions yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((r: any) => (
            <Card key={r.id}><CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-semibold">{r.doctors?.full_name} · {r.doctors?.specialization}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                  {r.diagnosis && <div className="mt-2 text-sm"><b>Dx:</b> {r.diagnosis}</div>}
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadRx(r)}><Download className="h-4 w-4" /> PDF</Button>
              </div>
              {Array.isArray(r.medications) && r.medications.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {r.medications.map((m: any, i: number) => (
                    <li key={i} className="flex gap-2"><Pill className="h-4 w-4 text-primary mt-0.5" /> <span><b>{m.name}</b> — {m.dose} · {m.frequency}</span></li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
