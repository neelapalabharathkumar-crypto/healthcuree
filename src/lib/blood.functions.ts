import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BLOOD_GROUPS, INDIAN_STATES } from "./blood";

export type DonorMatch = {
  id: string;
  full_name: string;
  phone: string;
  blood_group: string;
  city: string;
  state: string;
  last_donation_date: string | null;
};

type SearchInput = { state?: string | null; city?: string | null; bloodGroup?: string | null };

/**
 * Donor search for signed-in users. Contact details are never exposed through
 * open table reads: this runs server-side, requires authentication and always
 * applies a narrow filter with a hard result cap.
 */
export const searchBloodDonors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SearchInput) => {
    const state = input?.state && INDIAN_STATES.includes(input.state as (typeof INDIAN_STATES)[number]) ? input.state : null;
    const bloodGroup =
      input?.bloodGroup && BLOOD_GROUPS.includes(input.bloodGroup as (typeof BLOOD_GROUPS)[number])
        ? input.bloodGroup
        : null;
    const city = typeof input?.city === "string" ? input.city.trim().slice(0, 80) : "";
    if (!state && !bloodGroup && city.length < 2) {
      throw new Error("Choose a state, a blood group, or type at least 2 letters of a city.");
    }
    return { state, bloodGroup, city };
  })
  .handler(async ({ data }): Promise<DonorMatch[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("blood_donors")
      .select("id, full_name, phone, blood_group, city, state, last_donation_date")
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(60);

    if (data.state) query = query.eq("state", data.state);
    if (data.bloodGroup) query = query.eq("blood_group", data.bloodGroup);
    if (data.city) query = query.ilike("city", `%${data.city}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error("Could not search donors right now.");
    return (rows ?? []) as DonorMatch[];
  });
