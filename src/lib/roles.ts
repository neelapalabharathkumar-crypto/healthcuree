import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "patient" | "doctor" | "receptionist" | "admin";

export async function fetchRoles(): Promise<AppRole[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  return (data ?? []).map((r) => r.role as AppRole);
}

export function useRoles() {
  const { data: roles = [], isLoading } = useQuery({ queryKey: ["my-roles"], queryFn: fetchRoles });
  return {
    roles,
    isLoading,
    has: (r: AppRole) => roles.includes(r),
    isStaff: roles.some((r) => r !== "patient"),
  };
}

export function homeForRoles(roles: AppRole[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("receptionist")) return "/reception";
  if (roles.includes("doctor")) return "/doctor-panel";
  return "/dashboard";
}

/** Resolves a stored medical report location to a downloadable URL. */
export async function resolveReportUrl(fileUrl: string | null): Promise<string | null> {
  if (!fileUrl) return null;
  if (/^https?:\/\//.test(fileUrl)) return fileUrl;
  const { data } = await supabase.storage.from("medical-reports").createSignedUrl(fileUrl, 60 * 30);
  return data?.signedUrl ?? null;
}
