"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import axios from "axios";
import { useRouter } from "next/navigation";

type FitnessCertificate = {
  department: string;
  issue_date: string;
  expiry_date: string;
  status: "valid" | "expired";
};

type FitnessCertificates = {
  rolling_stock?: FitnessCertificate;
  signalling?: FitnessCertificate;
  telecom?: FitnessCertificate;
};

type JobCard = {
  id: string;
  description: string;
  open_date: string;
  criticality: "low" | "medium" | "high" | "critical";
  estimated_hours: number;
};

type BrandingContract = {
  brand: string;
  total_exposure_hours: number;
  completed_hours: number;
  deadline: string;
  priority: number;
  audience_profile: string;
  preferred_times: string;
};

type Mileage = {
  bogie: number;
  brake_pad: number;
  hvac: number;
};

type Train = {
  id: string;
  fitness_certificates: FitnessCertificates;
  job_cards: JobCard[];
  branding_contracts: BrandingContract[];
  current_mileage: Mileage;
  maintenance_thresholds: Mileage;
  last_deep_cleaning: string;
  cleaning_duration: number;
  status: "out_for_duty" | "parking" | "maintenance";
  current_position: string | null;
};

const translations = {
  en: {
    title: "MetroMind — Fleet Management",
    description: "MetroMind fleet management dashboard",
    exportCSV: "Export CSV",
    nightlyUpdate: "Nightly Update",
    headerTitle: "Fleet Management Dashboard",
    headerSubtitle: "Real-time monitoring and control of metro operations",
    totalTrains: "Total Trains",
    highPriority: "High Priority",
    mediumPriority: "Medium Priority",
    lowPriority: "Low Priority",
    onDuty: "On Duty",
    maintenance: "Maintenance",
    parkingLabel: "Parking",
    searchPlaceholder: "Search by Train ID or Brand...",
    allPriorities: "All Priorities",
    allStatus: "All Status",
    allConditions: "All Conditions",
    valid: "Valid",
    expiringSoon: "Expiring Soon",
    expired: "Expired",
    statusLabel: "Status",
    positionLabel: "Position",
    mileageLabel: "Mileage",
    jobCardsLabel: "Job Cards",
    brandingLabel: "Branding",
    detailedInfo: "Detailed Information",
    generalInfo: "🚇 General Information",
    trainID: "Train ID",
    priorityLevel: "Priority Level",
    fitnessCertificates: "📋 Fitness Certificates",
    overallCondition: "Overall Condition",
    mileageInfo: "🔧 Component Mileage",
    currentMileage: "Current Mileage",
    maintenanceThreshold: "Maintenance Threshold",
    mileagePercent: "Usage %",
    cleaningInfo: "🧹 Cleaning & Maintenance",
    lastDeepCleaned: "Last Deep Cleaned",
    cleaningDuration: "Cleaning Duration",
    daysSinceClean: "Days Since Clean",
    jobCardsInfo: "📋 Job Cards",
    noActiveJobCards: "No active job cards",
    jobDescription: "Description",
    criticality: "Criticality",
    estimatedHours: "Est. Hours",
    openDate: "Open Date",
    brandingContracts: "🎨 Branding Contracts",
    noBrandingContracts: "No active branding contracts",
    brand: "Brand",
    completionProgress: "Completion",
    totalHours: "Total Hours",
    completedHours: "Completed Hours",
    deadline: "Deadline",
    daysLeft: "Days Left",
    preferredTimes: "Preferred Times",
    audienceProfile: "Audience Profile",
    officeWorkers: "Office Workers",
    students: "Students",
    shoppers: "Shoppers",
    loading: "Loading MetroMind...",
    loadingSubtitle: "Please wait while we load your fleet data",
    dataLoadingError: "Data Loading Error",
    retry: "Retry"
  },
  ml: {
    title: "മെട്രോമൈൻഡ് — ഫ്ലീറ്റ് മാനേജ്മെന്റ്",
    description: "മെട്രോമൈൻഡ് ഫ്ലീറ്റ് മാനേജ്മെന്റ് ഡാഷ്ബോർഡ്",
    exportCSV: "CSV എക്സ്പോർട്ട്",
    nightlyUpdate: "നൈറ്റ്ലി അപ്ഡേറ്റ്",
    headerTitle: "ഫ്ലീറ്റ് മാനേജ്മെന്റ് ഡാഷ്ബോർഡ്",
    headerSubtitle: "മെട്രോ പ്രവർത്തനങ്ങളുടെ റിയൽ-ടൈം മോണിറ്ററിംഗും നിയന്ത്രണവും",
    totalTrains: "ആകെ ട്രെയിനുകൾ",
    highPriority: "ഉയർന്ന പ്രാധാന്യം",
    mediumPriority: "ഇടത്തരം പ്രാധാന്യം",
    lowPriority: "കുറഞ്ഞ പ്രാധാന്യം",
    onDuty: "ഡ്യൂട്ടിയിൽ",
    maintenance: "പരിപാലനം",
    parkingLabel: "പാർക്കിംഗ്",
    searchPlaceholder: "ട്രെയിൻ ഐഡി അല്ലെങ്കിൽ ബ്രാൻഡ് പ്രകാരം തിരയുക...",
    allPriorities: "എല്ലാ പ്രാധാന്യങ്ങളും",
    allStatus: "എല്ലാ സ്ഥിതികളും",
    allConditions: "എല്ലാ അവസ്ഥകളും",
    valid: "സാധുവായത്",
    expiringSoon: "ഉടൻ കാലഹരണപ്പെടുന്നു",
    expired: "കാലഹരണപ്പെട്ടത്",
    statusLabel: "സ്ഥിതി",
    positionLabel: "സ്ഥാനം",
    mileageLabel: "മൈലേജ്",
    jobCardsLabel: "ജോബ് കാർഡുകൾ",
    brandingLabel: "ബ്രാൻഡിംഗ്",
    detailedInfo: "വിശദമായ വിവരങ്ങൾ",
    generalInfo: "🚇 പൊതുവായ വിവരങ്ങൾ",
    trainID: "ട്രെയിൻ ഐഡി",
    priorityLevel: "പ്രാധാന്യ നില",
    fitnessCertificates: "📋 ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റുകൾ",
    overallCondition: "മൊത്തം അവസ്ഥ",
    mileageInfo: "🔧 ഘടക മൈലേജ്",
    currentMileage: "നിലവിലെ മൈലേജ്",
    maintenanceThreshold: "പരിപാലന പരിധി",
    mileagePercent: "ഉപയോഗം %",
    cleaningInfo: "🧹 ക്ലീനിംഗ് & പരിപാലനം",
    lastDeepCleaned: "അവസാനമായി ഡീപ് ക്ലീൻ ചെയ്തത്",
    cleaningDuration: "ക്ലീനിംഗ് കാലതളി",
    daysSinceClean: "ക്ലീൻ ചെയ്തതിനുശേഷമുള്ള ദിവസങ്ങൾ",
    jobCardsInfo: "📋 ജോബ് കാർഡുകൾ",
    noActiveJobCards: "സജീവ ജോബ് കാർഡുകളില്ല",
    jobDescription: "വിവരണം",
    criticality: "ഗുരുത്വം",
    estimatedHours: "കണക്കായ മണിക്കൂറുകൾ",
    openDate: "തുറന്ന തീയതി",
    brandingContracts: "🎨 ബ്രാൻഡിംഗ് കരാറുകൾ",
    noBrandingContracts: "സജീവ ബ്രാൻഡിംഗ് കരാറുകളില്ല",
    brand: "ബ്രാൻഡ്",
    completionProgress: "സമാപ്തി",
    totalHours: "ആകെ മണിക്കൂറുകൾ",
    completedHours: "പൂർത്തിയായ മണിക്കൂറുകൾ",
    deadline: "കാലമിതി",
    daysLeft: "ശേഷിക്കുന്ന ദിവസങ്ങൾ",
    preferredTimes: "പ്രിയപ്പെട്ട സമയങ്ങൾ",
    audienceProfile: "കേൾവി പ്രൊഫൈൽ",
    officeWorkers: "ഓഫീസ് തൊഴിലാളികൾ",
    students: "വിദ്യാർത്ഥികൾ",
    shoppers: "ഷോപ്പർമാർ",
    loading: "മെട്രോമൈൻഡ് ലോഡ് ചെയ്യുന്നു...",
    loadingSubtitle: "നിങ്ങളുടെ ഫ്ലീറ്റ് ഡാറ്റ ലോഡ് ചെയ്യുന്നതിനിടയിൽ ദയവായി കാത്തിരിക്കുക",
    dataLoadingError: "ഡാറ്റ ലോഡിംഗ് പിശക്",
    retry: "വീണ്ടും ശ്രമിക്കുക"
  }
};

function daysBetween(dateA: Date, dateB: Date): number {
  return Math.floor((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MetroMindPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ml">("en");
  const [trains, setTrains] = useState<Train[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];
  const currentDate = useMemo(() => new Date(), []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          "http://localhost:5005/api/nightly/unified-data"
        );

        let trainsData = response.data.trains || [];
        setTrains(trainsData);
        setError(null);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(
          "Failed to load train data from backend. Please check if the server is running."
        );
        setTrains([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const calculatePriority = (train: Train): "high" | "medium" | "low" => {
    let priority: "high" | "medium" | "low" = "low";

    // Check fitness certificate status
    const expiredCerts = Object.values(train.fitness_certificates).filter(
      (cert) => cert && cert.status === "expired"
    ).length > 0;

    // Check for critical or high priority job cards
    const hasCriticalJobs = train.job_cards.some(
      (job) => job.criticality === "critical"
    );
    const hasHighJobs = train.job_cards.some((job) => job.criticality === "high");

    // Check mileage thresholds
    const mileageExceeded = Object.keys(train.current_mileage).some((key) => {
      const current = train.current_mileage[key as keyof Mileage];
      const threshold = train.maintenance_thresholds[key as keyof Mileage];
      return current >= threshold * 0.9;
    });

    // Check cleaning (more than 14 days)
    const daysSinceClean = daysBetween(currentDate, new Date(train.last_deep_cleaning));

    if (expiredCerts || hasCriticalJobs || daysSinceClean > 14 || mileageExceeded) {
      priority = "high";
    } else if (hasHighJobs || daysSinceClean > 7) {
      priority = "medium";
    }

    return priority;
  };

  const getConditionStatus = (
    train: Train
  ): "expired" | "expiring" | "valid" => {
    const expiredCerts = Object.values(train.fitness_certificates).filter(
      (cert) => cert && cert.status === "expired"
    ).length;

    if (expiredCerts > 0) return "expired";

    const expiringCerts = Object.values(train.fitness_certificates).filter(
      (cert) => {
        if (!cert) return false;
        const expiryDate = new Date(cert.expiry_date);
        const daysToExpiry = daysBetween(expiryDate, currentDate);
        return daysToExpiry < 30 && daysToExpiry > 0;
      }
    ).length;

    if (expiringCerts > 0) return "expiring";
    return "valid";
  };

  const filteredTrains = useMemo(() => {
    return trains.filter((train) => {
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        train.id.toLowerCase().includes(searchLower) ||
        train.branding_contracts.some((brand) =>
          brand.brand.toLowerCase().includes(searchLower)
        );

      const priority = calculatePriority(train);
      const matchesPriority = !priorityFilter || priority === priorityFilter;

      const matchesStatus = !statusFilter || train.status === statusFilter;

      const condition = getConditionStatus(train);
      const matchesCondition = !conditionFilter || condition === conditionFilter;

      return matchesSearch && matchesPriority && matchesStatus && matchesCondition;
    });
  }, [trains, searchTerm, priorityFilter, statusFilter, conditionFilter]);

  const stats = useMemo(() => {
    let high = 0,
      medium = 0,
      low = 0;
    let onDuty = 0,
      maintenanceCount = 0,
      parkingCount = 0;

    trains.forEach((train) => {
      const priority = calculatePriority(train);
      if (priority === "high") high++;
      else if (priority === "medium") medium++;
      else low++;

      if (train.status === "out_for_duty") onDuty++;
      else if (train.status === "maintenance") maintenanceCount++;
      else if (train.status === "parking") parkingCount++;
    });

    return {
      total: trains.length,
      high,
      medium,
      low,
      onDuty,
      maintenance: maintenanceCount,
      parking: parkingCount,
    };
  }, [trains]);

  const openModal = (train: Train) => {
    setSelectedTrain(train);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedTrain(null);
  };

  const generateCSVContent = (data: Train[]): string => {
    const headers = [
      "Train ID",
      "Priority",
      "Status",
      "Position",
      "Job Cards",
      "Critical Jobs",
      "Condition",
      "Days Since Clean",
      "Bogie Mileage %",
      "Branding Contracts",
    ];

    const lines = [headers.join(",")];

    data.forEach((train) => {
      const priority = calculatePriority(train);
      const condition = getConditionStatus(train);
      const daysSinceClean = daysBetween(
        currentDate,
        new Date(train.last_deep_cleaning)
      );
      const bogieMileagePercent = Math.round(
        (train.current_mileage.bogie / train.maintenance_thresholds.bogie) * 100
      );
      const criticalJobs = train.job_cards.filter(
        (job) => job.criticality === "critical"
      ).length;
      const brands = train.branding_contracts.map((b) => b.brand).join("|");

      const row = [
        train.id,
        priority,
        train.status,
        train.current_position || "N/A",
        train.job_cards.length,
        criticalJobs,
        condition,
        daysSinceClean,
        bogieMileagePercent,
        brands,
      ];
      lines.push(row.join(","));
    });

    return lines.join("\n");
  };

  const exportReport = () => {
    const content = generateCSVContent(trains);
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metro_fleet_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold mt-4">{t.loading}</div>
          <div className="text-slate-300 mt-2">{t.loadingSubtitle}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-xl font-bold mb-2">{t.dataLoadingError}</div>
          <div className="text-slate-300 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-50">
      <Head>
        <title>{t.title}</title>
        <meta name="description" content={t.description} />
      </Head>

      <nav className="sticky top-0 z-50 bg-slate-900/70 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400">
              MetroMind
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "en" ? "ml" : "en")}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-purple-400 to-pink-400 text-slate-900 shadow-md"
            >
              {lang === "en" ? "മലയാളം" : "English"}
            </button>
            <button
              onClick={exportReport}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-900 shadow-md"
            >
              {t.exportCSV}
            </button>
            <button
              onClick={() => router.push("/nightly")}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 shadow-md"
            >
              {t.nightlyUpdate}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400">
            {t.headerTitle}
          </h2>
          <p className="text-slate-300 mt-2">{t.headerSubtitle}</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 z-0 bg-sky-500/10"></div>
            <div className="text-3xl font-bold z-10 relative">{stats.total}</div>
            <div className="text-slate-300 text-sm z-10 relative">{t.totalTrains}</div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 z-0 bg-rose-500/10"></div>
            <div className="text-3xl font-bold text-rose-400 z-10 relative">{stats.high}</div>
            <div className="text-slate-300 text-sm z-10 relative">{t.highPriority}</div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 z-0 bg-amber-500/10"></div>
            <div className="text-3xl font-bold text-amber-400 z-10 relative">{stats.medium}</div>
            <div className="text-slate-300 text-sm z-10 relative">{t.mediumPriority}</div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 z-0 bg-emerald-500/10"></div>
            <div className="text-3xl font-bold text-emerald-400 z-10 relative">{stats.onDuty}</div>
            <div className="text-slate-300 text-sm z-10 relative">{t.onDuty}</div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 z-0 bg-orange-500/10"></div>
            <div className="text-3xl font-bold text-orange-400 z-10 relative">{stats.maintenance}</div>
            <div className="text-slate-300 text-sm z-10 relative">{t.maintenance}</div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 z-0 bg-blue-500/10"></div>
            <div className="text-3xl font-bold text-blue-400 z-10 relative">{stats.parking}</div>
            <div className="text-slate-300 text-sm z-10 relative">{t.parkingLabel}</div>
          </div>
        </section>

        <section className="flex flex-wrap gap-3 items-center mb-6">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-md bg-slate-800/60 border border-slate-700 placeholder-slate-400 text-slate-50"
            placeholder={t.searchPlaceholder}
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700 text-slate-50"
          >
            <option value="">{t.allPriorities}</option>
            <option value="high">{t.highPriority}</option>
            <option value="medium">{t.mediumPriority}</option>
            <option value="low">{t.lowPriority}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700 text-slate-50"
          >
            <option value="">{t.allStatus}</option>
            <option value="out_for_duty">{t.onDuty}</option>
            <option value="maintenance">{t.maintenance}</option>
            <option value="parking">{t.parkingLabel}</option>
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700 text-slate-50"
          >
            <option value="">{t.allConditions}</option>
            <option value="valid">{t.valid}</option>
            <option value="expiring">{t.expiringSoon}</option>
            <option value="expired">{t.expired}</option>
          </select>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTrains.map((train) => {
            const priority = calculatePriority(train);
            const condition = getConditionStatus(train);
            const daysSinceClean = daysBetween(
              currentDate,
              new Date(train.last_deep_cleaning)
            );

            return (
              <article
                key={train.id}
                onClick={() => openModal(train)}
                className="cursor-pointer bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 transform transition-all duration-300 hover:scale-[1.02] hover:translate-y-[-4px] shadow-lg hover:shadow-cyan-500/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold truncate">{train.id}</div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase whitespace-nowrap ${priority === "high"
                        ? "text-rose-500 border border-rose-500/30 bg-rose-500/5"
                        : priority === "medium"
                          ? "text-amber-400 border border-amber-400/30 bg-amber-400/5"
                          : "text-emerald-400 border border-emerald-400/30 bg-emerald-400/5"
                      }`}
                  >
                    {priority}
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.statusLabel}:</span>
                    <span className="font-medium capitalize">
                      {train.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.positionLabel}:</span>
                    <span className="font-medium">
                      {train.current_position || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.mileageLabel}:</span>
                    <span className="font-medium">
                      {Math.round(
                        (train.current_mileage.bogie /
                          train.maintenance_thresholds.bogie) *
                        100
                      )}
                      %
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.jobCardsLabel}:</span>
                    <span className="font-medium">{train.job_cards.length}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.cleaningInfo}:</span>
                    <span className="font-medium">{daysSinceClean}d ago</span>
                  </div>

                  {train.branding_contracts.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.brandingLabel}:</span>
                      <span className="font-medium">
                        {train.branding_contracts[0].brand}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {modalOpen && selectedTrain && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/60 overflow-y-auto"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 border border-slate-700 rounded-xl p-6 mt-20 mb-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {selectedTrain.id} - {t.detailedInfo}
                </h3>
                <button onClick={closeModal} className="text-2xl leading-none">
                  &times;
                </button>
              </div>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">{t.generalInfo}</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.trainID}</span>
                      <span className="font-medium">{selectedTrain.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.priorityLevel}</span>
                      <span className="font-medium uppercase">
                        {calculatePriority(selectedTrain)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.statusLabel}</span>
                      <span className="font-medium capitalize">
                        {selectedTrain.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.positionLabel}</span>
                      <span className="font-medium">
                        {selectedTrain.current_position || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.fitnessCertificates}
                  </h4>
                  <div className="text-sm space-y-2">
                    {selectedTrain.fitness_certificates.rolling_stock && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Rolling Stock</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {selectedTrain.fitness_certificates.rolling_stock.expiry_date}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${selectedTrain.fitness_certificates.rolling_stock
                                .status === "valid"
                                ? "bg-emerald-400"
                                : "bg-rose-400"
                              }`}
                          ></span>
                        </div>
                      </div>
                    )}
                    {selectedTrain.fitness_certificates.signalling && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Signalling</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {selectedTrain.fitness_certificates.signalling.expiry_date}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${selectedTrain.fitness_certificates.signalling
                                .status === "valid"
                                ? "bg-emerald-400"
                                : "bg-rose-400"
                              }`}
                          ></span>
                        </div>
                      </div>
                    )}
                    {selectedTrain.fitness_certificates.telecom && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Telecom</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {selectedTrain.fitness_certificates.telecom.expiry_date}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${selectedTrain.fitness_certificates.telecom.status ===
                                "valid"
                                ? "bg-emerald-400"
                                : "bg-rose-400"
                              }`}
                          ></span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between mt-2">
                      <span className="text-slate-400">{t.overallCondition}</span>
                      <span className="font-medium uppercase">
                        {getConditionStatus(selectedTrain)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">{t.mileageInfo}</h4>
                  <div className="text-sm space-y-2">
                    {["bogie", "brake_pad", "hvac"].map((component) => {
                      const current =
                        selectedTrain.current_mileage[
                        component as keyof Mileage
                        ];
                      const threshold =
                        selectedTrain.maintenance_thresholds[
                        component as keyof Mileage
                        ];
                      const percentage = Math.round((current / threshold) * 100);
                      const isWarning = percentage >= 80;
                      const isCritical = percentage >= 95;

                      return (
                        <div key={component}>
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-400 capitalize">
                              {component.replace("_", " ")}
                            </span>
                            <span
                              className={`font-medium ${isCritical
                                  ? "text-rose-400"
                                  : isWarning
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }`}
                            >
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${isCritical
                                  ? "bg-rose-500"
                                  : isWarning
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {current.toFixed(0)} / {threshold.toFixed(0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">{t.cleaningInfo}</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.lastDeepCleaned}
                      </span>
                      <span className="font-medium">
                        {selectedTrain.last_deep_cleaning}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.daysSinceClean}</span>
                      <span className="font-medium">
                        {daysBetween(
                          currentDate,
                          new Date(selectedTrain.last_deep_cleaning)
                        )}{" "}
                        days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.cleaningDuration}
                      </span>
                      <span className="font-medium">
                        {selectedTrain.cleaning_duration} hours
                      </span>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.jobCardsInfo} ({selectedTrain.job_cards.length})
                  </h4>
                  {selectedTrain.job_cards.length === 0 ? (
                    <div className="text-sm text-slate-400">
                      {t.noActiveJobCards}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTrain.job_cards.map((job) => (
                        <div
                          key={job.id}
                          className="bg-slate-700/30 p-3 rounded border border-slate-600"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{job.id}</div>
                            <div
                              className={`px-2 py-1 rounded text-xs font-semibold capitalize ${job.criticality === "critical"
                                  ? "bg-rose-500/20 text-rose-400"
                                  : job.criticality === "high"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : job.criticality === "medium"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-green-500/20 text-green-400"
                                }`}
                            >
                              {job.criticality}
                            </div>
                          </div>
                          <div className="text-sm text-slate-300 mb-2">
                            {job.description}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <div>
                              {t.openDate}: <span className="font-medium">{job.open_date}</span>
                            </div>
                            <div>
                              {t.estimatedHours}:{" "}
                              <span className="font-medium">
                                {job.estimated_hours.toFixed(1)}h
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2 space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.brandingContracts} ({selectedTrain.branding_contracts.length})
                  </h4>
                  {selectedTrain.branding_contracts.length === 0 ? (
                    <div className="text-sm text-slate-400">
                      {t.noBrandingContracts}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTrain.branding_contracts.map((contract, idx) => {
                        const daysLeft = daysBetween(
                          new Date(contract.deadline),
                          currentDate
                        );
                        const completionPercent = Math.round(
                          (contract.completed_hours / contract.total_exposure_hours) *
                          100
                        );

                        return (
                          <div
                            key={idx}
                            className="bg-slate-700/30 p-3 rounded border border-slate-600"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium">{contract.brand}</div>
                                <div className="text-xs text-slate-400">
                                  Priority: {contract.priority}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${daysLeft > 14
                                    ? "bg-green-500/20 text-green-400"
                                    : daysLeft > 7
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-rose-500/20 text-rose-400"
                                  }`}
                              >
                                {daysLeft}d left
                              </span>
                            </div>

                            <div className="mb-2">
                              <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>{t.completionProgress}</span>
                                <span>{completionPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-sky-500"
                                  style={{ width: `${completionPercent}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                              <div>
                                {t.completedHours}:{" "}
                                <span className="font-medium">
                                  {contract.completed_hours.toFixed(0)}
                                </span>
                              </div>
                              <div>
                                {t.totalHours}:{" "}
                                <span className="font-medium">
                                  {contract.total_exposure_hours.toFixed(0)}
                                </span>
                              </div>
                              <div>
                                {t.preferredTimes}:{" "}
                                <span className="font-medium">
                                  {contract.preferred_times}
                                </span>
                              </div>
                            </div>

                            {(() => {
                              try {
                                const ap = JSON.parse(contract.audience_profile);
                                return (
                                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-600">
                                    <div>
                                      {t.officeWorkers}:{" "}
                                      <span className="font-medium">
                                        {Math.round((ap.office || 0) * 100)}%
                                      </span>
                                    </div>
                                    <div>
                                      {t.students}:{" "}
                                      <span className="font-medium">
                                        {Math.round((ap.students || 0) * 100)}%
                                      </span>
                                    </div>
                                    <div>
                                      {t.shoppers}:{" "}
                                      <span className="font-medium">
                                        {Math.round((ap.shoppers || 0) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
