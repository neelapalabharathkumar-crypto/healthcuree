import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "patient" | "doctor" | "receptionist" | "admin";

export async function assertAdmin(supabase: SupabaseClient<any, any, any>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin access required");
}

export async function listAuthUsers() {
  const users: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      })),
    );
    if (data.users.length < 200) break;
  }
  return users;
}

export async function deleteAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

export async function updateAuthUser(userId: string, patch: { email?: string; password?: string }) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, patch);
  if (error) throw new Error(error.message);
}

export async function setUserRole(userId: string, role: AppRole) {
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
}

/** Creates a staff account (or reuses it if the email already exists) and assigns the role. */
export async function ensureStaffAccount(opts: {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
}) {
  const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = existingList?.users.find(
    (u) => (u.email ?? "").toLowerCase() === opts.email.toLowerCase(),
  );

  let userId = existing?.id;
  let created = false;
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
      user_metadata: { full_name: opts.fullName },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create account");
    userId = data.user.id;
    created = true;
  }

  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, full_name: opts.fullName }, { onConflict: "id" });
  await setUserRole(userId, opts.role);

  if (opts.role === "doctor") {
    const { data: doc } = await supabaseAdmin
      .from("doctors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!doc) {
      const { data: free } = await supabaseAdmin
        .from("doctors")
        .select("id")
        .is("user_id", null)
        .limit(1)
        .maybeSingle();
      if (free) {
        await supabaseAdmin.from("doctors").update({ user_id: userId }).eq("id", free.id);
      } else {
        await supabaseAdmin.from("doctors").insert({
          user_id: userId,
          full_name: opts.fullName,
          specialization: "General Physician",
        });
      }
    }
  }

  return { userId, created };
}
