import { MessageCircle, Phone } from "lucide-react";
import { SITE } from "@/lib/site";

export function FloatingActions() {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      <a
        href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
          "Hello HealthCuree AI, I would like to book an appointment.",
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.62_0.18_150)] text-white shadow-elevated hover:scale-110 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
      <a
        href={`tel:${SITE.phone.replace(/\s/g, "")}`}
        aria-label="Call now"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elevated hover:scale-110 transition-transform"
      >
        <Phone className="h-6 w-6" />
      </a>
    </div>
  );
}
