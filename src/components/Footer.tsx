import { Link } from "react-router-dom";
import HustleLogo from "@/components/brand/HustleLogo";
import TaylorBadge from "@/components/brand/TaylorLogo";
import { SITE } from "@/config/site";

const links = [
  { label: "Browse", to: "/browse" },
  { label: "Become a Hustler", to: "/become-hustler" },
  { label: "Help", to: "/help" },
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
];

const Footer = () => (
  <footer className="border-t border-border mt-14">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
        <HustleLogo size="sm" />
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-3 md:items-end">
        <TaylorBadge href={SITE.taylor.url} />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Hustle · A{" "}
          <a href={SITE.companyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            {SITE.company}
          </a>{" "}
          product
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
