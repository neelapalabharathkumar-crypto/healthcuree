import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveReportUrl } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, Download, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/records")({ component: Page });

function Page() {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<any[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["records"],
    queryFn: async () =>
      (await supabase.from("medical_reports").select("*, doctors(full_name)").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ["records-rx"],
    queryFn: async () => (await supabase.from("prescriptions").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function download(fileUrl: string | null) {
    const url = await resolveReportUrl(fileUrl);
    if (!url) return toast.error("Report file is not available");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLookup(null);
    setLookupError(null);
    if (!/^\d{5}$/.test(code)) return setLookupError("Invalid Verification Code");
    const { data: user } = await supabase.auth.getUser();
    const { data: vc } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!vc || vc.patient_id !== user.user?.id) return setLookupError("Invalid Verification Code");
    const { data: reports } = await supabase
      .from("medical_reports")
      .select("*, doctors(full_name)")
      .eq("verification_code", code)
      .order("created_at", { ascending: false });
    if (!reports || reports.length === 0) return setLookupError("Report Not Available Yet");
    setLookup(reports);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Medical Records</h1>

      <Card><CardContent className="p-6">
        <form onSubmit={search} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-50">
            <Label htmlFor="rc">Look up a visit with your 5-digit verification code</Label>
            <Input id="rc" inputMode="numeric" maxLength={5} className="mt-1.5 tracking-widest"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="48371" />
          </div>
          <Button type="submit" className="bg-gradient-primary text-primary-foreground"><Search className="h-4 w-4" /> Search</Button>
        </form>
        {lookupError && <p className="mt-3 text-sm text-destructive">{lookupError}</p>}
        {lookup && (
          <div className="mt-4 space-y-3">
            {lookup.map((r: any) => {
              const rx = prescriptions.find((p: any) => p.verification_code === code);
              return (
                <div key={r.id} className="rounded-xl border p-4 space-y-1 text-sm">
                  <div><b>Doctor:</b> {r.doctors?.full_name ?? "—"}</div>
                  <div><b>Hospital:</b> HealthCuree AI</div>
                  <div><b>Diagnosis:</b> {rx?.diagnosis ?? r.title}</div>
                  <div><b>Prescription:</b> {(rx?.medications as any[] | undefined)?.map((m: any) => m.name).join(", ") || "—"}</div>
                  <div><b>Notes:</b> {r.notes || "—"}</div>
                  <div><b>Date:</b> {new Date(r.created_at).toLocaleDateString()}</div>
                  {r.file_url ? (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => download(r.file_url)}>
                      <Download className="h-4 w-4" /> Download report
                    </Button>
                  ) : (
                    <p className="text-muted-foreground">Report Not Available Yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      {data.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto opacity-50" />
          <p className="mt-3 text-sm">No reports yet. Your doctor will upload reports here after your visit.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((r: any) => (
            <Card key={r.id}><CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.report_type} · {r.doctors?.full_name ?? "Doctor"} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {r.file_url && (
                <Button size="sm" variant="outline" onClick={() => download(r.file_url)}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              )}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
