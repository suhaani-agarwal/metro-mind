"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface NightlyForm {
  fitness_certificates?: {
    issued_at: string;
    valid_until: string;
    status: string;
  };
  branding: {
    advertiser: string;
    priority: string;
    exposure_hours_needed: number;
  };
  cleaning: {
    status: string;
    type: string;
    scheduled_at: string;
    manual_labour_count: number;
    bay_assigned: string;
  };
  stabling: {
    bay: string;
    position: string;
    reception: boolean;
  };
}

export default function NightlyPage() {
  const [trains, setTrains] = useState<string[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string>("");
  const [showFitness, setShowFitness] = useState<boolean>(false);

  const [form, setForm] = useState<NightlyForm>({
    branding: { advertiser: "", priority: "", exposure_hours_needed: 0 },
    cleaning: { status: "", type: "", scheduled_at: "", manual_labour_count: 0, bay_assigned: "" },
    stabling: { bay: "", position: "", reception: false },
  });

  // Load trains and check fitness expiry
  useEffect(() => {
    axios.get("http://localhost:8000/api/nightly/trains").then(async (res) => {
      setTrains(res.data.trains);
      if (res.data.trains.length) {
        const trainId = res.data.trains[0];
        setSelectedTrain(trainId);

        // Fetch current fitness for first train
        const fitnessRes = await axios.get(
          `http://localhost:8000/api/nightly/train/${trainId}/fitness`
        );
        const { valid_until } = fitnessRes.data || {};
        if (valid_until && new Date(valid_until) < new Date()) {
          setShowFitness(true);
          // Initialize fitness form with current data
          setForm(prev => ({
            ...prev,
            fitness_certificates: {
              issued_at: fitnessRes.data?.issued_at || "",
              valid_until: fitnessRes.data?.valid_until || "",
              status: fitnessRes.data?.status || "valid"
            }
          }));
        }
      }
    });
  }, []);

  const handleChange = (section: string, field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof NightlyForm],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedTrain) return alert("Select a train first!");
    try {
      const payload = { train_id: selectedTrain, ...form };
      await axios.post(
        "http://localhost:8000/api/nightly/update/train",
        payload
      );
      alert(`Train ${selectedTrain} updated successfully ✅`);
    } catch (err) {
      console.error(err);
      alert("Failed to update train data");
    }
  };

  return (
    <div 
      className="min-h-screen w-full"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
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
              <label className="block text-sm font-medium text-slate-300">Select Train ID</label>
              <select
                className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                value={selectedTrain}
                onChange={async (e) => {
                  const trainId = e.target.value;
                  setSelectedTrain(trainId);

                  // Check fitness expiry when train changes
                  const fitnessRes = await axios.get(
                    `http://localhost:8000/api/nightly/train/${trainId}/fitness`
                  );
                  const { valid_until } = fitnessRes.data || {};
                  const isExpired = valid_until && new Date(valid_until) < new Date();
                  setShowFitness(isExpired);
                  
                  if (isExpired) {
                    // Initialize fitness form with current data
                    setForm(prev => ({
                      ...prev,
                      fitness_certificates: {
                        issued_at: fitnessRes.data?.issued_at || "",
                        valid_until: fitnessRes.data?.valid_until || "",
                        status: fitnessRes.data?.status || "valid"
                      }
                    }));
                  } else {
                    // Clear fitness form if not expired
                    setForm(prev => ({
                      ...prev,
                      fitness_certificates: undefined
                    }));
                  }
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
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-gradient-to-b from-amber-400 to-orange-400"></div>
                Fitness Certificate Renewal
                <span className="px-3 py-1 text-xs font-medium bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  EXPIRED
                </span>
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Issued At</label>
                  <input
                    type="datetime-local"
                    value={form.fitness_certificates?.issued_at || ""}
                    onChange={(e) =>
                      handleChange("fitness_certificates", "issued_at", e.target.value)
                    }
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-amber-400/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Valid Until</label>
                  <input
                    type="datetime-local"
                    value={form.fitness_certificates?.valid_until || ""}
                    onChange={(e) =>
                      handleChange("fitness_certificates", "valid_until", e.target.value)
                    }
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-amber-400/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Status</label>
                  <select
                    value={form.fitness_certificates?.status || "valid"}
                    onChange={(e) =>
                      handleChange("fitness_certificates", "status", e.target.value)
                    }
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-amber-400/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  >
                    <option value="valid" className="bg-slate-800">Valid</option>
                    <option value="expired" className="bg-slate-800">Expired</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Branding Section */}
        <div 
          className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400"></div>
              Branding Configuration
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Advertiser Name</label>
                <input
                  type="text"
                  placeholder="Enter advertiser name"
                  value={form.branding.advertiser}
                  onChange={(e) => handleChange("branding", "advertiser", e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Priority Level</label>
                <select
                  value={form.branding.priority}
                  onChange={(e) => handleChange("branding", "priority", e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                >
                  <option value="" className="bg-slate-800">Select Priority</option>
                  <option value="high" className="bg-slate-800">High</option>
                  <option value="medium" className="bg-slate-800">Medium</option>
                  <option value="low" className="bg-slate-800">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Exposure Hours Needed</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.branding.exposure_hours_needed}
                  onChange={(e) =>
                    handleChange(
                      "branding",
                      "exposure_hours_needed",
                      Number(e.target.value)
                    )
                  }
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cleaning Section */}
        <div 
          className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-sky-400 to-blue-400"></div>
              Cleaning Operations
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Cleaning Status</label>
                <select
                  value={form.cleaning.status}
                  onChange={(e) => handleChange("cleaning", "status", e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                >
                  <option value="" className="bg-slate-800">Select Status</option>
                  <option value="scheduled" className="bg-slate-800">Scheduled</option>
                  <option value="in_progress" className="bg-slate-800">In Progress</option>
                  <option value="completed" className="bg-slate-800">Completed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Cleaning Type</label>
                <select
                  value={form.cleaning.type}
                  onChange={(e) => handleChange("cleaning", "type", e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                >
                  <option value="" className="bg-slate-800">Select Cleaning Type</option>
                  <option value="interior" className="bg-slate-800">Interior</option>
                  <option value="exterior" className="bg-slate-800">Exterior</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={form.cleaning.scheduled_at}
                  onChange={(e) => handleChange("cleaning", "scheduled_at", e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Manual Labour Count</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.cleaning.manual_labour_count}
                  onChange={(e) =>
                    handleChange(
                      "cleaning",
                      "manual_labour_count",
                      Number(e.target.value)
                    )
                  }
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-slate-300">Bay Assigned</label>
                <input
                  type="text"
                  placeholder="Enter bay number"
                  value={form.cleaning.bay_assigned}
                  onChange={(e) => handleChange("cleaning", "bay_assigned", e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stabling Section */}
        <div 
          className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-pink-400 to-rose-400"></div>
              Stabling Information
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Bay Number</label>
                <input
                  type="text"
                  placeholder="Enter bay number"
                  value={form.stabling.bay}
                  disabled={form.stabling.reception}
                  onChange={(e) => handleChange("stabling", "bay", e.target.value)}
                  className={`w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 outline-none backdrop-blur-sm ${
                    form.stabling.reception 
                      ? 'opacity-50 cursor-not-allowed bg-slate-700/50' 
                      : 'hover:border-pink-400/50 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20'
                  }`}
                  style={{ backgroundColor: form.stabling.reception ? undefined : "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Position</label>
                <input
                  type="text"
                  placeholder="Enter position"
                  value={form.stabling.position}
                  onChange={(e) => handleChange("stabling", "position", e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-pink-400/50 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <label className="flex items-center space-x-3 p-4 rounded-xl border border-slate-600/50 transition-all duration-300 hover:border-pink-400/50 cursor-pointer backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}>
                  <input
                    type="checkbox"
                    checked={form.stabling.reception}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        stabling: {
                          ...prev.stabling,
                          reception: e.target.checked,
                          bay: e.target.checked ? "" : prev.stabling.bay, // clear bay if reception is checked
                        },
                      }))
                    }
                    className="w-5 h-5 rounded border-slate-400 text-pink-400 focus:ring-pink-400/20"
                  />
                  <span className="text-slate-300 font-medium">At Reception</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-8">
          <button
            onClick={handleSubmit}
            className="px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-400/20 backdrop-blur-sm"
            style={{
              background: "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
              boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.3)"
            }}
          >
            Save Nightly Data
          </button>
        </div>
      </div>
    </div>
  );
}