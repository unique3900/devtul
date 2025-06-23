"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export function PricingSection() {
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
      ],
      limitations: ["Advanced security features", "Real-time monitoring", "Team collaboration", "Custom integrations"],
      cta: "Get Started",
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
      ],
      limitations: ["Advanced integrations", "Custom reporting"],
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
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  }

  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Badge className="mb-4" variant="secondary">
              Pricing
            </Badge>
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Choose the perfect plan for your needs</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include our core testing features.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 },
              }}
              className={`relative ${plan.popular ? "z-10" : ""}`}
            >
              <Card
                className={`relative h-full ${plan.popular ? "border-blue-500 shadow-xl scale-105" : "border-gray-200"}`}
              >
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600">
                      Most Popular
                    </Badge>
                  </motion.div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <motion.div
                    className="mt-4"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                  >
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </motion.div>
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
                        <motion.li
                          key={featureIndex}
                          className="flex items-start gap-2"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 * featureIndex }}
                        >
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </motion.li>
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
                          <motion.li
                            key={limitationIndex}
                            className="flex items-start gap-2"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 * limitationIndex }}
                          >
                            <X className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-500">{limitation}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link href={plan.name === "Enterprise" ? "/contact" : "/signup"} className="block">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                    </motion.div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-muted-foreground mb-4">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
          <Link href="/pricing-comparison" className="text-blue-600 hover:underline">
            View detailed feature comparison →
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
