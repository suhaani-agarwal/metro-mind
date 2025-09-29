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

const fileLabels = {
  fitness: {
    en: {
      label: "Fitness Certificates",
      description: "Upload train fitness certificate data",
    },
    ml: {
      label: "ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റുകൾ",
      description: "ട്രെയിൻ ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റ് ഡാറ്റ അപ്‌ലോഡ് ചെയ്യുക",
    },
  },
  jobcards: {
    en: {
      label: "Job Cards",
      description: "Upload maintenance job card records",
    },
    ml: {
      label: "ജോബ് കാർഡുകൾ",
      description: "മെന്റനൻസ് ജോബ് കാർഡ് രേഖകൾ അപ്‌ലോഡ് ചെയ്യുക",
    },
  },
  branding: {
    en: {
      label: "Branding Data",
      description: "Upload train branding information",
    },
    ml: {
      label: "ബ്രാൻഡിങ് ഡാറ്റ",
      description: "ട്രെയിൻ ബ്രാൻഡിങ് വിവരങ്ങൾ അപ്‌ലോഡ് ചെയ്യുക",
    },
  },
  mileage: {
    en: {
      label: "Mileage Records",
      description: "Upload train mileage tracking data",
    },
    ml: {
      label: "മൈലേജ് രേഖകൾ",
      description: "ട്രെയിൻ മൈലേജ് ട്രാക്കിംഗ് ഡാറ്റ അപ്‌ലോഡ് ചെയ്യുക",
    },
  },
  cleaning: {
    en: {
      label: "Cleaning Schedules",
      description: "Upload cleaning operation schedules",
    },
    ml: {
      label: "ക്ലീനിംഗ് ഷെഡ്യൂൾ",
      description: "ക്ലീനിംഗ് പ്രവർത്തന ഷെഡ്യൂൾ അപ്‌ലോഡ് ചെയ്യുക",
    },
  },
  stabling: {
    en: {
      label: "Stabling Information",
      description: "Upload train stabling arrangements",
    },
    ml: {
      label: "സ്റ്റാബ്ലിംഗ് വിവരങ്ങൾ",
      description: "ട്രെയിൻ സ്റ്റാബ്ലിംഗ് ക്രമീകരണങ്ങൾ അപ്‌ലോഡ് ചെയ്യുക",
    },
  },
};

const translations = {
  en: {
    headerTitle: "MetroMind Onboarding",
    headerSubtitle:
      "Configure your depot and upload initial data to get started",
    step1Title: "Depot Configuration",
    step1Description:
      "Enter your depot's basic information and operational capacity",
    basicInfo: "Basic Information",
    depotName: "Depot Name",
    depotLocation: "Depot Location",
    infrastructureCapacity: "Infrastructure Capacity",
    maintenanceBays: "Number of Maintenance Bays",
    stablingTracks: "Number of Stabling Tracks",
    inspectionLines: "Number of Inspection Lines",
    washingLines: "Number of Washing Lines",
    operationalDetails: "Operational Details",
    maxCapacity: "Maximum Train Capacity",
    operationalHours: "Operational Hours",
    saveDepot: "Save Depot Metadata →",
    step2Title: "Data Upload Center",
    step2Description:
      "Upload your existing data files to import into the system",
    uploadSummary: "Upload Summary",
    filesSelected: "Files selected",
    supportedFormats: "Supported formats: CSV, Excel (.xlsx)",
    uploadFiles: "Upload Files",
    saving: "Saving...",
    uploading: "Uploading...",
  },
  ml: {
    headerTitle: "മെട്രോമൈൻഡ് ഓൺബോർഡിങ്",
    headerSubtitle:
      "ആരമ്പിക്കാൻ നിങ്ങളുടെ ഡിപ്പോ സജ്ജമാക്കുകയും പ്രാഥമിക ഡാറ്റ അപ്‌ലോഡ് ചെയ്യുക",
    step1Title: "ഡിപ്പോ കോൺഫിഗറേഷൻ",
    step1Description:
      "നിങ്ങളുടെ ഡിപ്പോയുടെ അടിസ്ഥാന വിവരങ്ങളും പ്രവർത്തന ശേഷിയും നൽകുക",
    basicInfo: "അടിസ്ഥാന വിവരങ്ങൾ",
    depotName: "ഡിപ്പോ നാമം",
    depotLocation: "ഡിപ്പോ സ്ഥലം",
    infrastructureCapacity: "സൗകര്യ ശേഷി",
    maintenanceBays: "മെന്റനൻസ് ബേസുകളുടെ എണ്ണം",
    stablingTracks: "സ്റ്റാബ്ലിംഗ് ട്രാക്കുകളുടെ എണ്ണം",
    inspectionLines: "ഇൻസ്പക്ഷൻ ലൈനുകളുടെ എണ്ണം",
    washingLines: "വാഷിംഗ് ലൈനുകളുടെ എണ്ണം",
    operationalDetails: "ഓപ്പറേഷൻ വിശദാംശങ്ങൾ",
    maxCapacity: "പരമാവധി ട്രെയിൻ ശേഷി",
    operationalHours: "ഓപ്പറേഷൻ സമയങ്ങൾ",
    saveDepot: "ഡിപ്പോ മെറ്റാഡാറ്റ സേവ് ചെയ്യുക →",
    step2Title: "ഡാറ്റ അപ്‌ലോഡ് സെന്റർ",
    step2Description:
      "സിസ്റ്റത്തിലേക്ക് ഇറക്കുമതി ചെയ്യാൻ നിലവിലുള്ള ഡാറ്റ ഫയലുകൾ അപ്‌ലോഡ് ചെയ്യുക",
    uploadSummary: "അപ്‌ലോഡ് സംഗ്രഹം",
    filesSelected: "തിരഞ്ഞെടുത്ത ഫയലുകൾ",
    supportedFormats: "സപ്പോർട്ടുചെയ്യുന്ന ഫോർമാറ്റുകൾ: CSV, Excel (.xlsx)",
    uploadFiles: "ഫയലുകൾ അപ്‌ലോഡ് ചെയ്യുക",
    saving: "സേവ് ചെയ്യുന്നു...",
    uploading: "അപ്‌ലോഡ് ചെയ്യുന്നു...",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ml">("en");

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
    setLoading(true);
    try {
      await axios.post("http://localhost:5005/api/onboarding/depot", depot);
      setStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const submitFiles = async () => {
    const formData = new FormData();
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });

    setLoading(true);
    try {
      await axios.post(
        "http://localhost:5005/api/onboarding/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const success = await submitFiles();
      if (success) {
        router.push("/trains");
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const t = translations[lang];

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === "en" ? "ml" : "en")}
            className="px-4 py-2 rounded-lg bg-sky-400 text-slate-50 hover:bg-sky-500 transition"
          >
            {lang === "en" ? "മലയാളം" : "English"}
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-50 mb-2 drop-shadow-lg">
            {t.headerTitle}
          </h1>
          <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
          <p className="text-slate-300 mt-4">{t.headerSubtitle}</p>
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
                    {t.step1Title}
                  </h2>
                  <p className="text-slate-300 mt-1">{t.step1Description}</p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-emerald-400 pl-4">
                  {t.basicInfo}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      {t.depotName}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={depot.name}
                      onChange={handleDepotChange}
                      placeholder={t.depotName}
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      {t.depotLocation}
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={depot.location}
                      onChange={handleDepotChange}
                      placeholder={t.depotLocation}
                      className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Infrastructure Capacity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-sky-400 pl-4">
                  {t.infrastructureCapacity}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      {t.maintenanceBays}
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
                      {t.stablingTracks}
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
                      {t.inspectionLines}
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
                      {t.washingLines}
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
                  {t.operationalDetails}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      {t.maxCapacity}
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
                      {t.operationalHours}
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
                  {loading ? t.saving : t.saveDepot}
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
                    {t.step2Title}
                  </h2>
                  <p className="text-slate-300 mt-1">{t.step2Description}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(fileLabels).map(([key, labelData]) => (
                  <div
                    key={key}
                    className="space-y-3 p-6 rounded-xl border border-slate-600/50 transition-all duration-300 hover:border-sky-400/50 backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  >
                    <div className="space-y-2">
                      <label className="block text-lg font-semibold text-slate-50">
                        {labelData[lang].label}
                      </label>
                      <p className="text-sm text-slate-400">
                        {labelData[lang].description}
                      </p>
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
                ))}
              </div>

              {/* Upload Summary */}
              <div
                className="p-4 rounded-xl border border-slate-600/50 backdrop-blur-sm"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              >
                <h3 className="text-lg font-semibold text-slate-50 mb-2">
                  {t.uploadSummary}
                </h3>
                <p className="text-slate-300">
                  {t.filesSelected}:{" "}
                  <span className="text-sky-400 font-medium">
                    {
                      Object.values(files).filter((file) => file !== null)
                        .length
                    }{" "}
                    of {Object.keys(files).length}
                  </span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {t.supportedFormats}
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
                  {loading ? t.uploading : t.uploadFiles}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
