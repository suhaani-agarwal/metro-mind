"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const API_BASE =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

interface NightlyForm {
    fitness_certificates?: {
        issued_at: string;
        valid_until: string;
        status: string;
        renew_rolling_stock?: boolean;
        renew_signalling?: boolean;
        renew_telecom?: boolean;
    };
    brandings?: {
        advertiser: string;
        priority: string;
        exposure_hours_needed: number;
        preferred_timing?: string;
    }[];
    cleaning?: {
        status: string;
        type: string;
        scheduled_at: string;
        manual_labour_count: number;
        bay_assigned: string;
    };
    stabling?: {
        bay: string;
        position: string;
        reception: boolean;
    };
}

interface CertificateDetails {
    [key: string]: {
        issue_date: string;
        expiry_date: string;
        status: string;
        department: string;
    };
}

export default function NightlyPage() {
    const router = useRouter();
    const t = useTranslations("NightlyPage");
    const [trains, setTrains] = useState<string[]>([]);
    const [selectedTrain, setSelectedTrain] = useState<string>("");
    const [showFitness, setShowFitness] = useState<boolean>(false);
    const [expiredCertificates, setExpiredCertificates] = useState<string[]>([]);
    const [certificateDetails, setCertificateDetails] = useState<CertificateDetails>({});

    const [form, setForm] = useState<NightlyForm>({ brandings: [] });
    const [deepCleaningLabour, setDeepCleaningLabour] = useState<number>(0);
    const [showAddBranding, setShowAddBranding] = useState<boolean>(false);
    const [brandingDraft, setBrandingDraft] = useState<{
        advertiser: string;
        priority: string;
        exposure_hours_needed: number;
        preferred_timing: string;
    }>({ advertiser: "", priority: "", exposure_hours_needed: 0, preferred_timing: "" });

    // Load trains and check fitness expiry
    useEffect(() => {
        axios.get(`${API_BASE}/api/nightly/trains`).then(async (res) => {
            setTrains(res.data.trains);
            if (res.data.trains.length) {
                const trainId = res.data.trains[0];
                setSelectedTrain(trainId);
                await loadTrainFitness(trainId);
            }
        });
    }, []);

    const loadTrainFitness = async (trainId: string) => {
        try {
            const fitnessRes = await axios.get(
                `${API_BASE}/api/nightly/train/${trainId}/fitness`
            );

            const { has_expired, expired_certificates, certificate_details } = fitnessRes.data;
            setShowFitness(has_expired);
            setExpiredCertificates(expired_certificates || []);
            setCertificateDetails(certificate_details || {});

            if (has_expired) {
                // Initialize with all expired certificates selected for renewal by default
                const renewDefaults: { [key: string]: boolean } = {};
                expired_certificates.forEach((cert: string) => {
                    renewDefaults[`renew_${cert}`] = true;
                });

                setForm((prev) => ({
                    ...prev,
                    fitness_certificates: {
                        issued_at: new Date().toISOString().slice(0, 16),
                        valid_until: "",
                        status: "valid",
                        ...renewDefaults
                    },
                }));
            } else {
                setForm((prev) => ({
                    ...prev,
                    fitness_certificates: undefined,
                }));
            }
        } catch (error) {
            console.error("Error loading fitness data:", error);
        }
    };

    const handleChange = (section: string, field: string, value: string | number | boolean) => {
        setForm((prev) => ({
            ...prev,
            [section]: {
                ...prev[section as keyof NightlyForm],
                [field]: value,
            },
        }));
    };

    const handleCertificateToggle = (certType: string) => {
        const currentValue = form.fitness_certificates?.[`renew_${certType}` as keyof typeof form.fitness_certificates] || false;
        handleChange("fitness_certificates", `renew_${certType}`, !currentValue);
    };

    const handleSubmit = async () => {
        // Check for unsaved draft
        if (brandingDraft.advertiser) {
            alert("You have unsaved branding details. Please click 'Add to List' or clear the fields.");
            return;
        }

        let hasError = false;

        // 1) Save depot deep cleaning labour
        try {
            await axios.post(
                `${API_BASE}/api/nightly/depot/deep-cleaning`,
                {
                    manual_labour_available_today: Number(deepCleaningLabour) || 0,
                }
            );
        } catch (err) {
            console.error("Error saving deep cleaning:", err);
            hasError = true;
        }

        // 2) Append all queued branding entries
        if (form.brandings && form.brandings.length > 0) {
            for (const b of form.brandings) {
                if (!b.advertiser) continue;

                try {
                    // Send to the correct endpoint with correct structure
                    await axios.post(`${API_BASE}/api/nightly/branding/add`, {
                        train_id: selectedTrain,
                        branding: {
                            advertiser: b.advertiser,
                            priority: b.priority,
                            exposure_hours_needed: b.exposure_hours_needed
                        }
                    });
                } catch (err) {
                    console.error("Error saving branding:", err);
                    hasError = true;
                }
            }
        }

        // 3) Update the train data with fitness certificates (only if renewal is selected)
        if (form.fitness_certificates) {
            // Check if any certificate is selected for renewal AND dates are provided
            const hasRenewalSelected = expiredCertificates.some(cert =>
                form.fitness_certificates?.[`renew_${cert}` as keyof typeof form.fitness_certificates]
            );

            const hasValidDates = form.fitness_certificates.issued_at && form.fitness_certificates.valid_until;

            if (hasRenewalSelected && hasValidDates) {
                const payload = {
                    train_id: selectedTrain,
                    fitness_certificates: form.fitness_certificates,
                };
                try {
                    await axios.post(
                        `${API_BASE}/api/nightly/update/train`,
                        payload
                    );
                } catch (err) {
                    console.error("Error updating fitness certificates:", err);
                    hasError = true;
                }
            } else if (hasRenewalSelected && !hasValidDates) {
                alert("Please provide both issue date and valid until date for certificate renewal.");
                return;
            }
            // If no renewal selected, skip fitness certificate update
        }

        if (!hasError) {
            // Reset forms only if everything succeeded
            setForm((prev) => ({ ...prev, brandings: [] }));
            setShowAddBranding(false);
            // Reload fitness data to reflect changes
            await loadTrainFitness(selectedTrain);
            alert("Nightly data saved successfully!");
        } else {
            alert("Some data could not be saved. Please check the console for details.");
        }
    };

    return (
        <div
            className="min-h-screen w-full"
            style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
            }}
        >
            <div className="max-w-6xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-50 mb-2 drop-shadow-lg">
                        {t("header.title")}
                    </h1>
                    <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
                </div>

                {/* Depot Deep Cleaning */}
                <div
                    className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                >
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
                            <div className="w-2 h-8 rounded-full bg-gradient-to-b from-sky-400 to-blue-400"></div>
                            {t("deepCleaning.title")}
                        </h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    {t("deepCleaning.label")}
                                </label>
                                <input
                                    type="number"
                                    value={deepCleaningLabour}
                                    onChange={(e) => setDeepCleaningLabour(Number(e.target.value))}
                                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Train Selector Card */}
                <div
                    className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                >
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
                            <div className="w-2 h-8 rounded-full bg-gradient-to-b from-sky-400 to-emerald-400"></div>
                            {t("trainSelection.title")}
                        </h2>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">
                                {t("trainSelection.label")}
                            </label>
                            <select
                                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                value={selectedTrain}
                                onChange={async (e) => {
                                    const trainId = e.target.value;
                                    setSelectedTrain(trainId);
                                    await loadTrainFitness(trainId);
                                }}
                            >
                                {trains.map((t, idx) => (
                                    <option key={idx} value={t} className="bg-slate-800">
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Fitness Section (conditional) */}
                {showFitness && (
                    <div
                        className="backdrop-blur-md rounded-2xl p-6 border border-amber-500/30 shadow-2xl"
                        style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                    >
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
                                <div className="w-2 h-8 rounded-full bg-gradient-to-b from-amber-400 to-orange-400"></div>
                                {t("fitness.title")}
                                <span className="px-3 py-1 text-xs font-medium bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                                    {t("fitness.expiredBadge")}
                                </span>
                            </h2>

                            {/* Expired Certificates List with Toggle */}
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <h3 className="text-amber-300 font-semibold mb-3">{t("fitness.selectRenew")}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {expiredCertificates.map((cert, idx) => {
                                        const certDetail = certificateDetails[cert];
                                        const isSelected = form.fitness_certificates?.[`renew_${cert}` as keyof typeof form.fitness_certificates] || false;

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                                    ? 'bg-green-500/10 border-green-500/50'
                                                    : 'bg-amber-500/10 border-amber-500/30'
                                                    }`}
                                                onClick={() => handleCertificateToggle(cert)}
                                            >
                                                <div>
                                                    <div className={`font-medium capitalize ${isSelected ? 'text-green-200' : 'text-amber-200'
                                                        }`}>
                                                        {cert.replace('_', ' ')}
                                                    </div>
                                                    <div className={`text-sm ${isSelected ? 'text-green-300/80' : 'text-amber-300/80'
                                                        }`}>
                                                        {t("fitness.expired")}: {certDetail?.expiry_date}
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                                    ? 'bg-green-500 border-green-400'
                                                    : 'bg-transparent border-amber-400'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-amber-300/80 text-sm mt-3">
                                    {t("fitness.instruction")}
                                </p>
                            </div>

                            {/* Renewal Form - Only show if certificates are selected */}
                            {expiredCertificates.some(cert =>
                                form.fitness_certificates?.[`renew_${cert}` as keyof typeof form.fitness_certificates]
                            ) && (
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-green-300">{t("fitness.renewalDates")}</h4>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-300">
                                                    {t("fitness.issueDate")}
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={form.fitness_certificates?.issued_at || ""}
                                                    onChange={(e) =>
                                                        handleChange("fitness_certificates", "issued_at", e.target.value)
                                                    }
                                                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-green-400/50 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 outline-none backdrop-blur-sm"
                                                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-300">
                                                    {t("fitness.validUntil")}
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={form.fitness_certificates?.valid_until || ""}
                                                    onChange={(e) =>
                                                        handleChange("fitness_certificates", "valid_until", e.target.value)
                                                    }
                                                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-green-400/50 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 outline-none backdrop-blur-sm"
                                                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Selected for Renewal Summary */}
                                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                            <div className="text-green-300 text-sm">
                                                <strong>{t("fitness.selectedSummary")}</strong>{" "}
                                                {expiredCertificates
                                                    .filter(cert => form.fitness_certificates?.[`renew_${cert}` as keyof typeof form.fitness_certificates])
                                                    .map(cert => cert.replace('_', ' '))
                                                    .join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {/* Optional Add Branding Section */}
                <div
                    className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
                                <div className="w-2 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400"></div>
                                {t("branding.title")}
                            </h2>
                            <button
                                onClick={() => setShowAddBranding((s) => !s)}
                                className="px-4 py-2 text-slate-50 rounded-xl border border-slate-600/50"
                                style={{
                                    background: showAddBranding
                                        ? "rgba(56, 189, 248, 0.2)"
                                        : "rgba(56, 189, 248, 0.1)",
                                }}
                            >
                                {showAddBranding ? t("branding.cancelButton") : t("branding.addButton")}
                            </button>
                        </div>
                        {showAddBranding && (
                            <div className="space-y-6">
                                <div className="grid md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">
                                            {t("branding.advertiser")}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={t("branding.advertiserPlaceholder")}
                                            value={brandingDraft.advertiser}
                                            onChange={(e) =>
                                                setBrandingDraft((d) => ({
                                                    ...d,
                                                    advertiser: e.target.value,
                                                }))
                                            }
                                            className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                                            style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">
                                            {t("branding.priority")}
                                        </label>
                                        <select
                                            value={brandingDraft.priority}
                                            onChange={(e) =>
                                                setBrandingDraft((d) => ({
                                                    ...d,
                                                    priority: e.target.value,
                                                }))
                                            }
                                            className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                                            style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                        >
                                            <option value="" className="bg-slate-800">
                                                {t("branding.selectPriority")}
                                            </option>
                                            <option value="high" className="bg-slate-800">
                                                High
                                            </option>
                                            <option value="medium" className="bg-slate-800">
                                                Medium
                                            </option>
                                            <option value="low" className="bg-slate-800">
                                                Low
                                            </option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">
                                            {t("branding.exposure")}
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={brandingDraft.exposure_hours_needed}
                                            onChange={(e) =>
                                                setBrandingDraft((d) => ({
                                                    ...d,
                                                    exposure_hours_needed: Number(e.target.value),
                                                }))
                                            }
                                            className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                                            style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">
                                            Preferred Timing
                                        </label>
                                        <select
                                            value={brandingDraft.preferred_timing}
                                            onChange={(e) =>
                                                setBrandingDraft((d) => ({
                                                    ...d,
                                                    preferred_timing: e.target.value,
                                                }))
                                            }
                                            className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                                            style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                                        >
                                            <option value="" className="bg-slate-800">
                                                Any Time
                                            </option>
                                            <option value="office_hours" className="bg-slate-800">
                                                Office Hours (09:00 - 17:00)
                                            </option>
                                            <option value="school_hours" className="bg-slate-800">
                                                School Hours (8:00 - 14:00)
                                            </option>
                                            <option value="morning_peak" className="bg-slate-800">
                                                Morning Peak
                                            </option>
                                            <option value="evening_peak" className="bg-slate-800">
                                                Evening Peak
                                            </option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            if (brandingDraft.advertiser) {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    brandings: [...(prev.brandings || []), brandingDraft],
                                                }));
                                                setBrandingDraft({
                                                    advertiser: "",
                                                    priority: "",
                                                    exposure_hours_needed: 0,
                                                    preferred_timing: "",
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 text-slate-50 rounded-xl border border-transparent"
                                        style={{ background: "rgba(56, 189, 248, 0.2)" }}
                                    >
                                        {t("branding.addToList")}
                                    </button>
                                </div>
                                {form.brandings && form.brandings.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-slate-200 font-semibold">
                                            {t("branding.queued")}
                                        </h3>
                                        <ul className="space-y-2">
                                            {form.brandings.map((b, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-600/50 text-slate-200"
                                                >
                                                    <span>
                                                        {b.advertiser} • {b.priority} •{" "}
                                                        {b.exposure_hours_needed}h
                                                        {b.preferred_timing ? ` • ${b.preferred_timing}` : ""}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                brandings: (prev.brandings || []).filter(
                                                                    (_, i) => i !== idx
                                                                ),
                                                            }))
                                                        }
                                                        className="px-3 py-1 text-sm rounded border border-red-500/40 text-red-300"
                                                    >
                                                        {t("branding.remove")}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-8">
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-400/20 backdrop-blur-sm"
                        style={{
                            background: "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                            boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
                        }}
                    >
                        {t("buttons.save")}
                    </button>

                    <button
                        onClick={() => router.push("/layer1")}
                        className="px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/20 backdrop-blur-sm"
                        style={{
                            background: "linear-gradient(135deg, #06d6a0 0%, #38bdf8 100%)",
                            boxShadow: "0 10px 25px -5px rgba(6, 214, 160, 0.3)",
                        }}
                    >
                        {t("buttons.runAnalysis")}
                    </button>
                </div>
            </div>
        </div>
    );
}
