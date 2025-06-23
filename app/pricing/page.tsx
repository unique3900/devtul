"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      period: "forever",
      description: "Perfect for individual developers and small projects",
      features: [
        "Up to 3 projects",
        "Basic SEO analysis",
        "Weekly security scans",
        "Email support",
        "Basic accessibility checks",
        "Performance monitoring",
        "Basic reporting",
      ],
      limitations: [
        "Advanced security features",
        "Real-time monitoring",
        "Team collaboration",
        "Custom integrations",
        "Priority support",
        "Advanced analytics",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Professional",
      price: "$29",
      period: "per month",
      description: "Ideal for growing teams and multiple projects",
      features: [
        "Up to 25 projects",
        "Advanced SEO optimization",
        "Daily security scans",
        "Real-time monitoring",
        "Full WCAG compliance testing",
        "Performance monitoring",
        "Priority support",
        "Team collaboration (up to 5 members)",
        "Advanced reporting",
        "API access",
        "Custom workflows",
      ],
      limitations: ["Advanced integrations", "White-label reporting", "Dedicated account manager"],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "For large organizations with advanced needs",
      features: [
        "Unlimited projects",
        "AI-powered testing suite",
        "Continuous security monitoring",
        "Advanced performance analytics",
        "Custom integrations",
        "White-label reporting",
        "Dedicated account manager",
        "Unlimited team members",
        "SLA guarantee",
        "Custom workflows",
        "SSO integration",
        "Advanced API access",
        "Custom training",
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
    },
  ]

  const features = [
    {
      category: "Core Features",
      items: [
        { name: "SEO Analysis", starter: "Basic", professional: "Advanced", enterprise: "AI-Powered" },
        { name: "Security Scans", starter: "Weekly", professional: "Daily", enterprise: "Continuous" },
        { name: "Performance Monitoring", starter: "✓", professional: "✓", enterprise: "Advanced" },
        { name: "Accessibility Testing", starter: "Basic", professional: "WCAG Full", enterprise: "Custom Rules" },
        { name: "Projects", starter: "3", professional: "25", enterprise: "Unlimited" },
      ],
    },
    {
      category: "Team & Collaboration",
      items: [
        { name: "Team Members", starter: "1", professional: "5", enterprise: "Unlimited" },
        { name: "Real-time Collaboration", starter: "✗", professional: "✓", enterprise: "✓" },
        { name: "Role-based Access", starter: "✗", professional: "✓", enterprise: "Advanced" },
        { name: "SSO Integration", starter: "✗", professional: "✗", enterprise: "✓" },
      ],
    },
    {
      category: "Reporting & Analytics",
      items: [
        { name: "Basic Reports", starter: "✓", professional: "✓", enterprise: "✓" },
        { name: "Advanced Analytics", starter: "✗", professional: "✓", enterprise: "✓" },
        { name: "White-label Reports", starter: "✗", professional: "✗", enterprise: "✓" },
        { name: "Custom Dashboards", starter: "✗", professional: "Limited", enterprise: "Unlimited" },
      ],
    },
    {
      category: "Support & Services",
      items: [
        { name: "Email Support", starter: "✓", professional: "Priority", enterprise: "24/7 Dedicated" },
        { name: "Account Manager", starter: "✗", professional: "✗", enterprise: "✓" },
        { name: "Custom Training", starter: "✗", professional: "✗", enterprise: "✓" },
        { name: "SLA Guarantee", starter: "✗", professional: "✗", enterprise: "99.9%" },
      ],
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="inline-flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Devtul
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-12">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4" variant="secondary">
            Pricing Plans
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">Choose the perfect plan for your needs</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Start free and scale as you grow. All plans include our core testing features with 14-day free trial.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-1" />
              No credit card required
            </span>
            <span className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-1" />
              Cancel anytime
            </span>
            <span className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-1" />
              14-day free trial
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
              className={`relative ${plan.popular ? "z-10" : ""}`}
            >
              <Card
                className={`relative h-full ${
                  plan.popular ? "border-blue-500 shadow-2xl scale-105" : "border-gray-200 shadow-lg"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <CardDescription className="mt-4">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-700 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      What's included:
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.limitations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-500 flex items-center gap-2">
                        <X className="h-4 w-4" />
                        Not included:
                      </h4>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, limitationIndex) => (
                          <li key={limitationIndex} className="flex items-start gap-2">
                            <X className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-500">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link href={plan.name === "Enterprise" ? "/contact" : "/signup"} className="block">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Comparison Table */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Detailed Feature Comparison</h2>
            <p className="text-muted-foreground">Compare all features across our plans</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {features.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border-b border-gray-200 last:border-b-0">
                <div className="bg-gray-50 px-6 py-4">
                  <h3 className="font-semibold text-lg">{category.category}</h3>
                </div>
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-center">
                      {item.starter === "✓" ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : item.starter === "✗" ? (
                        <X className="h-5 w-5 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-sm">{item.starter}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {item.professional === "✓" ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : item.professional === "✗" ? (
                        <X className="h-5 w-5 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-sm">{item.professional}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {item.enterprise === "✓" ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : item.enterprise === "✗" ? (
                        <X className="h-5 w-5 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-sm">{item.enterprise}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground mb-8">Have questions? We're here to help.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  All paid plans include a 14-day free trial. No credit card required to start.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Yes, we offer a 30-day money-back guarantee for all paid plans.</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
