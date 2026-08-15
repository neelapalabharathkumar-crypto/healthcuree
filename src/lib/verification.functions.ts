import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Issues the unique 5-digit consultation code. Code generation runs server-side
 * only — the database helper is no longer callable from the browser.
 */
export const issueVerificationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { appointmentId: string; doctorId: string; paymentId?: string | null }) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(input?.appointmentId ?? "")) throw new Error("Invalid appointment");
    if (!uuid.test(input?.doctorId ?? "")) throw new Error("Invalid doctor");
    const paymentId = input.paymentId && uuid.test(input.paymentId) ? input.paymentId : null;
    return { appointmentId: input.appointmentId, doctorId: input.doctorId, paymentId };
  })
  .handler(async ({ data, context }) => {
    // The appointment must belong to the caller (RLS-scoped client).
    const { data: appt, error: apptErr } = await context.supabase
      .from("appointments")
      .select("id, patient_id")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (apptErr || !appt || appt.patient_id !== context.userId) throw new Error("Appointment not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: code, error: codeErr } = await supabaseAdmin.rpc("generate_verification_code");
    if (codeErr || !code) throw new Error("Could not generate a verification code");

    const { error: vcErr } = await supabaseAdmin.from("verification_codes").insert({
      code,
      patient_id: context.userId,
      appointment_id: data.appointmentId,
      doctor_id: data.doctorId,
      payment_id: data.paymentId,
      payment_status: "paid",
      reception_status: "pending",
      report_status: "pending",
    });
    if (vcErr) throw new Error("Could not save the verification code");

    return { code: code as string };
  });
