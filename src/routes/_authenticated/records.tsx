import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/records")({ component: Page });
function Page() {
  const { data = [] } = useQuery({
    queryKey: ["records"],
    queryFn: async () => (await supabase.from("medical_reports").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Medical Records</h1>
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
                  <div className="text-xs text-muted-foreground">{r.report_type} · {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              {r.file_url && <Button asChild size="sm" variant="outline"><a href={r.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /> Download</a></Button>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
