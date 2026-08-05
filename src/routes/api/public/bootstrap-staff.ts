import { createFileRoute } from "@tanstack/react-router";
import { ensureStaffAccount } from "@/lib/admin.server";

/**
 * One-time, idempotent provisioning of the fixed staff accounts.
 * It only ever creates the three well-known hospital logins and returns no
 * user data; if they already exist it simply re-asserts their roles.
 */
export const Route = createFileRoute("/api/public/bootstrap-staff")({
  server: {
    handlers: {
      POST: async () => {
        const accounts = [
          { email: "Healthadmin@healthcuree.ai", password: "Admin@12345", fullName: "Hospital Administrator", role: "admin" as const },
          { email: "Healthdoctor@healthcuree.ai", password: "Doctor@12345", fullName: "Dr. HealthCuree", role: "doctor" as const },
          { email: "Healthreceptionist@healthcuree.ai", password: "Reception@12345", fullName: "Front Desk", role: "receptionist" as const },
        ];
        const result: Record<string, string> = {};
        for (const a of accounts) {
          const r = await ensureStaffAccount(a);
          result[a.role] = r.created ? "created" : "already existed";
        }
        return Response.json(result);
      },
    },
  },
});
