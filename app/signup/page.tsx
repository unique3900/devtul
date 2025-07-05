"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Eye,
  EyeOff,
  Check,
  Upload,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  User,
  Briefcase,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createOrganization } from "../actions/organization"
import { toast } from "sonner"
import { OrganizationSize, OrganizationType } from "@prisma/client"

interface FormData {
  // Step 1 - Organization Basic Info
  organizationName: string
  logo: File | null
  logoDataUrl: string | null
  website: string

  // Step 2 - Organization Type
  organizationType: string

  // Step 3 - Organization Size
  organizationSize: string

  // Step 4 - User Details
  firstName: string
  lastName: string
  email: string
  password: string
  acceptTerms: boolean
}

const STORAGE_KEY = "devtul_signup_form"
const STORAGE_EXPIRY = 10 * 60 * 1000 // 10 minutes

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>({
    organizationName: "",
    logo: null,
    logoDataUrl: null,
    website: "",
    organizationType: "",
    organizationSize: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    acceptTerms: false,
  })

  const organizationTypes = [
    { value: "company", label: "Company", icon: "🏢", description: "Private business" },
    { value: "agency", label: "Agency", icon: "🎯", description: "Service provider" },
    { value: "government", label: "Government", icon: "🏛️", description: "Public sector" },
    { value: "education", label: "Education", icon: "🎓", description: "School or university" },
    { value: "nonprofit", label: "Nonprofit", icon: "❤️", description: "Non-profit org" },
    { value: "other", label: "Other", icon: "📋", description: "Something else" },
  ]

  const organizationSizes = [
    { value: "Small", label: "1-10", description: "Small team", icon: "👤" },
    { value: "Medium", label: "10-50", description: "Growing company", icon: "👥" },
    { value: "Large", label: "50-100", description: "Established business", icon: "🏢" },
    { value: "Enterprise", label: "100+", description: "Large enterprise", icon: "🏭" },
  ]

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const { data, timestamp, step } = JSON.parse(savedData)
        const now = Date.now()

        if (now - timestamp < STORAGE_EXPIRY) {
          setFormData(data)
          setCurrentStep(step)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Save data to localStorage whenever form data or step changes
  useEffect(() => {
    const dataToSave = {
      data: formData,
      timestamp: Date.now(),
      step: currentStep,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  }, [formData, currentStep])

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleInputChange("logo", file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        handleInputChange("logoDataUrl", dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSignup = async () => {
    setIsLoading(true)
    try {
      // Clear localStorage on successful signup
      localStorage.removeItem(STORAGE_KEY)
      const processedData = {
        name: formData.organizationName,
        logo: formData.logo || undefined,
        website: formData.website || undefined,
        type: formData.organizationType,
        size: formData.organizationSize || undefined,
        password: formData.password,
        acceptTerms: formData.acceptTerms,
        contactName: formData.firstName,
        contactEmail: formData.email,
      }
      const organization = await createOrganization(processedData)
      if (organization.success) {
        router.push("/dashboard")
      } else {
        toast.error(organization.message)
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Signup error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create organization")
      setIsLoading(false)
    }
  }

  const getStepValidation = () => {
    switch (currentStep) {
      case 1:
        return formData.organizationName.trim() !== ""
      case 2:
        return formData.organizationType !== ""
      case 3:
        return formData.organizationSize !== ""
      case 4:
        return (
          formData.firstName.trim() !== "" &&
          formData.email.trim() !== "" &&
          formData.password.trim() !== "" &&
          formData.acceptTerms
        )
      default:
        return false
    }
  }

  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return { title: "Organization Setup", description: "Tell us about your organization", icon: Building2 }
      case 2:
        return { title: "Organization Type", description: "What type of organization is this?", icon: Briefcase }
      case 3:
        return { title: "Team Size", description: "How many people are in your organization?", icon: Users }
      case 4:
        return { title: "Personal Details", description: "Complete your account setup", icon: User }
      default:
        return { title: "", description: "", icon: Building2 }
    }
  }

  const stepInfo = getStepInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Devtul
            </span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground">Start your free trial today</p>
        </div>

        {/* Enhanced Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-blue-600">Step {currentStep} of 4</span>
            <span className="text-sm text-muted-foreground">{stepInfo.description}</span>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step < currentStep
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : step === currentStep
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white ring-4 ring-blue-100"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step < currentStep ? <Check className="h-5 w-5" /> : step}
                </div>
                <div className="text-xs text-muted-foreground mt-1 text-center">
                  {step === 1 && "Org Info"}
                  {step === 2 && "Type"}
                  {step === 3 && "Size"}
                  {step === 4 && "Personal"}
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <stepInfo.icon className="h-5 w-5" />
              {stepInfo.title}
            </CardTitle>
            <CardDescription>{stepInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="transition-all duration-300 ease-in-out">
              {currentStep === 1 && (
                /* Step 1 - Organization Basic Info */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Name *</Label>
                    <Input
                      id="organizationName"
                      placeholder="Acme Inc."
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange("organizationName", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start bg-transparent"
                            onClick={() => document.getElementById("logo")?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {formData.logo ? formData.logo.name : "Upload logo"}
                          </Button>
                        </div>
                      </div>
                      {formData.logoDataUrl && (
                        <div className="w-20 h-20 rounded-lg border-2 border-gray-200 overflow-hidden bg-white p-1">
                          <img
                            src={formData.logoDataUrl || "/placeholder.svg"}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://example.com"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                /* Step 2 - Organization Type */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {organizationTypes.map((type) => (
                      <div
                        key={type.value}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          formData.organizationType === type.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleInputChange("organizationType", type.value)}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">{type.icon}</div>
                          <Badge
                            variant={formData.organizationType === type.value ? "default" : "secondary"}
                            className="mb-1"
                          >
                            {type.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                /* Step 3 - Organization Size */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {organizationSizes.map((size) => (
                      <div
                        key={size.value}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          formData.organizationSize === size.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleInputChange("organizationSize", size.value)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">{size.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={formData.organizationSize === size.value ? "default" : "secondary"}>
                                {size.label} employees
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{size.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                /* Step 4 - Personal Details */
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSignup()
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="terms"
                      className="rounded"
                      checked={formData.acceptTerms}
                      onChange={(e) => handleInputChange("acceptTerms", e.target.checked)}
                      required
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-blue-600 hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </form>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevStep} className="flex-1 bg-transparent">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}

              {currentStep < 4 ? (
                <Button
                  onClick={handleNextStep}
                  className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 ${
                    currentStep === 1 ? "w-full" : "flex-1"
                  }`}
                  disabled={!getStepValidation()}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSignup}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading || !getStepValidation()}
                >
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              )}
            </div>

            {/* Features - Show only on step 4 */}
            {currentStep === 4 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">What you get:</h3>
                <ul className="space-y-1 text-sm text-green-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    14-day free trial
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    No credit card required
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    Full access to all features
                  </li>
                </ul>
              </div>
            )}

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
