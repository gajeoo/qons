import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CheckoutSuccessPage() {
  const planName = "Premium";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32">
      <div className="max-w-lg text-center space-y-6">
        {/* Success animation */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-teal/20 rounded-full animate-ping" />
          <div className="relative size-20 rounded-full bg-teal/10 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-teal" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Welcome to QuonsApp!
          </h1>
          <p className="text-lg text-muted-foreground">
            Your{" "}
            <span className="font-semibold text-foreground">{planName}</span>{" "}
            subscription is now active. Let's get your operations set up.
          </p>
        </div>

        {/* What's next */}
        <div className="bg-card rounded-2xl border p-6 text-left space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-teal" />
            What's Next
          </h3>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Complete your profile",
                desc: "Tell us about your company and properties",
              },
              {
                step: "2",
                title: "Import your data",
                desc: "Add properties, staff, and schedules",
              },
              {
                step: "3",
                title: "Start automating",
                desc: "Let AI handle your scheduling",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 items-start">
                <div className="size-7 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-teal">
                    {item.step}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            size="lg"
            className="bg-teal text-white hover:bg-teal-dark"
            asChild
          >
            <Link to="/onboarding">
              Complete Setup
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
