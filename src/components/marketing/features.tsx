import {
  FileText,
  Users,
  CreditCard,
  Receipt,
  CheckSquare,
  Sparkles,
  BarChart3,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: FileText,
    title: "Smart Invoicing",
    description:
      "Create, send, and track invoices in seconds. PDF export, partial payments, and automatic reminders.",
    color: "text-kazi-green",
    bg: "bg-kazi-green/10",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Keep all your clients organized with profiles, notes, and communication history in one CRM.",
    color: "text-kazi-blue",
    bg: "bg-kazi-blue/10",
  },
  {
    icon: CreditCard,
    title: "M-Pesa & Card Payments",
    description:
      "Accept payments via M-Pesa STK Push or Stripe cards. Track every transaction automatically.",
    color: "text-kazi-orange",
    bg: "bg-kazi-orange/10",
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    description:
      "Log business expenses, categorize spending, and generate simple tax-ready reports.",
    color: "text-kazi-green",
    bg: "bg-kazi-green/10",
  },
  {
    icon: CheckSquare,
    title: "Projects & Tasks",
    description:
      "Manage projects and to-dos alongside your finances. Stay on top of deliverables.",
    color: "text-kazi-blue",
    bg: "bg-kazi-blue/10",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description:
      "Generate invoice descriptions, follow-up emails, and social posts with AI powered by Grok/OpenAI.",
    color: "text-kazi-orange",
    bg: "bg-kazi-orange/10",
  },
  {
    icon: BarChart3,
    title: "Business Reports",
    description:
      "Revenue dashboards, tax summaries, and payment analytics to understand your business.",
    color: "text-kazi-green",
    bg: "bg-kazi-green/10",
  },
  {
    icon: Globe,
    title: "Multi-Currency Ready",
    description:
      "Start with KSh, expand globally. Built for Kenya today, designed for Africa tomorrow.",
    color: "text-kazi-blue",
    bg: "bg-kazi-blue/10",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Everything You Need to{" "}
            <span className="text-kazi-green">Get Paid</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Simple, powerful tools designed for how Kenyan freelancers and small
            businesses actually work.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-2`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
