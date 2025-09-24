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
  Clock,
  Train,
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
    {
      id: "station-master",
      label: "Station Master",
      icon: Users,
      description: "Platform Operations Management",
    },
    {
      id: "control-operator",
      label: "Control Operator",
      icon: Shield,
      description: "Central Command Control",
    },
    {
      id: "maintenance-lead",
      label: "Maintenance Lead",
      icon: KeyRound,
      description: "Technical Operations Lead",
    },
    {
      id: "safety-officer",
      label: "Safety Officer",
      icon: AlertTriangle,
      description: "Safety & Compliance Officer",
    },
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
          window.location.href = "/onboarding";
        }, 3000);
      }, 2500);
    }
  };

  const steps = [
    {
      title: "Role Authentication",
      subtitle: "Select your operational designation within the metro system",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {designations.map((designation) => (
            <motion.button
              key={designation.id}
              onClick={() => handleDesignationSelect(designation.id)}
              className="relative overflow-hidden p-6 rounded-2xl border border-slate-600/50 backdrop-blur-sm transition-all duration-500 group hover:transform hover:-translate-y-2"
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.6)",
                boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.1)",
              }}
              whileHover={{
                y: -8,
                boxShadow: "0 20px 40px -10px rgba(56, 189, 248, 0.3)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative z-10 text-center">
                <div
                  className="mb-4 mx-auto w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                  }}
                >
                  <designation.icon className="h-7 w-7 text-slate-50" />
                </div>
                <h3 className="text-lg font-bold text-slate-50 mb-2">
                  {designation.label}
                </h3>
                <p className="text-sm text-slate-400 mb-1">
                  {designation.description}
                </p>
                <div className="text-xs text-emerald-400 font-medium">
                  Authorized Personnel
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-sky-400/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </motion.button>
          ))}
        </div>
      ),
    },
    {
      title: "Identity Verification",
      subtitle: "Enter your unique MetroMind employee identification number",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <label
              htmlFor="employeeId"
              className="block text-sm font-semibold text-slate-300"
            >
              Employee Identification Number
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-sky-400 transition-colors duration-300" />
              </div>
              <input
                id="employeeId"
                type="text"
                placeholder="KM-2024-0001"
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData({ ...formData, employeeId: e.target.value })
                }
                className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                maxLength={12}
              />
            </div>
            <p className="text-xs text-slate-400 ml-1">
              Format: KM-YYYY-XXXX (e.g., KM-2024-0001)
            </p>
          </div>
          <button
            onClick={handleEmployeeIdSubmit}
            disabled={!formData.employeeId || isLoading}
            className={`w-full py-4 text-lg font-semibold text-slate-50 rounded-xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-400/20 backdrop-blur-sm ${
              !formData.employeeId || isLoading
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            style={{
              background:
                !formData.employeeId || isLoading
                  ? "rgba(100, 116, 139, 0.5)"
                  : "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
              boxShadow:
                !formData.employeeId || isLoading
                  ? "none"
                  : "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
            }}
          >
            {isLoading ? "🔍 Verifying Identity..." : "🛡️ Verify Identity"}
          </button>
        </div>
      ),
    },
    {
      title: "Multi-Factor Authentication",
      subtitle:
        "Complete security verification with the OTP sent to your registered device",
      content: (
        <div className="space-y-6">
          <motion.div
            className="text-center p-6 rounded-xl border border-emerald-400/50 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(6, 214, 160, 0.1)" }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="mb-4 mx-auto w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
              }}
            >
              <Smartphone className="h-8 w-8 text-slate-50" />
            </div>
            <p className="text-emerald-400 font-bold text-lg">
              OTP Sent Successfully!
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Check your registered mobile device for the 6-digit code
            </p>
          </motion.div>

          <div className="space-y-3">
            <label
              htmlFor="otp"
              className="block text-sm font-semibold text-slate-300"
            >
              One-Time Password (OTP)
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-sky-400 transition-colors duration-300" />
              </div>
              <input
                id="otp"
                type="text"
                placeholder="000000"
                value={formData.otp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                className="w-full pl-12 pr-4 py-4 text-center text-2xl font-mono rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm tracking-widest"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                maxLength={6}
              />
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-2 text-slate-400">
                <Clock className="h-4 w-4" />
                <span>
                  Time remaining:{" "}
                  <span className="text-amber-400 font-mono">{timeLeft}s</span>
                </span>
              </div>
              <button
                className="text-sky-400 hover:text-sky-300 transition-colors duration-300 font-medium"
                disabled={timeLeft > 0}
              >
                {timeLeft > 0 ? "Resend Available Soon" : "Resend OTP"}
              </button>
            </div>
          </div>

          <button
            onClick={handleOtpSubmit}
            disabled={formData.otp.length !== 6 || isLoading}
            className={`w-full py-4 text-lg font-semibold text-slate-50 rounded-xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/20 backdrop-blur-sm ${
              formData.otp.length !== 6 || isLoading
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            style={{
              background:
                formData.otp.length !== 6 || isLoading
                  ? "rgba(100, 116, 139, 0.5)"
                  : "linear-gradient(135deg, #06d6a0 0%, #10b981 100%)",
              boxShadow:
                formData.otp.length !== 6 || isLoading
                  ? "none"
                  : "0 10px 25px -5px rgba(6, 214, 160, 0.3)",
            }}
          >
            {isLoading ? "🔐 Authenticating..." : "🚀 Complete Authentication"}
          </button>
        </div>
      ),
    },
    {
      title: "Access Authorization Complete",
      subtitle:
        "Security clearance verified • Welcome to MetroMind Control System",
      content: (
        <div className="text-center space-y-8">
          <motion.div
            className="inline-block p-8 rounded-full"
            style={{
              background: "linear-gradient(135deg, #06d6a0 0%, #10b981 100%)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
          >
            <CheckCircle className="h-20 w-20 text-slate-50" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-2xl font-bold text-emerald-400 mb-3">
              Authentication Successful!
            </h3>
            <p className="text-slate-300 mb-4">
              Security clearance verified for authorized personnel
            </p>
            <div className="flex justify-center items-center space-x-2 text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-sm">
                Redirecting to secure dashboard...
              </span>
            </div>
          </motion.div>
        </div>
      ),
    },
  ];

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-pulse"
          style={{
            background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)",
          }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 animate-pulse"
          style={{
            background: "radial-gradient(circle, #06d6a0 0%, transparent 70%)",
          }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-6">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-lg border border-slate-600/50"
              style={{
                background: "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
              }}
            >
              <Shield className="h-10 w-10 text-slate-50" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-50 mb-2 drop-shadow-lg">
            MetroMind Security
          </h1>
          <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 mb-4"></div>
          <p className="text-slate-300">
            Multi-Layer Authentication Portal • Authorized Personnel Only
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-8 flex justify-between items-center max-w-md mx-auto">
          {steps.map((_, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 ${
                  index <= currentStep
                    ? "bg-gradient-to-r from-sky-400 to-emerald-400 border-transparent text-slate-50 shadow-lg"
                    : "border-slate-600 text-slate-400 bg-slate-800/50"
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 rounded-full transition-all duration-500 ${
                    index < currentStep
                      ? "bg-gradient-to-r from-sky-400 to-emerald-400"
                      : "bg-slate-600"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="backdrop-blur-md rounded-2xl p-8 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-50 mb-2">
                {steps[currentStep].title}
              </h2>
              <p className="text-slate-400">{steps[currentStep].subtitle}</p>
            </div>
            {steps[currentStep].content}
          </motion.div>
        </AnimatePresence>

        {/* Security Footer */}
        <div className="text-center mt-8 space-y-4">
          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 text-slate-400">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Clock className="h-4 w-4 text-sky-400" />
              <span>Session Timeout: 8h</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Train className="h-4 w-4 text-amber-400" />
              <span>Metro Operations</span>
            </div>
          </div>
          <div
            className="mx-auto max-w-md p-4 rounded-lg border border-slate-600/50 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
          >
            <p className="text-slate-400 text-sm mb-2">
              Kochi Metro Rail Limited - Secure Access Portal
            </p>
            <Link
              href="/"
              className="text-sky-400 hover:text-sky-300 transition-colors duration-300 text-sm font-medium"
            >
              Return to Home Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
