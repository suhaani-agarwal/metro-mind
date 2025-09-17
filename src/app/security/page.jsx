"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Users, 
  KeyRound, 
  AlertTriangle, 
  Smartphone, 
  CheckCircle, 
  Lock, 
  Clock 
} from "lucide-react";
import Link from "next/link";

export default function SecurityPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    designation: "",
    employeeId: "",
    otp: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const designations = [
    { id: "station-master", label: "Station Master", icon: Users },
    { id: "control-operator", label: "Control Operator", icon: Shield },
    { id: "maintenance-lead", label: "Maintenance Lead", icon: KeyRound },
    { id: "safety-officer", label: "Safety Officer", icon: AlertTriangle },
  ];

  useEffect(() => {
    if (otpSent && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpSent, timeLeft]);

  const handleDesignationSelect = (designation) => {
    setFormData({ ...formData, designation });
    setCurrentStep(1);
  };

  const handleEmployeeIdSubmit = () => {
    if (formData.employeeId) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setOtpSent(true);
        setTimeLeft(30);
        setCurrentStep(2);
      }, 2000);
    }
  };

  const handleOtpSubmit = () => {
    if (formData.otp.length === 6) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setCurrentStep(3);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 3000);
      }, 2500);
    }
  };

  const steps = [
    {
      title: "Select Your Designation",
      subtitle: "Choose your role in the metro operations",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {designations.map((designation) => (
            <motion.button
              key={designation.id}
              onClick={() => handleDesignationSelect(designation.id)}
              className="relative overflow-hidden p-6 rounded-2xl border-2 border-[#00A885]/40 bg-gradient-to-br from-white to-[#00A885]/5 hover:border-[#00A885]/70 hover:scale-105 transition-all duration-500 group"
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative z-10 text-center">
                <designation.icon className="h-12 w-12 text-[#00A885] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-lg font-bold text-foreground mb-2">{designation.label}</h3>
                <div className="text-sm text-muted-foreground">Authorized Personnel</div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#00A885]/10 to-[#00A885]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-[#00A885]/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </motion.button>
          ))}
        </div>
      )
    },
    {
      title: "Employee Verification",
      subtitle: "Enter your unique employee identification",
      content: (
        <div className="space-y-6">
          <div className="relative">
            <label htmlFor="employeeId" className="text-sm font-medium text-foreground mb-2 block">
              Employee ID
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-[#00A885]" />
              <input
                id="employeeId"
                type="text"
                placeholder="KM-2024-0001"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="pl-12 text-lg py-3 border-2 border-[#00A885]/40 focus:border-[#00A885] bg-gradient-to-r from-white to-[#00A885]/5 w-full rounded"
                maxLength={12}
              />
            </div>
          </div>
          <button
            onClick={handleEmployeeIdSubmit}
            disabled={!formData.employeeId || isLoading}
            className="w-full text-lg py-4 bg-[#00A885] hover:bg-[#009174] text-white font-semibold transition-all duration-500 rounded"
          >
            {isLoading ? "Verifying..." : "Verify Identity"}
          </button>
        </div>
      )
    },
    {
      title: "Security Authentication",
      subtitle: "Enter the OTP sent to your registered device",
      content: (
        <div className="space-y-6">
          <motion.div className="text-center p-6 rounded-2xl bg-gradient-to-r from-[#00A885]/15 to-[#00A885]/10 border-2 border-[#00A885]/30">
            <Smartphone className="h-16 w-16 text-[#00A885] mx-auto mb-3" />
            <p className="text-[#00A885] font-bold">OTP Sent Successfully!</p>
            <p className="text-sm text-muted-foreground mt-1">Check your registered mobile device</p>
          </motion.div>

          <div className="relative">
            <label htmlFor="otp" className="text-sm font-medium text-foreground mb-2 block">
              One-Time Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-[#00A885]" />
              <input
                id="otp"
                type="text"
                placeholder="000000"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="pl-12 text-center text-2xl font-mono py-4 border-2 border-[#00A885]/40 focus:border-[#00A885] bg-gradient-to-r from-white to-[#00A885]/5 tracking-widest w-full rounded"
                maxLength={6}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
              <span>Time remaining: {timeLeft}s</span>
              <button className="text-[#00A885] hover:underline">Resend OTP</button>
            </div>
          </div>

          <button
            onClick={handleOtpSubmit}
            disabled={formData.otp.length !== 6 || isLoading}
            className="w-full text-lg py-4 bg-[#00A885] hover:bg-[#009174] text-white font-semibold transition-all duration-500 rounded"
          >
            {isLoading ? "Authenticating..." : "Complete Authentication"}
          </button>
        </div>
      )
    },
    {
      title: "Access Granted",
      subtitle: "Welcome to MetroMind Control System",
      content: (
        <div className="text-center space-y-8">
          <motion.div className="inline-block p-8 rounded-full bg-[#00A885]">
            <CheckCircle className="h-20 w-20 text-white" />
          </motion.div>

          <div>
            <h3 className="text-2xl font-bold text-[#00A885] mb-2">Authentication Successful!</h3>
            <p className="text-muted-foreground">Security clearance verified. Redirecting to dashboard...</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#00A885]/5 to-[#00A885]/10 flex items-center justify-center p-4 overflow-hidden">
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-16 w-16 text-[#00A885]" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00A885] to-[#009174] bg-clip-text text-transparent mb-2">
            MetroMind Security
          </h1>
          <p className="text-muted-foreground">Authorized Personnel Access Only</p>
        </motion.div>

        <div className="mb-8 flex justify-between items-center">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                index <= currentStep ? "bg-[#00A885] text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {index < currentStep ? <CheckCircle className="h-4 w-4" /> : index + 1}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="metro-card-elevated p-8 bg-gradient-to-br from-white to-[#00A885]/5 border-2 border-[#00A885]/30 rounded"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{steps[currentStep].title}</h2>
              <p className="text-muted-foreground">{steps[currentStep].subtitle}</p>
            </div>
            {steps[currentStep].content}
          </motion.div>
        </AnimatePresence>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <div className="flex justify-center space-x-4 mb-2">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4 text-[#00A885]" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-[#00A885]" />
              <span>Session Timeout: 8h</span>
            </div>
          </div>
          <p>Kochi Metro Rail Limited - Secure Access Portal</p>
          <Link href="/" className="text-[#00A885] hover:underline text-xs">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
