"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

interface AddTrainModalProps {
    onClose: () => void;
}

interface BrandingConfig {
    advertiser: string;
    sla_hours: number;
}

interface Depot {
    name: string;
    // Add other properties if your API returns more fields
    id?: number;
    location?: string;
}

export default function AddTrainModal({ onClose }: AddTrainModalProps) {
    const t = useTranslations("AddTrainModal");
    const [depots, setDepots] = useState<string[]>([]);
    const [trainNumber, setTrainNumber] = useState("");
    const [selectedDepot, setSelectedDepot] = useState("");

    // Certificates
    const [rollingStock, setRollingStock] = useState({ issue: "", expiry: "" });
    const [signalling, setSignalling] = useState({ issue: "", expiry: "" });
    const [telecom, setTelecom] = useState({ issue: "", expiry: "" });

    // Branding
    const [brandings, setBrandings] = useState<BrandingConfig[]>([]);
    const [showBrandingInput, setShowBrandingInput] = useState(false);
    const [newBranding, setNewBranding] = useState<BrandingConfig>({ advertiser: "", sla_hours: 0 });

    useEffect(() => {
        async function fetchDepots() {
            try {
                const res = await fetch(`${API_BASE}/api/onboarding/depot`);
                const data: Depot[] = await res.json();
                if (Array.isArray(data)) {
                    setDepots(data.map((d: Depot) => d.name));
                }
            } catch (err) {
                console.error("Failed to fetch depots", err);
            }
        }
        fetchDepots();
    }, []);

    const handleAddBranding = () => {
        if (newBranding.advertiser && newBranding.sla_hours > 0) {
            setBrandings([...brandings, newBranding]);
            setNewBranding({ advertiser: "", sla_hours: 0 });
            setShowBrandingInput(false);
        }
    };

    const handleRemoveBranding = (index: number) => {
        setBrandings(brandings.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !trainNumber ||
            !selectedDepot ||
            !rollingStock.issue || !rollingStock.expiry ||
            !signalling.issue || !signalling.expiry ||
            !telecom.issue || !telecom.expiry
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

                    {/* Train Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-sky-400 border-b border-slate-700 pb-2">
                            {t("trainDetails")}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("trainNumber")}</label>
                                <input
                                    type="text"
                                    value={trainNumber}
                                    onChange={(e) => setTrainNumber(e.target.value)}
                                    placeholder={t("trainNumberPlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>
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

                    {/* Fitness Certificates */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-emerald-400 border-b border-slate-700 pb-2">
                            {t("certificates")}
                        </h3>

                        {/* Rolling Stock */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">{t("rollingStock")}</label>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="date"
                                    value={rollingStock.issue}
                                    onChange={(e) => setRollingStock({ ...rollingStock, issue: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 outline-none"
                                />
                                <input
                                    type="date"
                                    value={rollingStock.expiry}
                                    onChange={(e) => setRollingStock({ ...rollingStock, expiry: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 outline-none"
                                />
                            </div>
                        </div>

                        {/* Signalling */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">{t("signalling")}</label>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="date"
                                    value={signalling.issue}
                                    onChange={(e) => setSignalling({ ...signalling, issue: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 outline-none"
                                />
                                <input
                                    type="date"
                                    value={signalling.expiry}
                                    onChange={(e) => setSignalling({ ...signalling, expiry: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 outline-none"
                                />
                            </div>
                        </div>

                        {/* Telecom */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">{t("telecom")}</label>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="date"
                                    value={telecom.issue}
                                    onChange={(e) => setTelecom({ ...telecom, issue: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 outline-none"
                                />
                                <input
                                    type="date"
                                    value={telecom.expiry}
                                    onChange={(e) => setTelecom({ ...telecom, expiry: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Branding (Optional) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                            <h3 className="text-lg font-semibold text-purple-400">{t("branding")}</h3>
                            <button
                                type="button"
                                onClick={() => setShowBrandingInput(!showBrandingInput)}
                                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                <Plus size={16} /> {t("addBranding")}
                            </button>
                        </div>

                        {showBrandingInput && (
                            <div className="p-4 bg-slate-800/50 rounded-xl space-y-3 border border-slate-700">
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder={t("advertiserPlaceholder")}
                                        value={newBranding.advertiser}
                                        onChange={(e) => setNewBranding({ ...newBranding, advertiser: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-600 text-slate-50 outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder={t("slaHoursPlaceholder")}
                                        value={newBranding.sla_hours || ""}
                                        onChange={(e) => setNewBranding({ ...newBranding, sla_hours: Number(e.target.value) })}
                                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-600 text-slate-50 outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddBranding}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
                                >
                                    {t("addBranding")}
                                </button>
                            </div>
                        )}

                        {brandings.length > 0 && (
                            <div className="space-y-2">
                                {brandings.map((b, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                                        <span className="text-slate-300">
                                            {b.advertiser} ({b.sla_hours}h)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveBranding(idx)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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