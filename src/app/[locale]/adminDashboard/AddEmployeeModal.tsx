"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const API_BASE =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

interface AddEmployeeModalProps {
    onClose: () => void;
}

export default function AddEmployeeModal({ onClose }: AddEmployeeModalProps) {
    const t = useTranslations("AddEmployeeModal");
    const [depots, setDepots] = useState<string[]>([]);

    // Form State
    const [fullName, setFullName] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [role, setRole] = useState("");
    const [selectedDepot, setSelectedDepot] = useState("");

    const roles = [
        "Manager",
        "Maintenance Staff",
        "Operations Staff",
        "Security",
        "Cleaning Staff"
    ];

    useEffect(() => {
        async function fetchDepots() {
            try {
                const res = await fetch(`${API_BASE}/api/onboarding/depot`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setDepots(data.map((d: any) => d.name));
                }
            } catch (err) {
                console.error("Failed to fetch depots", err);
            }
        }
        fetchDepots();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !fullName ||
            !employeeId ||
            !email ||
            !role ||
            !selectedDepot
        ) {
            alert(t("fillRequired"));
            return;
        }

        // Success message (Mock submission)
        alert(t("successMessage"));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-600/30 shadow-2xl p-6"
                style={{ backgroundColor: "#0f172a" }}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-50">{t("title")}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-50 transition">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Employee Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-sky-400 border-b border-slate-700 pb-2">
                            {t("employeeDetails")}
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("fullName")}</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder={t("fullNamePlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Employee ID */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("employeeId")}</label>
                                <input
                                    type="text"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder={t("employeeIdPlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("email")}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("emailPlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("phoneNumber")}</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder={t("phoneNumberPlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("role")}</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                >
                                    <option value="">{t("selectRole")}</option>
                                    {roles.map((r, idx) => (
                                        <option key={idx} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Assigned Depot */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("depot")}</label>
                                <select
                                    value={selectedDepot}
                                    onChange={(e) => setSelectedDepot(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                >
                                    <option value="">{t("selectDepot")}</option>
                                    {depots.map((depot, idx) => (
                                        <option key={idx} value={depot}>{depot}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-xl transition font-semibold"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white rounded-xl transition font-semibold shadow-lg"
                        >
                            {t("submit")}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
