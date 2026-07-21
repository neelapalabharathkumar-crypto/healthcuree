import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bills")({ component: Page });
function Page() {
  const { data = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: async () => (await supabase.from("payments").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Bills & Payments</h1>
      {data.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <CreditCard className="h-10 w-10 mx-auto opacity-50" />
          <p className="mt-3 text-sm">No bills yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((p: any) => (
            <Card key={p.id}><CardContent className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{p.description || "Consultation"}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()} · {p.method || "—"}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">₹{p.amount}</div>
                <div className="text-xs capitalize text-muted-foreground">{p.status}</div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
