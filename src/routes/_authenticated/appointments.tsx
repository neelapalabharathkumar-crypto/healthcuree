import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/appointments")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["appointments-all"],
    queryFn: async () => (await supabase.from("appointments").select("*, doctors(full_name, specialization), departments(name)").order("appointment_date", { ascending: false })).data ?? [],
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments-all"] }); toast.success("Appointment cancelled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Appointments</h1>
        <p className="text-muted-foreground text-sm mt-1">All your bookings in one place.</p>
      </div>
      {data.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No appointments yet.</CardContent></Card>}
      <div className="grid gap-3">
        {data.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold">{a.doctors?.full_name}</div>
                <div className="text-xs text-muted-foreground">{a.doctors?.specialization} · {a.departments?.name}</div>
                <div className="text-sm mt-1">{a.appointment_date} · {a.appointment_time}</div>
                {a.reason && <div className="text-xs text-muted-foreground mt-1">"{a.reason}"</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                  a.status === "confirmed" ? "bg-accent/15 text-accent" :
                  a.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                  a.status === "completed" ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning-foreground"
                }`}>{a.status}</span>
                {a.status !== "cancelled" && a.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => cancel.mutate(a.id)}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
