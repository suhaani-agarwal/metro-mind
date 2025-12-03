"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/firebase/config";
import { useTranslations } from "next-intl";

export default function AdminLogin() {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations("AdminLogin");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      // 1️⃣ Firebase Auth login
      const userCred = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const uid = userCred.user.uid;

      // 2️⃣ Check if this user is a Super Admin
      const adminDoc = await getDoc(doc(db, "super_admins", uid));
      if (!adminDoc.exists()) {
        alert(t("unauthorized"));
        return;
      }

      // 3️⃣ Redirect to admin dashboard with correct locale
      router.push(`/${locale}/adminDashboard`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      <div className="max-w-md w-full mx-auto p-8">
        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          {/* <button
            onClick={() => setLang(lang === "en" ? "ml" : "en")}
            className="px-4 py-2 rounded-lg bg-sky-400 text-slate-50 hover:bg-sky-500 transition"
          >
            {lang === "en" ? "മലയാളം" : "English"}
          </button> */}
        </div>

        {/* Login Card */}
        <div
          className="backdrop-blur-md rounded-2xl p-10 border border-slate-600/30 shadow-2xl"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-50 mb-2 drop-shadow-lg">
              {t("title")}
            </h1>
            <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
            <p className="text-slate-300 mt-4 text-sm">{t("subtitle")}</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {t("email")}
              </label>
              <input
                name="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={form.email}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {t("password")}
              </label>
              <input
                name="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={form.password}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              />
            </div>

            {/* Login Button */}
            <div className="pt-4">
              <button
                onClick={handleLogin}
                disabled={loading}
                className={`w-full px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-400/20 backdrop-blur-sm ${loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                style={{
                  background: loading
                    ? "rgba(100, 116, 139, 0.5)"
                    : "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                  boxShadow: loading
                    ? "none"
                    : "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
                }}
              >
                {loading ? t("loggingIn") : t("loginButton")}
              </button>
            </div>

            {/* Create Admin Link */}
            <div className="text-center pt-4">
              <button
                onClick={() => router.push(`/${locale}/adminSignUp`)}
                className="text-sky-400 hover:text-sky-300 transition-colors duration-300 font-medium text-sm"
              >
                {t("createAdmin")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}