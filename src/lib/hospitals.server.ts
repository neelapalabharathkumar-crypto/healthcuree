import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type HospitalInput = {
  name: string;
  type: string;
  description?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  website?: string;
  emergency_contact?: string;
  emergency_available: boolean;
  ambulance_available: boolean;
  beds?: number;
  working_hours?: string;
  address?: string;
  area?: string;
  city: string;
  state: string;
  pin_code?: string;
  latitude?: number;
  longitude?: number;
};

export type DepartmentInput = {
  name: string;
  description?: string;
  consultation_fee?: number;
  available_days?: string[];
  available_time_start?: string;
  available_time_end?: string;
  emergency_available?: boolean;
};

export type DoctorInput = {
  full_name: string;
  specialization: string;
  department_name?: string;
  qualifications?: string;
  experience_years?: number;
  consultation_fee?: number;
  gender?: string;
  phone?: string;
  email?: string;
  password?: string;
  registration_number?: string;
  available_days?: string[];
  available_time_start?: string;
  available_time_end?: string;
};

export type StaffInput = {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  staff_type?: "receptionist" | "hospital_admin";
};

export async function assertPlatformAdmin(supabase: SupabaseClient<any, any, any>, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);
  if (!data || data.length === 0) throw new Error("Forbidden: platform admin access required");
}

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function nextHospitalCode() {
  const { data } = await supabaseAdmin
    .from("hospitals")
    .select("code")
    .order("code", { ascending: false })
    .limit(1)
    .maybeSingle();
  const n = data?.code ? parseInt(String(data.code).replace(/\D/g, ""), 10) || 0 : 0;
  return `H${String(n + 1).padStart(3, "0")}`;
}

async function findUserByEmail(email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureAccount(email: string, password: string, fullName: string, phone?: string) {
  let userId = await findUserByEmail(email);
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (error || !data.user) throw new Error(error?.message ?? `Could not create account for ${email}`);
    userId = data.user.id;
  } else if (password) {
    await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  }
  await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: fullName, phone: phone ?? null }, { onConflict: "id" });
  return userId;
}

async function setRole(userId: string, role: string) {
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role } as never);
  if (error) throw new Error(error.message);
}

export async function createHospitalWithSetup(payload: {
  hospital: HospitalInput;
  departments: DepartmentInput[];
  doctors: DoctorInput[];
  staff: StaffInput[];
}) {
  const code = await nextHospitalCode();
  const baseSlug = slugify(payload.hospital.name) || code.toLowerCase();
  const slug = `${baseSlug}-${code.toLowerCase()}`;

  const { data: hospital, error: hErr } = await supabaseAdmin
    .from("hospitals")
    .insert({ ...payload.hospital, code, slug, status: "active", country: "India" } as never)
    .select("id, code, name")
    .single();
  if (hErr || !hospital) throw new Error(hErr?.message ?? "Could not create hospital");

  const hospitalId = (hospital as { id: string }).id;
  const deptIdByName = new Map<string, string>();

  for (const d of payload.departments) {
    const { data: dept, error } = await supabaseAdmin
      .from("departments")
      .insert({
        hospital_id: hospitalId,
        name: d.name,
        slug: `${slugify(d.name)}-${code.toLowerCase()}`,
        description: d.description ?? null,
        consultation_fee: d.consultation_fee ?? null,
        available_days: d.available_days ?? null,
        available_time_start: d.available_time_start ?? null,
        available_time_end: d.available_time_end ?? null,
        emergency_available: d.emergency_available ?? false,
        is_active: true,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(`Department "${d.name}": ${error.message}`);
    deptIdByName.set(d.name, (dept as { id: string }).id);
  }

  const accounts: { role: string; name: string; email: string }[] = [];

  let docIndex = 0;
  for (const doc of payload.doctors) {
    docIndex += 1;
    const doctorCode = `${code}-D${String(docIndex).padStart(3, "0")}`;
    let userId: string | null = null;
    if (doc.email && doc.password) {
      userId = await ensureAccount(doc.email, doc.password, doc.full_name, doc.phone);
      await setRole(userId, "doctor");
      await supabaseAdmin.from("hospital_staff").upsert(
        {
          user_id: userId,
          hospital_id: hospitalId,
          staff_type: "doctor",
          staff_code: doctorCode,
          full_name: doc.full_name,
          phone: doc.phone ?? null,
          email: doc.email,
          status: "active",
        } as never,
        { onConflict: "user_id" },
      );
      accounts.push({ role: "Doctor", name: doc.full_name, email: doc.email });
    }
    const { error } = await supabaseAdmin.from("doctors").insert({
      hospital_id: hospitalId,
      user_id: userId,
      department_id: doc.department_name ? deptIdByName.get(doc.department_name) ?? null : null,
      doctor_code: doctorCode,
      full_name: doc.full_name,
      specialization: doc.specialization,
      qualifications: doc.qualifications ?? null,
      experience_years: doc.experience_years ?? null,
      consultation_fee: doc.consultation_fee ?? null,
      gender: doc.gender ?? null,
      phone: doc.phone ?? null,
      email: doc.email ?? null,
      registration_number: doc.registration_number ?? null,
      available_days: doc.available_days ?? null,
      available_time_start: doc.available_time_start ?? null,
      available_time_end: doc.available_time_end ?? null,
      is_active: true,
    } as never);
    if (error) throw new Error(`Doctor "${doc.full_name}": ${error.message}`);
  }

  let staffIndex = 0;
  for (const s of payload.staff) {
    staffIndex += 1;
    const type = s.staff_type ?? "receptionist";
    const staffCode = `${code}-${type === "hospital_admin" ? "A" : "R"}${String(staffIndex).padStart(3, "0")}`;
    const userId = await ensureAccount(s.email, s.password, s.full_name, s.phone);
    await setRole(userId, type === "hospital_admin" ? "hospital_admin" : "receptionist");
    const { error } = await supabaseAdmin.from("hospital_staff").upsert(
      {
        user_id: userId,
        hospital_id: hospitalId,
        staff_type: type,
        staff_code: staffCode,
        full_name: s.full_name,
        phone: s.phone ?? null,
        email: s.email,
        status: "active",
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error(`Staff "${s.full_name}": ${error.message}`);
    accounts.push({ role: type === "hospital_admin" ? "Hospital admin" : "Reception", name: s.full_name, email: s.email });
  }

  return { hospitalId, code, accounts };
}
