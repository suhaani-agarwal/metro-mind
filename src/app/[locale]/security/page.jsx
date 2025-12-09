"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
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
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

const getDesignations = (t) => [
  {
    id: "station-master",
    label: t("stationMaster"),
    icon: Users,
    description: t("stationMasterDesc"),
  },
  {
    id: "control-operator",
    label: t("controlOperator"),
    icon: Shield,
    description: t("controlOperatorDesc"),
  },
  {
    id: "maintenance-lead",
    label: t("maintenanceLead"),
    icon: KeyRound,
    description: t("maintenanceLeadDesc"),
  },
  {
    id: "safety-officer",
    label: t("safetyOfficer"),
    icon: AlertTriangle,
    description: t("safetyOfficerDesc"),
  },
];

// Steps configuration function
const getStepsConfig = (
  formData,
  isLoading,
  timeLeft,
  otpSent,
  handlers,
  t,
  error
) => [
  {
    title: t("roleAuthentication"),
    subtitle: t("roleSubtitle"),
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {getDesignations(t).map((designation) => (
          <motion.button
            key={designation.id}
            onClick={() => handlers.handleDesignationSelect(designation.id)}
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
                {t("authorizedPersonnel")}
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
    title: t("identityVerification"),
    subtitle: t("identitySubtitle"),
    content: (
      <div className="space-y-6">
        <div className="space-y-3">
          <label
            htmlFor="employeeId"
            className="block text-sm font-semibold text-slate-300"
          >
            {t("employeeIdLabel")}
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
                handlers.setFormData({
                  ...formData,
                  employeeId: e.target.value,
                })
              }
              className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
              style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              maxLength={12}
            />
          </div>
          <p className="text-xs text-slate-400 ml-1">{t("formatHint")}</p>
          {error && <p className="text-xs text-red-400 ml-1">{error}</p>}
        </div>
        <button
          onClick={handlers.handleEmployeeIdSubmit}
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
          {isLoading ? t("verifying") : t("verifyButton")}
        </button>
      </div>
    ),
  },
  {
    title: t("mfaTitle"),
    subtitle: t("mfaSubtitle"),
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
          <p className="text-emerald-400 font-bold text-lg">{t("otpSent")}</p>
          <p className="text-sm text-slate-400 mt-2">{t("otpSentDesc")}</p>
        </motion.div>

        <div className="space-y-3">
          <label
            htmlFor="otp"
            className="block text-sm font-semibold text-slate-300"
          >
            {t("otpLabel")}
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
                handlers.setFormData({
                  ...formData,
                  otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                })
              }
              className="w-full pl-12 pr-4 py-4 text-center text-2xl font-mono rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm tracking-widest"
              style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              maxLength={6}
            />
          </div>
          {error && <p className="text-xs text-red-400 ml-1">{error}</p>}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-2 text-slate-400">
              <Clock className="h-4 w-4" />
              <span>
                {t("timeRemaining")}{" "}
                <span className="text-amber-400 font-mono">{timeLeft}s</span>
              </span>
            </div>
            <button
              className="text-sky-400 hover:text-sky-300 transition-colors duration-300 font-medium"
              disabled={timeLeft > 0}
            >
              {timeLeft > 0 ? t("resendSoon") : t("resendOtp")}
            </button>
          </div>
        </div>

        <button
          onClick={handlers.handleOtpSubmit}
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
          {isLoading ? t("authenticating") : t("completeAuth")}
        </button>
      </div>
    ),
  },
  {
    title: t("accessGranted"),
    subtitle: t("accessSubtitle"),
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
            {t("authSuccess")}
          </h3>
          <p className="text-slate-300 mb-4">{t("authSuccessDesc")}</p>
          <div className="flex justify-center items-center space-x-2 text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-sm">{t("redirecting")}</span>
          </div>
        </motion.div>
      </div>
    ),
  },
];

export default function SecurityPage() {
  const t = useTranslations("Security");
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    designation: "",
    employeeId: "",
    otp: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes for email OTP
  const [error, setError] = useState("");

  // Memoized event handlers
  const handlers = useMemo(
    () => ({
      handleDesignationSelect: (designation) => {
        setFormData((prev) => ({ ...prev, designation }));
        setCurrentStep(1);
      },

      handleEmployeeIdSubmit: async () => {
        if (formData.employeeId) {
          setIsLoading(true);
          setError("");

          try {
            // 1. Check if employee exists in Firestore
            const q = query(
              collection(db, "employees"),
              where("employeeId", "==", formData.employeeId)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
              setError("Employee ID not found.");
              setIsLoading(false);
              return;
            }

            const employeeData = querySnapshot.docs[0].data();
            console.log("Found Employee Data:", employeeData); // Debug log

            // Handle case sensitivity (Email vs email)
            const email = employeeData.email || employeeData.Email;

            if (!email) {
              console.error("Email field is missing in:", employeeData);
              setError("No email address registered for this employee.");
              setIsLoading(false);
              return;
            }
//hello
            // 2. Send OTP via email
            const response = await fetch(`${API_BASE}/api/send-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, employeeId: formData.employeeId }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Failed to send OTP");
            }

            setOtpSent(true);
            setTimeLeft(300); // 5 minutes
            setCurrentStep(2);
          } catch (err) {
            console.error("Error sending OTP:", err);
            setError(`Failed to send OTP: ${err.message}`);
          } finally {
            setIsLoading(false);
          }
        }
      },

      handleOtpSubmit: async () => {
        if (formData.otp.length === 6) {
          setIsLoading(true);
          setError("");

          try {
            // Verify OTP via API
            const response = await fetch(
              `${API_BASE}/api/verify-otp?employeeId=${formData.employeeId}&otp=${formData.otp}`
            );

            const data = await response.json();

            if (!response.ok || !data.valid) {
              throw new Error(data.error || "Invalid OTP");
            }

            // Success
            setCurrentStep(3);
            setTimeout(() => {
              router.push("/trains");
            }, 3000);
          } catch (err) {
            console.error("Error verifying OTP:", err);
            setError(err.message || "Invalid OTP. Please try again.");
          } finally {
            setIsLoading(false);
          }
        }
      },

      setFormData,
    }),
    [formData.employeeId, formData.otp, router]
  );

  // Optimized useEffect with proper cleanup
  useEffect(() => {
    let timer;
    if (otpSent && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [otpSent, timeLeft]);

  // Memoized steps configuration
  const steps = useMemo(
    () =>
      getStepsConfig(
        formData,
        isLoading,
        timeLeft,
        otpSent,
        handlers,
        t,
        error
      ),
    [formData, isLoading, timeLeft, otpSent, handlers, t, error]
  );

  // Memoized progress steps
  const progressSteps = useMemo(
    () =>
      steps.map((_, index) => ({
        index,
        isCompleted: index < currentStep,
        isCurrent: index === currentStep,
      })),
    [steps, currentStep]
  );

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
            {t("title")}
          </h1>
          <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 mb-4"></div>
          <p className="text-slate-300">{t("subtitle")}</p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-8 flex justify-between items-center max-w-md mx-auto">
          {progressSteps.map(({ index, isCompleted, isCurrent }) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 ${
                  isCompleted || isCurrent
                    ? "bg-gradient-to-r from-sky-400 to-emerald-400 border-transparent text-slate-50 shadow-lg"
                    : "border-slate-600 text-slate-400 bg-slate-800/50"
                }`}
              >
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 rounded-full transition-all duration-500 ${
                    isCompleted
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
                {steps[currentStep]?.title}
              </h2>
              <p className="text-slate-400">{steps[currentStep]?.subtitle}</p>
            </div>
            {steps[currentStep]?.content}
          </motion.div>
        </AnimatePresence>

        {/* Security Footer */}
        <div className="text-center mt-8 space-y-4">
          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 text-slate-400">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>{t("encryption")}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Clock className="h-4 w-4 text-sky-400" />
              <span>{t("sessionTimeout")}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Train className="h-4 w-4 text-amber-400" />
              <span>{t("metroOperations")}</span>
            </div>
          </div>
          <div
            className="mx-auto max-w-md p-4 rounded-lg border border-slate-600/50 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
          >
            <p className="text-slate-400 text-sm mb-2">{t("kmrlPortal")}</p>
            <Link
              href="/"
              className="text-sky-400 hover:text-sky-300 transition-colors duration-300 text-sm font-medium"
            >
              {t("returnHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
