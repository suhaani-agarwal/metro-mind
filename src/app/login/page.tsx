"use client";

import { useState } from "react";
import { Eye, EyeOff, Shield } from "lucide-react";
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
    <section className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#00A885] to-teal-400 flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#00A885]">MetroMind</h1>
            <p className="text-gray-500">
              Secure access for authorized personnel only
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 bg-gray-100 border border-gray-300 rounded-lg p-3">
            <Shield className="h-5 w-5 text-[#00A885]" />
            <span className="text-sm font-medium text-gray-700">
              Kochi Metro Security Portal
            </span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Employee ID */}
              <div className="space-y-2">
                <label
                  htmlFor="employeeId"
                  className="text-sm font-medium text-gray-700"
                >
                  Employee ID
                </label>
                <div className="relative">
                  <input
                    id="employeeId"
                    type="text"
                    placeholder="Enter your employee ID"
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="w-full border rounded-lg pl-10 p-2 focus:ring-2 focus:ring-[#00A885]"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full border rounded-lg pl-10 pr-10 p-2 focus:ring-2 focus:ring-[#00A885]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    setFormData({ ...formData, rememberMe: e.target.checked })
                  }
                  className="h-4 w-4 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="text-sm text-gray-600">
                  Remember me
                </label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-[#00A885] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#00A885] text-white rounded-lg p-2 font-medium hover:bg-[#009174] transition"
            >
              Access Dashboard
            </button>
          </form>

          {/* Additional Links */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              Need access? Contact your system administrator
            </p>
            <Link href="/help" className="text-sm text-[#00A885] hover:underline">
              Get Help
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
