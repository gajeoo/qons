import { useConvexAuth } from "convex/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { Button } from "./ui/button";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo — never shrinks */}
          <Link
            to="/"
            className="flex items-center gap-2.5 font-bold text-lg hover:opacity-80 transition-opacity shrink-0"
          >
            <div className="size-8 rounded-lg bg-navy flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="hidden sm:inline">{APP_NAME}</span>
          </Link>

          {/* Desktop nav — centered with proper spacing */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  location.pathname === link.href
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth buttons — right side */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="w-20 h-8" />
            ) : isAuthenticated ? (
              <Button
                size="sm"
                className="bg-teal text-white hover:bg-teal-dark"
                asChild
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-teal text-white hover:bg-teal-dark"
                  asChild
                >
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile/tablet hamburger — visible below lg */}
          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t bg-background">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`block px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === link.href
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 px-3 space-y-2">
              {isAuthenticated ? (
                <Button
                  size="sm"
                  className="w-full bg-teal text-white hover:bg-teal-dark"
                  asChild
                >
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="w-full bg-teal text-white hover:bg-teal-dark"
                    asChild
                  >
                    <Link to="/signup" onClick={() => setMobileOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
