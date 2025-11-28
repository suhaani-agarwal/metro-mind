"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

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
  }>({ advertiser: "", priority: "", exposure_hours_needed: 0 });

  // Load trains and check fitness expiry
  useEffect(() => {
    axios.get("http://localhost:5005/api/nightly/trains").then(async (res) => {
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
        `http://localhost:5005/api/nightly/train/${trainId}/fitness`
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

  const handleChange = (section: string, field: string, value: any) => {
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
    try {
      // 1) Save depot deep cleaning labour
      await axios.post(
        "http://localhost:5005/api/nightly/depot/deep-cleaning",
        {
          manual_labour_available_today: Number(deepCleaningLabour) || 0,
        }
      );

      // 2) Append all queued branding entries
      if (form.brandings && form.brandings.length > 0) {
      for (const b of form.brandings) {
        if (!b.advertiser) continue;
        
        // Send to the correct endpoint with correct structure
        await axios.post("http://localhost:5005/api/nightly/branding/add", {
          train_id: selectedTrain,
          branding: {
            advertiser: b.advertiser,
            priority: b.priority,
            exposure_hours_needed: b.exposure_hours_needed
          }
        });
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
          await axios.post(
            "http://localhost:5005/api/nightly/update/train",
            payload
          );
        } else if (hasRenewalSelected && !hasValidDates) {
          // alert("Please provide both issue date and valid until date for certificate renewal.");
          return;
        }
        // If no renewal selected, skip fitness certificate update
      }

      // Reset forms
      setForm((prev) => ({ ...prev, brandings: [] }));
      setShowAddBranding(false);
      
      // Reload fitness data to reflect changes
      await loadTrainFitness(selectedTrain);
      
      // alert("Nightly data saved successfully!");
    } catch (err: any) {
      console.error(err);
      // alert(`Error saving nightly data: ${err.response?.data?.detail || err.message}`);
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
            Operational Log
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
              Depot Deep Cleaning Labour (Today)
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Manual Labour Available
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
              Train Selection
            </h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Select Train ID
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
                Fitness Certificate Renewal (Optional)
                <span className="px-3 py-1 text-xs font-medium bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  EXPIRED CERTIFICATES DETECTED
                </span>
              </h2>
              
              {/* Expired Certificates List with Toggle */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h3 className="text-amber-300 font-semibold mb-3">Select Certificates to Renew:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {expiredCertificates.map((cert, idx) => {
                    const certDetail = certificateDetails[cert];
                    const isSelected = form.fitness_certificates?.[`renew_${cert}` as keyof typeof form.fitness_certificates] || false;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-green-500/10 border-green-500/50' 
                            : 'bg-amber-500/10 border-amber-500/30'
                        }`}
                        onClick={() => handleCertificateToggle(cert)}
                      >
                        <div>
                          <div className={`font-medium capitalize ${
                            isSelected ? 'text-green-200' : 'text-amber-200'
                          }`}>
                            {cert.replace('_', ' ')}
                          </div>
                          <div className={`text-sm ${
                            isSelected ? 'text-green-300/80' : 'text-amber-300/80'
                          }`}>
                            Expired: {certDetail?.expiry_date}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
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
                  Select which certificates you want to renew and provide the new dates below.
                </p>
              </div>

              {/* Renewal Form - Only show if certificates are selected */}
              {expiredCertificates.some(cert => 
                form.fitness_certificates?.[`renew_${cert}` as keyof typeof form.fitness_certificates]
              ) && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-green-300">Renewal Dates</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        New Issue Date *
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
                        New Valid Until Date *
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
                      <strong>Selected for renewal:</strong>{" "}
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
                Branding
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
                {showAddBranding ? "Cancel" : "Add Branding Configuration"}
              </button>
            </div>
            {showAddBranding && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Advertiser Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter advertiser name"
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
                      Priority Level
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
                        Select Priority
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
                      Exposure Hours Needed
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
                        });
                      }
                    }}
                    className="px-4 py-2 text-slate-50 rounded-xl border border-transparent"
                    style={{ background: "rgba(56, 189, 248, 0.2)" }}
                  >
                    Add to List
                  </button>
                </div>
                {form.brandings && form.brandings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-slate-200 font-semibold">
                      Queued Brandings
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
                            Remove
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
            Save Nightly Data
          </button>

          <button
            onClick={() => router.push("/layer1")}
            className="px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/20 backdrop-blur-sm"
            style={{
              background: "linear-gradient(135deg, #06d6a0 0%, #38bdf8 100%)",
              boxShadow: "0 10px 25px -5px rgba(6, 214, 160, 0.3)",
            }}
          >
            Run Readiness Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
