import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DepartmentInput, DoctorInput, HospitalInput, StaffInput } from "./hospitals.server";

export const createHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospital: HospitalInput;
      departments: DepartmentInput[];
      doctors: DoctorInput[];
      staff: StaffInput[];
    }) => {
      if (!input.hospital?.name?.trim()) throw new Error("Hospital name is required");
      if (!input.hospital?.city?.trim() || !input.hospital?.state?.trim())
        throw new Error("City and state are required");
      for (const s of input.staff ?? []) {
        if (!s.email?.trim() || (s.password ?? "").length < 8)
          throw new Error("Every staff member needs an email and an 8+ character password");
      }
      for (const d of input.doctors ?? []) {
        if (d.email && (d.password ?? "").length < 8)
          throw new Error("Doctor logins need an 8+ character password");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertPlatformAdmin, createHospitalWithSetup } = await import("./hospitals.server");
    await assertPlatformAdmin(context.supabase, context.userId);
    return createHospitalWithSetup(data);
  });
