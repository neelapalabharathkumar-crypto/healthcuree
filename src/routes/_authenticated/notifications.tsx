import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({ component: Page });
function Page() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifs-all"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notifications").update({ read: true }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifs-all"] }),
  });
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      {data.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto opacity-50" />
          <p className="mt-3 text-sm">You're all caught up.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((n: any) => (
            <Card key={n.id} className={n.read ? "opacity-60" : ""}>
              <CardContent className="p-5 flex justify-between items-start gap-3">
                <div><div className="font-semibold">{n.title}</div><div className="text-sm text-muted-foreground mt-1">{n.message}</div></div>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>Mark read</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
