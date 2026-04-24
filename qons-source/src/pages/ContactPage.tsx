import { useMutation } from "convex/react";
import {
  ArrowRight,
  Building2,
  Calendar,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";

export function ContactPage() {
  const submitLead = useMutation(api.leads.submit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    properties: "",
    message: "",
    type: "general" as
      | "general"
      | "trial"
      | "question"
      | "partnership"
      | "pricing"
      | "support",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Please fill in your name and email.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLead({
        name: formData.name,
        email: formData.email,
        company: formData.company || undefined,
        properties: formData.properties || undefined,
        message: formData.message || undefined,
        inquiryType: formData.type,
      });
      setSubmitted(true);
      toast.success("Thank you! We'll be in touch within 24 hours.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32">
        <div className="max-w-md text-center space-y-4">
          <div className="size-16 mx-auto rounded-full bg-teal/10 flex items-center justify-center mb-6">
            <Send className="size-7 text-teal" />
          </div>
          <h1 className="text-3xl font-bold">Thank You!</h1>
          <p className="text-muted-foreground">
            We've received your message and will get back to you within 24
            hours. Most responses come within a few hours.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSubmitted(false);
              setFormData({
                name: "",
                email: "",
                company: "",
                properties: "",
                message: "",
                type: "general",
              });
            }}
          >
            Send Another Message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal/5 rounded-full blur-3xl" />
        </div>
        <div className="container text-center">
          <p className="text-sm font-medium text-teal mb-3 tracking-wide uppercase">
            Get Started
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Let's Talk
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start your free trial, ask a question, or get in touch. We'd love to
            hear from you.
          </p>
        </div>
      </section>

      {/* Form + Contact Info */}
      <section className="pb-20 md:pb-28">
        <div className="container">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-16">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-card rounded-2xl border p-6 md:p-8">
                <h2 className="text-xl font-bold mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Type selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      I'm interested in:
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "general", label: "General Inquiry" },
                        { value: "trial", label: "Free Trial Question" },

                        { value: "question", label: "Ask a Question" },
                        { value: "partnership", label: "Partnership" },
                      ].map(option => (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              type: option.value as typeof formData.type,
                            }))
                          }
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            formData.type === option.value
                              ? "border-teal bg-teal/5 text-teal"
                              : "hover:border-foreground/20"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ernest Owusu"
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="ernest@company.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company" className="text-sm font-medium">
                        Company
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        placeholder="Your company name"
                        value={formData.company}
                        onChange={handleChange}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="properties"
                        className="text-sm font-medium"
                      >
                        Number of Properties
                      </Label>
                      <select
                        id="properties"
                        name="properties"
                        value={formData.properties}
                        onChange={handleChange}
                        className="mt-1.5 w-full h-9 rounded-md border bg-transparent px-3 text-sm"
                      >
                        <option value="">Select range</option>
                        <option value="1-10">1-10 properties</option>
                        <option value="11-50">11-50 properties</option>
                        <option value="51-150">51-150 properties</option>
                        <option value="151-500">151-500 properties</option>
                        <option value="500+">500+ properties</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-medium">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us about your operations and what you're looking for..."
                      value={formData.message}
                      onChange={handleChange}
                      className="mt-1.5 min-h-[120px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-teal text-white hover:bg-teal-dark"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                    {!isSubmitting && <ArrowRight className="size-4" />}
                  </Button>
                </form>
              </div>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-6">
                  Other Ways to Reach Us
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      icon: Mail,
                      title: "Email",
                      value: "hello@qonsapp.com",
                      description: "We respond within 24 hours",
                    },
                    {
                      icon: Calendar,
                      title: "Start Your Free Trial",
                      value: "Book a 30-minute call",
                      description: "See QonsApp live with your use case",
                    },
                    {
                      icon: MessageSquare,
                      title: "Live Chat",
                      value: "Available during business hours",
                      description: "Mon–Fri, 9 AM – 6 PM ET",
                    },
                  ].map(item => (
                    <div
                      key={item.title}
                      className="flex gap-4 p-4 rounded-xl border bg-card"
                    >
                      <div className="size-10 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                        <item.icon className="size-5 text-teal" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-sm text-foreground">{item.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick info */}
              <div className="bg-gradient-to-br from-teal/5 to-navy/5 rounded-2xl border p-6">
                <h3 className="font-semibold mb-3">Why Talk to Us?</h3>
                <div className="space-y-2.5">
                  {[
                    "Free personalized onboarding",
                    "See QonsApp configured for your properties",
                    "Get a custom migration plan",
                    "Ask anything — no sales pressure",
                  ].map(item => (
                    <div
                      key={item}
                      className="flex gap-2.5 items-start text-sm"
                    >
                      <Building2 className="size-4 text-teal mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
