"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/firebase/config";

const translations = {
  en: {
    title: "Super Admin Signup",
    subtitle: "Create your administrative account",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    email: "Email Address",
    emailPlaceholder: "Enter your email address",
    phone: "Phone Number",
    phonePlaceholder: "Enter your phone number",
    password: "Password",
    passwordPlaceholder: "Create a secure password",
    role: "Role",
    roleValue: "MetroMind Admin",
    signupButton: "Create Super Admin",
    creating: "Creating...",
    alreadyExists: "Super Admin already exists. Please log in.",
    successMessage: "Super Admin created successfully!",
    alreadyHaveAccount: "Already have an account? Login",
  },
  ml: {
    title: "സൂപ്പർ അഡ്മിൻ സൈൻഅപ്പ്",
    subtitle: "നിങ്ങളുടെ അഡ്മിനിസ്ട്രേറ്റീവ് അക്കൗണ്ട് സൃഷ്ടിക്കുക",
    fullName: "പൂർണ്ണ നാമം",
    fullNamePlaceholder: "നിങ്ങളുടെ പൂർണ്ണ നാമം നൽകുക",
    email: "ഇമെയിൽ വിലാസം",
    emailPlaceholder: "നിങ്ങളുടെ ഇമെയിൽ വിലാസം നൽകുക",
    phone: "ഫോൺ നമ്പർ",
    phonePlaceholder: "നിങ്ങളുടെ ഫോൺ നമ്പർ നൽകുക",
    password: "പാസ്‌വേഡ്",
    passwordPlaceholder: "സുരക്ഷിതമായ പാസ്‌വേഡ് സൃഷ്ടിക്കുക",
    role: "റോൾ",
    roleValue: "മെട്രോമൈൻഡ് അഡ്മിൻ",
    signupButton: "സൂപ്പർ അഡ്മിൻ സൃഷ്ടിക്കുക",
    creating: "സൃഷ്ടിക്കുന്നു...",
    alreadyExists: "സൂപ്പർ അഡ്മിൻ ഇതിനകം നിലവിലുണ്ട്. ദയവായി ലോഗിൻ ചെയ്യുക.",
    successMessage: "സൂപ്പർ അഡ്മിൻ വിജയകരമായി സൃഷ്ടിച്ചു!",
    alreadyHaveAccount: "ഇതിനകം ഒരു അക്കൗണ്ട് ഉണ്ടോ? ലോഗിൻ",
  },
};

export default function AdminSignup() {
  const router = useRouter();
  const { locale } = useParams(); // en / ml
  const [lang, setLang] = useState<"en" | "ml">(
    (locale as "en" | "ml") || "en"
  );
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const role = "MetroMind Admin"; // autofilled

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    try {
      setLoading(true);
      // 1️⃣ Check if a super admin already exists
      const adminSnap = await getDocs(collection(db, "super_admins"));
      if (!adminSnap.empty) {
        alert(t.alreadyExists);
        return router.push(`/${locale}/adminLogin`);
      }

      // 2️⃣ Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const uid = userCred.user.uid;

      // 3️⃣ Store details in Firestore
      await setDoc(doc(db, "super_admins", uid), {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        role,
        created_at: new Date().toISOString(),
      });

      alert(t.successMessage);
      router.push(`/${locale}/adminLogin`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const t = translations[lang];

  const isFormValid = () => {
    return (
      form.fullName.trim() !== "" &&
      form.email.trim() !== "" &&
      form.phone.trim() !== "" &&
      form.password.trim() !== ""
    );
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      <div className="max-w-lg w-full mx-auto p-8">
        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          {/* <button
            onClick={() => setLang(lang === "en" ? "ml" : "en")}
            className="px-4 py-2 rounded-lg bg-sky-400 text-slate-50 hover:bg-sky-500 transition"
          >
            {lang === "en" ? "മലയാളം" : "English"}
          </button> */}
        </div>

        {/* Signup Card */}
        <div
          className="backdrop-blur-md rounded-2xl p-10 border border-slate-600/30 shadow-2xl"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-50 mb-2 drop-shadow-lg">
              {t.title}
            </h1>
            <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
            <p className="text-slate-300 mt-4 text-sm">{t.subtitle}</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Full Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {t.fullName}
              </label>
              <input
                name="fullName"
                type="text"
                placeholder={t.fullNamePlaceholder}
                value={form.fullName}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {t.email}
              </label>
              <input
                name="email"
                type="email"
                placeholder={t.emailPlaceholder}
                value={form.email}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {t.phone}
              </label>
              <input
                name="phone"
                type="tel"
                placeholder={t.phonePlaceholder}
                value={form.phone}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {t.password}
              </label>
              <input
                name="password"
                type="password"
                placeholder={t.passwordPlaceholder}
                value={form.password}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              />
            </div>

            {/* Role Input (Disabled) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {t.role}
              </label>
              <div
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-300 font-semibold backdrop-blur-sm"
                style={{ backgroundColor: "rgba(51, 65, 85, 0.6)" }}
              >
                {lang === "en" ? role : t.roleValue}
              </div>
            </div>

            {/* Signup Button */}
            <div className="pt-4">
              <button
                onClick={handleSignup}
                disabled={loading || !isFormValid()}
                className={`w-full px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/20 backdrop-blur-sm ${
                  loading || !isFormValid() ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={{
                  background:
                    loading || !isFormValid()
                      ? "rgba(100, 116, 139, 0.5)"
                      : "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                  boxShadow:
                    loading || !isFormValid()
                      ? "none"
                      : "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
                }}
              >
                {loading ? t.creating : t.signupButton}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center pt-4">
              <button
                onClick={() => router.push(`/${locale}/adminLogin`)}
                className="text-sky-400 hover:text-sky-300 transition-colors duration-300 font-medium text-sm"
              >
                {t.alreadyHaveAccount}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}