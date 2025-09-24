"use client";

import { useState } from "react";
import { Eye, EyeOff, Shield, User, Lock, Train } from "lucide-react";
import Link from "next/link";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    password: "",
    rememberMe: false,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login attempt:", formData);
  };

  return (
    <section
      className="min-h-screen w-full relative overflow-hidden"
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

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        {/* Main Login Container */}
        <div
          className="w-full max-w-md backdrop-blur-md rounded-2xl border border-slate-600/30 shadow-2xl p-8"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          {/* Header Section */}
          <div className="text-center space-y-6 mb-8">
            {/* Logo */}
            <div className="flex items-center justify-center">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg border border-slate-600/50"
                style={{
                  background:
                    "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                  boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
                }}
              >
                <Train className="h-8 w-8 text-slate-50" />
              </div>
            </div>

            {/* Brand & Title */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-slate-50 drop-shadow-lg">
                MetroMind
              </h1>
              <div className="w-16 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
              <p className="text-slate-300 text-sm">
                Advanced Railway Operations Management
              </p>
            </div>
          </div>

          {/* Security Badge */}
          <div
            className="flex items-center justify-center space-x-3 rounded-xl p-4 mb-8 border border-slate-600/50 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
          >
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-300">
              Kochi Metro Security Portal
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Employee ID Section */}
              <div className="space-y-2">
                <label
                  htmlFor="employeeId"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Employee Identification
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-sky-400 transition-colors duration-300" />
                  </div>
                  <input
                    id="employeeId"
                    type="text"
                    placeholder="Enter your employee ID"
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 ml-1">
                  Use your assigned Metro employee ID
                </p>
              </div>

              {/* Password Section */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Secure Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-sky-400 transition-colors duration-300" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your secure password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-sky-400 transition-colors duration-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 ml-1">
                  Your password is encrypted and secure
                </p>
              </div>
            </div>

            {/* Session Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label
                  className="flex items-center space-x-3 cursor-pointer group"
                  htmlFor="rememberMe"
                >
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) =>
                      setFormData({ ...formData, rememberMe: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-slate-600 text-sky-400 focus:ring-sky-400/20 transition-colors duration-300"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  />
                  <span className="text-sm text-slate-300 group-hover:text-slate-50 transition-colors duration-300">
                    Remember Session
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-sky-400 hover:text-sky-300 transition-colors duration-300 font-medium"
                >
                  Recovery Options
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 text-lg font-semibold text-slate-50 rounded-xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-400/20 backdrop-blur-sm"
              style={{
                background: "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
              }}
            >
              Access Dashboard
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span
                  className="px-3 text-slate-400 backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                >
                  Support & Assistance
                </span>
              </div>
            </div>

            {/* Support Links */}
            <div className="text-center space-y-3">
              <p className="text-sm text-slate-400">
                Need access? Contact your system administrator
              </p>
              <div className="flex justify-center space-x-6">
                <Link
                  href="/help"
                  className="text-sm text-sky-400 hover:text-sky-300 transition-colors duration-300 font-medium"
                >
                  Get Help
                </Link>
                <Link
                  href="/admin"
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors duration-300 font-medium"
                >
                  Admin Portal
                </Link>
              </div>
            </div>

            {/* Version Info */}
            <div className="text-center pt-4 border-t border-slate-600/30">
              <p className="text-xs text-slate-500">
                MetroMind v2.1.0 • Secure Railway Operations Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Security Indicator */}
      <div className="absolute bottom-6 left-6">
        <div
          className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-600/50 backdrop-blur-md"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs text-slate-400 font-medium">
            Secure Connection
          </span>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
