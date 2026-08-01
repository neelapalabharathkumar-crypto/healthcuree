export const SITE = {
  name: "HealthCuree AI",
  tagline: "Smart Healthcare. Powered by AI.",
  email: "rameshmanepalli.in@gmail.com",
  phone: "+91 7095497422",
  whatsapp: "+917095497422",
  address: "Kakinada, Andhra Pradesh, India",
  mapEmbed:
    "https://www.google.com/maps?q=Kakinada%2C+Andhra+Pradesh%2C+India&output=embed",
} as const;

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/departments", label: "Departments" },
  { to: "/doctors", label: "Doctors" },
  { to: "/services", label: "Services" },
  { to: "/blog", label: "Blog" },
  { to: "/blood-bank", label: "Blood Bank" },
  { to: "/contact", label: "Contact" },
] as const;
