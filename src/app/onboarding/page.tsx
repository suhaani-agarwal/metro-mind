"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; 
import axios from "axios";

interface DepotMetadata {
  name: string;
  location: string;
  maintenance_bays: string;
  stabling_tracks: string;
  inspection_lines: string;
  washing_lines: string;
  max_capacity_trains: string;
  operational_hours: string;
}

interface FilesState {
  fitness: File | null;
  jobcards: File | null;
  branding: File | null;
  mileage: File | null;
  cleaning: File | null;
  stabling: File | null;
}

const fieldLabels: { [key: string]: string } = {
  name: "Depot Name",
  location: "Depot Location",
  maintenance_bays: "Number of Maintenance Bays",
  stabling_tracks: "Number of Stabling Tracks",
  inspection_lines: "Number of Inspection Lines",
  washing_lines: "Number of Washing Lines",
  max_capacity_trains: "Maximum Train Capacity",
  operational_hours: "Operational Hours",
};

const fileLabels: { [key: string]: { label: string; description: string } } = {
  fitness: {
    label: "Fitness Certificates",
    description: "Upload train fitness certificate data",
  },
  jobcards: {
    label: "Job Cards",
    description: "Upload maintenance job card records",
  },
  branding: {
    label: "Branding Data",
    description: "Upload train branding information",
  },
  mileage: {
    label: "Mileage Records",
    description: "Upload train mileage tracking data",
  },
  cleaning: {
    label: "Cleaning Schedules",
    description: "Upload cleaning operation schedules",
  },
  stabling: {
    label: "Stabling Information",
    description: "Upload train stabling arrangements",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [depot, setDepot] = useState<DepotMetadata>({
    name: "",
    location: "",
    maintenance_bays: "",
    stabling_tracks: "",
    inspection_lines: "",
    washing_lines: "",
    max_capacity_trains: "",
    operational_hours: "",
  });

  const [files, setFiles] = useState<FilesState>({
    fitness: null,
    jobcards: null,
    branding: null,
    mileage: null,
    cleaning: null,
    stabling: null,
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleDepotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDepot({ ...depot, [e.target.name]: e.target.value });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: keyof FilesState
  ) => {
    if (e.target.files) {
      setFiles({ ...files, [key]: e.target.files[0] });
    }
  };

  const isDepotValid = () =>
    Object.values(depot).every((value) => value.trim() !== "");

  const submitDepot = async () => {
    if (!isDepotValid()) return alert("Please fill in all depot fields.");

    setLoading(true);
    try {
      await axios.post("http://localhost:5005/api/onboarding/depot", depot);
      setStep(2);
    } catch (error) {
      console.error(error);
      alert("Failed to save depot metadata. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitFiles = async () => {
    const formData = new FormData();
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });

    if (Object.values(files).every((file) => file === null)) {
      return alert("Please upload at least one file.");
    }

    setLoading(true);
    try {
      await axios.post(
        "http://localhost:5005/api/onboarding/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return true; // Success
    } catch (error) {
      console.error(error);
      alert("File upload failed. Please try again.");
      return false; // Failure
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const success = await submitFiles(); // your upload function
      if (success) {
        router.push("/trains"); // redirect after success
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-50 mb-2 drop-shadow-lg">
            MetroMind Onboarding
          </h1>
          <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
          <p className="text-slate-300 mt-4">
            Configure your depot and upload initial data to get started
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                step >= 1
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-400"
                  : "border-slate-600 text-slate-400"
              }`}
            >
              <span className="font-semibold">1</span>
            </div>
            <div
              className={`w-16 h-1 rounded-full transition-all duration-300 ${
                step >= 2 ? "bg-emerald-400" : "bg-slate-600"
              }`}
            ></div>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                step >= 2
                  ? "border-sky-400 bg-sky-400/20 text-sky-400"
                  : "border-slate-600 text-slate-400"
              }`}
            >
              <span className="font-semibold">2</span>
            </div>
          </div>
        </div>

        {/* Step 1: Depot Metadata */}
        {step === 1 && (
          <div
            className="backdrop-blur-md rounded-2xl p-8 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-3 h-10 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400"></div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">
                    Depot Configuration
                  </h2>
                  <p className="text-slate-300 mt-1">
                    Enter your depot's basic information and operational
                    capacity
                  </p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-emerald-400 pl-4">
                  Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Depot Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={depot.name}
                      onChange={handleDepotChange}
                      placeholder="Enter depot name"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Depot Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={depot.location}
                      onChange={handleDepotChange}
                      placeholder="Enter depot location"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Infrastructure Capacity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-sky-400 pl-4">
                  Infrastructure Capacity
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Number of Maintenance Bays
                    </label>
                    <input
                      type="text"
                      name="maintenance_bays"
                      value={depot.maintenance_bays}
                      onChange={handleDepotChange}
                      placeholder="e.g., 6"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Number of Stabling Tracks
                    </label>
                    <input
                      type="text"
                      name="stabling_tracks"
                      value={depot.stabling_tracks}
                      onChange={handleDepotChange}
                      placeholder="e.g., 12"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Number of Inspection Lines
                    </label>
                    <input
                      type="text"
                      name="inspection_lines"
                      value={depot.inspection_lines}
                      onChange={handleDepotChange}
                      placeholder="e.g., 2"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Number of Washing Lines
                    </label>
                    <input
                      type="text"
                      name="washing_lines"
                      value={depot.washing_lines}
                      onChange={handleDepotChange}
                      placeholder="e.g., 3"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-sky-400/50 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Operational Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-amber-400 pl-4">
                  Operational Details
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Maximum Train Capacity
                    </label>
                    <input
                      type="text"
                      name="max_capacity_trains"
                      value={depot.max_capacity_trains}
                      onChange={handleDepotChange}
                      placeholder="e.g., 50"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-amber-400/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Operational Hours
                    </label>
                    <input
                      type="text"
                      name="operational_hours"
                      value={depot.operational_hours}
                      onChange={handleDepotChange}
                      placeholder="e.g., 24/7 or 06:00-22:00"
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-amber-400/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-8">
                <button
                  disabled={loading || !isDepotValid()}
                  onClick={submitDepot}
                  className={`px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/20 backdrop-blur-sm ${
                    loading || !isDepotValid()
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  style={{
                    background:
                      loading || !isDepotValid()
                        ? "rgba(100, 116, 139, 0.5)"
                        : "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                    boxShadow:
                      loading || !isDepotValid()
                        ? "none"
                        : "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
                  }}
                >
                  {loading ? "Saving..." : "Save Depot Metadata →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: File Upload */}
        {step === 2 && (
          <div
            className="backdrop-blur-md rounded-2xl p-8 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-3 h-10 rounded-full bg-gradient-to-b from-sky-400 to-blue-400"></div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">
                    Data Upload Center
                  </h2>
                  <p className="text-slate-300 mt-1">
                    Upload your existing data files to import into the system
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(fileLabels).map(
                  ([key, { label, description }]) => (
                    <div
                      key={key}
                      className="space-y-3 p-6 rounded-xl border border-slate-600/50 transition-all duration-300 hover:border-sky-400/50 backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    >
                      <div className="space-y-2">
                        <label className="block text-lg font-semibold text-slate-50">
                          {label}
                        </label>
                        <p className="text-sm text-slate-400">{description}</p>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept=".csv,.xlsx"
                          onChange={(e) =>
                            handleFileChange(e, key as keyof FilesState)
                          }
                          className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sky-400/20 file:text-sky-400 hover:file:bg-sky-400/30 file:transition-colors file:cursor-pointer cursor-pointer"
                        />
                        {files[key as keyof FilesState] && (
                          <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            <p className="text-sm text-emerald-300">
                              Selected: {files[key as keyof FilesState]?.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Upload Summary */}
              <div
                className="p-4 rounded-xl border border-slate-600/50 backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              >
                <h3 className="text-lg font-semibold text-slate-50 mb-2">
                  Upload Summary
                </h3>
                <p className="text-slate-300">
                  Files selected:{" "}
                  <span className="text-sky-400 font-medium">
                    {
                      Object.values(files).filter((file) => file !== null)
                        .length
                    }{" "}
                    of {Object.keys(files).length}
                  </span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Supported formats: CSV, Excel (.xlsx)
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-8">
                <button
                  disabled={loading}
                  onClick={handleSubmit}
                  className={`px-8 py-4 text-lg font-semibold text-slate-50 rounded-2xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-400/20 backdrop-blur-sm ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
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
                  {loading ? " Uploading..." : " Upload Files"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}