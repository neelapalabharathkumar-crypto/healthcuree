import logo from "@/assets/healthcuree-logo.jpeg";
import { Link } from "@tanstack/react-router";

export function Logo({ variant = "full" }: { variant?: "full" | "mark" }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group" aria-label="HealthCuree AI home">
      <img
        src={logo}
        alt="HealthCuree AI"
        className="h-10 w-10 rounded-xl object-cover shadow-soft group-hover:scale-105 transition-transform"
      />
      {variant === "full" && (
        <span className="flex flex-col leading-tight">
          <span className="font-bold text-base sm:text-lg">
            <span style={{ color: "oklch(0.47 0.19 255)" }}>Health</span>
            <span style={{ color: "oklch(0.55 0.18 150)" }}>Curee</span>
            <span className="text-primary"> AI</span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            AI-Powered Healthcare
          </span>
        </span>
      )}
    </Link>
  );
}
