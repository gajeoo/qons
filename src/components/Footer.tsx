import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "AI Scheduling", href: "/features#ai-scheduling" },
    { label: "HOA Management", href: "/features#hoa-management" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  Resources: [
    { label: "Contact Us", href: "/contact" },
    { label: "Start Free Trial", href: "/contact" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold text-lg mb-4"
            >
              <div className="size-8 rounded-lg bg-navy flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              {APP_NAME}
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI-powered concierge and property operations platform. Scheduling,
              management, and analytics — all in one place.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-semibold text-sm mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QonsApp (Quantitative On-schedule
            Applications). All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="/contact"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/contact"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
