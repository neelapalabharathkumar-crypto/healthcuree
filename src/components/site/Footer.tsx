import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-gradient-soft">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              {SITE.tagline} HealthCuree AI is an AI-powered healthcare platform helping
              hospitals manage appointments, patient records, doctors, billing, and medical
              reports through a secure and modern digital system.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <a href={`mailto:${SITE.email}`} className="flex items-center gap-2 text-foreground/80 hover:text-primary">
                <Mail className="h-4 w-4 text-primary" /> {SITE.email}
              </a>
              <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-foreground/80 hover:text-primary">
                <Phone className="h-4 w-4 text-primary" /> {SITE.phone}
              </a>
              <a
                href={`https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-foreground/80 hover:text-accent"
              >
                <MessageCircle className="h-4 w-4 text-accent" /> WhatsApp {SITE.phone}
              </a>
              <div className="flex items-center gap-2 text-foreground/80">
                <MapPin className="h-4 w-4 text-primary" /> {SITE.address}
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
              <li><Link to="/departments" className="hover:text-primary">Departments</Link></li>
              <li><Link to="/doctors" className="hover:text-primary">Doctors</Link></li>
              <li><Link to="/services" className="hover:text-primary">Services</Link></li>
              <li><Link to="/emergency" className="hover:text-primary">Emergency Care</Link></li>
              <li><Link to="/careers" className="hover:text-primary">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-primary">Contact Us</Link></li>
              <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary">Terms &amp; Conditions</Link></li>
              <li><Link to="/ai-assistant" className="hover:text-primary">AI Health Assistant</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>© 2026 HealthCuree AI. All Rights Reserved.</p>
          <p>Built with care for hospitals across India.</p>
        </div>
      </div>
    </footer>
  );
}
