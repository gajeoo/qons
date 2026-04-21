import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

const USE_CASE_OPTIONS = [
  { id: "scheduling", label: "AI Staff Scheduling", icon: "🗓️" },
  { id: "multi-property", label: "Multi-Property Management", icon: "🏢" },
  { id: "analytics", label: "Executive Analytics", icon: "📊" },
  { id: "payroll", label: "Payroll Export", icon: "💰" },
  { id: "mobile", label: "Mobile GPS Clock-in", icon: "📱" },
  { id: "amenity", label: "Amenity Booking", icon: "🏊" },
  { id: "hoa", label: "HOA Management", icon: "🏠" },
  { id: "coverage", label: "Instant Coverage", icon: "⚡" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const onboarding = useQuery(api.onboarding.getMine);
  const save = useMutation(api.onboarding.save);
  const complete = useMutation(api.onboarding.complete);

  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [numberOfProperties, setNumberOfProperties] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill from existing data
  useEffect(() => {
    if (onboarding) {
      if (onboarding.companyName) setCompanyName(onboarding.companyName);
      if (onboarding.numberOfProperties)
        setNumberOfProperties(onboarding.numberOfProperties);
      if (onboarding.teamSize) setTeamSize(onboarding.teamSize);
      if (onboarding.useCases) setUseCases(onboarding.useCases);
      if (onboarding.completed) {
        navigate("/dashboard");
      }
    }
  }, [onboarding, navigate]);

  const steps = [
    {
      title: "Tell Us About Your Company",
      subtitle: "We'll customize QonsApp for your operation",
      icon: Building2,
    },
    {
      title: "Your Team & Properties",
      subtitle: "Help us set up the right capacity",
      icon: Users,
    },
    {
      title: "What Would You Like to Use?",
      subtitle: "Select the features most important to you",
      icon: Sparkles,
    },
  ];

  const toggleUseCase = (id: string) => {
    setUseCases((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleNext = async () => {
    if (step === 0 && !companyName) {
      toast.error("Please enter your company name");
      return;
    }

    // Save progress
    try {
      await save({
        companyName: companyName || undefined,
        numberOfProperties: numberOfProperties || undefined,
        teamSize: teamSize || undefined,
        useCases: useCases.length > 0 ? useCases : undefined,
      });
    } catch {
      // Don't block navigation for save errors
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await complete({
        companyName: companyName || undefined,
        numberOfProperties: numberOfProperties || undefined,
        teamSize: teamSize || undefined,
        useCases: useCases.length > 0 ? useCases : undefined,
      });
      toast.success("Setup complete! Welcome to QonsApp.");
      navigate("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-2xl py-12 md:py-20">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-12">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-teal" : "bg-border"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Step Header */}
        <div className="text-center mb-10">
          <div className="size-14 rounded-2xl bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <currentStep.icon className="size-7 text-teal" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            {currentStep.title}
          </h1>
          <p className="text-muted-foreground">{currentStep.subtitle}</p>
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-2xl border p-6 md:p-8 mb-8">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label
                  htmlFor="companyName"
                  className="text-sm font-medium mb-1.5 block"
                >
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Metro Concierge Services"
                  className="h-11"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Number of Properties
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    "1-10",
                    "11-25",
                    "26-50",
                    "51-150",
                    "151-500",
                    "500+",
                  ].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setNumberOfProperties(range)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        numberOfProperties === range
                          ? "border-teal bg-teal/5 text-teal"
                          : "hover:border-foreground/20"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Team Size
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    "1-5",
                    "6-15",
                    "16-50",
                    "51-100",
                    "101-500",
                    "500+",
                  ].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTeamSize(range)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        teamSize === range
                          ? "border-teal bg-teal/5 text-teal"
                          : "hover:border-foreground/20"
                      }`}
                    >
                      {range} people
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              {USE_CASE_OPTIONS.map((uc) => (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => toggleUseCase(uc.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                    useCases.includes(uc.id)
                      ? "border-teal bg-teal/5"
                      : "hover:border-foreground/20"
                  }`}
                >
                  <span className="text-xl">{uc.icon}</span>
                  <span className="text-sm font-medium">{uc.label}</span>
                  {useCases.includes(uc.id) && (
                    <CheckCircle2 className="size-4 text-teal ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {step < steps.length - 1 ? (
            <Button
              className="bg-teal text-white hover:bg-teal-dark"
              onClick={handleNext}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              className="bg-teal text-white hover:bg-teal-dark"
              onClick={handleComplete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Finishing..." : "Complete Setup"}
              <CheckCircle2 className="size-4" />
            </Button>
          )}
        </div>

        {/* Skip */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now — I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
}
