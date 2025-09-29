"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import axios from "axios";
import { useRouter } from "next/navigation";

type FitnessCertificates = {
  "Train ID": string;
  "Rolling Stock Valid": string;
  "Signalling Valid": string;
  "Telecom Valid": string;
};

type JobCard = {
  "Job ID": string;
  "Train ID": string;
  Status: string;
  Severity: string;
  Description: string;
  "Created At": string;
  "Expected Completion": string;
};

type Branding = {
  "Train ID": string;
  "Wrap ID": string;
  Advertiser: string;
  "Exposure Hours Today": number;
  "SLA Hours Month": number;
  "Preferred Times": string;
  "Audience Profile": string; // JSON string
};

type Mileage = {
  "Train ID": string;
  Date: string;
  "Km Travelled": number;
};

type Cleaning = {
  "Train ID": string;
  "Last Deep Cleaned Date": string;
};

type Stabling = {
  "Train ID": string;
  "Current Bay": number;
  Position: string;
  "Recommended Departure": string;
  Priority: number;
};

type Train = {
  train_id: string;
  date: string;
  fitness_certificates: FitnessCertificates;
  job_cards: JobCard[];
  branding: Branding;
  mileage: Mileage;
  cleaning: Cleaning;
  stabling: Stabling;
};

// Malayalam translations
const translations = {
  en: {
    // Navigation
    title: "MetroMind — Fleet Management",
    description: "MetroMind fleet management dashboard",
    exportCSV: "Export CSV",
    nightlyUpdate: "Nightly Update",
    
    // Header
    headerTitle: "Fleet Management Dashboard",
    headerSubtitle: "Real-time monitoring and control of metro operations",
    
    // Stats
    totalMetros: "Total Metros",
    highPriority: "High Priority",
    mediumPriority: "Medium Priority",
    lowPriority: "Low Priority",
    
    // Filters
    searchPlaceholder: "Search by Train ID or Advertiser...",
    allPriorities: "All Priorities",
    allFitnessStatus: "All Fitness Status",
    allBays: "All Bays",
    valid: "Valid",
    expiringSoon: "Expiring Soon",
    expired: "Expired",
    
    // Train Card
    bayPosition: "Bay & Position",
    fitness: "Fitness",
    mileage: "Mileage",
    jobCards: "Job Cards",
    wrapID: "Wrap ID",
    
    // Modal
    detailedInfo: "Detailed Information",
    generalInfo: "🚇 General Information",
    trainID: "Train ID",
    priorityLevel: "Priority Level",
    currentDate: "Current Date",
    fitnessCertificates: "📋 Fitness Certificates",
    rollingStockValid: "Rolling Stock Valid Until",
    signallingValid: "Signalling Valid Until",
    telecomValid: "Telecom Valid Until",
    overallStatus: "Overall Status",
    mileageInfo: "🔧 Mileage Information",
    distanceTravelled: "Distance Travelled",
    cleaningInfo: "🧹 Cleaning Information",
    lastDeepCleaned: "Last Deep Cleaned",
    daysSinceClean: "Days Since Clean",
    stablingInfo: "🏢 Stabling Information",
    currentBay: "Current Bay",
    position: "Position",
    recommendedDeparture: "Recommended Departure",
    stablingPriority: "Stabling Priority",
    brandingAdvertising: "🎨 Branding & Advertising",
    advertiser: "Advertiser",
    exposureHoursToday: "Exposure Hours Today",
    slaHoursMonth: "SLA Hours This Month",
    preferredTimes: "Preferred Times",
    officeWorkers: "Office Workers",
    students: "Students",
    shoppers: "Shoppers",
    jobCardsCount: "📋 Job Cards",
    noActiveJobCards: "No active job cards",
    status: "Status",
    created: "Created",
    expected: "Expected",
    
    // Loading & Error
    loading: "Loading MetroMind...",
    loadingSubtitle: "Please wait while we load your fleet data",
    dataLoadingError: "Data Loading Error",
    retry: "Retry"
  },
  ml: {
    // Navigation
    title: "മെട്രോമൈൻഡ് — ഫ്ലീറ്റ് മാനേജ്മെന്റ്",
    description: "മെട്രോമൈൻഡ് ഫ്ലീറ്റ് മാനേജ്മെന്റ് ഡാഷ്ബോർഡ്",
    exportCSV: "CSV എക്സ്പോർട്ട്",
    nightlyUpdate: "നൈറ്റ്ലി അപ്ഡേറ്റ്",
    
    // Header
    headerTitle: "ഫ്ലീറ്റ് മാനേജ്മെന്റ് ഡാഷ്ബോർഡ്",
    headerSubtitle: "മെട്രോ പ്രവർത്തനങ്ങളുടെ റിയൽ-ടൈം മോണിറ്ററിംഗും നിയന്ത്രണവും",
    
    // Stats
    totalMetros: "ആകെ മെട്രോകൾ",
    highPriority: "ഉയർന്ന പ്രാധാന്യം",
    mediumPriority: "ഇടത്തരം പ്രാധാന്യം",
    lowPriority: "കുറഞ്ഞ പ്രാധാന്യം",
    
    // Filters
    searchPlaceholder: "ട്രെയിൻ ഐഡി അല്ലെങ്കിൽ അഡ്വെർട്ടൈസർ പ്രകാരം തിരയുക...",
    allPriorities: "എല്ലാ പ്രാധാന്യങ്ങളും",
    allFitnessStatus: "എല്ലാ ഫിറ്റ്നസ് സ്റ്റാറ്റസും",
    allBays: "എല്ലാ ബേകളും",
    valid: "സാധുവായത്",
    expiringSoon: "ഉടൻ കാലഹരണപ്പെടുന്നു",
    expired: "കാലഹരണപ്പെട്ടത്",
    
    // Train Card
    bayPosition: "ബേയും സ്ഥാനവും",
    fitness: "ഫിറ്റ്നസ്",
    mileage: "മൈലേജ്",
    jobCards: "ജോബ് കാർഡുകൾ",
    wrapID: "റാപ്പ് ഐഡി",
    
    // Modal
    detailedInfo: "വിശദമായ വിവരങ്ങൾ",
    generalInfo: "🚇 പൊതുവായ വിവരങ്ങൾ",
    trainID: "ട്രെയിൻ ഐഡി",
    priorityLevel: "പ്രാധാന്യ നില",
    currentDate: "നിലവിലെ തീയതി",
    fitnessCertificates: "📋 ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റുകൾ",
    rollingStockValid: "റോളിംഗ് സ്റ്റോക്ക് സാധുവായത് വരെ",
    signallingValid: "സിഗ്നല്ലിംഗ് സാധുവായത് വരെ",
    telecomValid: "ടെലികോം സാധുവായത് വരെ",
    overallStatus: "ആകെ സ്ഥിതി",
    mileageInfo: "🔧 മൈലേജ് വിവരങ്ങൾ",
    distanceTravelled: "പ്രയാണിച്ച ദൂരം",
    cleaningInfo: "🧹 ക്ലീനിംഗ് വിവരങ്ങൾ",
    lastDeepCleaned: "അവസാനമായി ഡീപ് ക്ലീൻ ചെയ്തത്",
    daysSinceClean: "ക്ലീൻ ചെയ്തതിനുശേഷമുള്ള ദിവസങ്ങൾ",
    stablingInfo: "🏢 സ്റ്റേബ്ലിംഗ് വിവരങ്ങൾ",
    currentBay: "നിലവിലെ ബേ",
    position: "സ്ഥാനം",
    recommendedDeparture: "ശുപാർശ ചെയ്യുന്ന പുറപ്പെടൽ",
    stablingPriority: "സ്റ്റേബ്ലിംഗ് പ്രാധാന്യം",
    brandingAdvertising: "🎨 ബ്രാൻഡിംഗ് & പരസ്യം",
    advertiser: "പരസ്യം നൽകുന്നയാൾ",
    exposureHoursToday: "ഇന്നത്തെ എക്സ്പോഷർ മണിക്കൂറുകൾ",
    slaHoursMonth: "ഈ മാസത്തെ SLA മണിക്കൂറുകൾ",
    preferredTimes: "മുൻഗണന സമയങ്ങൾ",
    officeWorkers: "ഓഫീസ് തൊഴിലാളികൾ",
    students: "വിദ്യാർത്ഥികൾ",
    shoppers: "ഷോപ്പർമാർ",
    jobCardsCount: "📋 ജോബ് കാർഡുകൾ",
    noActiveJobCards: "സജീവ ജോബ് കാർഡുകളില്ല",
    status: "സ്ഥിതി",
    created: "സൃഷ്ടിച്ചത്",
    expected: "പ്രതീക്ഷിക്കുന്നത്",
    
    // Loading & Error
    loading: "മെട്രോമൈൻഡ് ലോഡ് ചെയ്യുന്നു...",
    loadingSubtitle: "നിങ്ങളുടെ ഫ്ലീറ്റ് ഡാറ്റ ലോഡ് ചെയ്യുന്നതിനിടയിൽ ദയവായി കാത്തിരിക്കുക",
    dataLoadingError: "ഡാറ്റ ലോഡിംഗ് പിശക്",
    retry: "വീണ്ടും ശ്രമിക്കുക"
  }
};

function daysBetween(dateA: Date, dateB: Date) {
  return (dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
}

export default function MetroMindPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ml">("en");
  const [trains, setTrains] = useState<Train[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [fitnessFilter, setFitnessFilter] = useState("");
  const [bayFilter, setBayFilter] = useState<string>("");
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          "http://localhost:5005/api/nightly/unified-data"
        );

        const data = response.data;
        let trainsData = [];

        if (Array.isArray(data)) {
          trainsData = data;
        } else if (data && typeof data === "object") {
          if (Array.isArray(data.trains)) {
            trainsData = data.trains;
          } else if (Array.isArray(data.data)) {
            trainsData = data.data;
          } else {
            trainsData = Object.values(data);
          }
        }

        trainsData = trainsData.map((train: any) => ({
          train_id: train.train_id || train.id || "Unknown",
          date: train.date || new Date().toISOString().split("T")[0],
          fitness_certificates: train.fitness_certificates || {},
          job_cards: Array.isArray(train.job_cards) ? train.job_cards : [],
          branding: train.branding || {},
          mileage: train.mileage || {},
          cleaning: train.cleaning || {},
          stabling: train.stabling || {},
        })) as Train[];

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

  const currentDate = useMemo(() => new Date(), []);

  function calculatePriority(train: Train): "high" | "medium" | "low" {
    const rollingDate = new Date(
      train.fitness_certificates["Rolling Stock Valid"]
    );
    const signallingDate = new Date(
      train.fitness_certificates["Signalling Valid"]
    );
    const telecomDate = new Date(train.fitness_certificates["Telecom Valid"]);

    const isExpired =
      rollingDate < currentDate ||
      signallingDate < currentDate ||
      telecomDate < currentDate;

    const daysToExpiry = Math.min(
      daysBetween(rollingDate, currentDate),
      daysBetween(signallingDate, currentDate),
      daysBetween(telecomDate, currentDate)
    );

    const hasCriticalJobs = train.job_cards.some(
      (job) => job.Severity === "Critical"
    );
    const hasOpenJobs = train.job_cards.some((job) => job.Status === "Open");

    const lastCleanedDate = new Date(train.cleaning["Last Deep Cleaned Date"]);
    const daysSinceClean = daysBetween(currentDate, lastCleanedDate);

    if (isExpired || hasCriticalJobs) return "high";
    if (daysToExpiry < 30 || hasOpenJobs || daysSinceClean > 14)
      return "medium";
    return "low";
  }

  function getFitnessStatus(train: Train): "expired" | "expiring" | "valid" {
    const rollingDate = new Date(
      train.fitness_certificates["Rolling Stock Valid"]
    );
    const signallingDate = new Date(
      train.fitness_certificates["Signalling Valid"]
    );
    const telecomDate = new Date(train.fitness_certificates["Telecom Valid"]);

    const isExpired =
      rollingDate < currentDate ||
      signallingDate < currentDate ||
      telecomDate < currentDate;
    const daysToExpiry = Math.min(
      daysBetween(rollingDate, currentDate),
      daysBetween(signallingDate, currentDate),
      daysBetween(telecomDate, currentDate)
    );

    if (isExpired) return "expired";
    if (daysToExpiry < 30) return "expiring";
    return "valid";
  }

  const filteredTrains = useMemo(() => {
    return trains.filter((train) => {
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        train.train_id.toLowerCase().includes(searchLower) ||
        train.branding.Advertiser.toLowerCase().includes(searchLower);

      const pr = calculatePriority(train);
      const matchesPriority = !priorityFilter || pr === priorityFilter;

      const fs = getFitnessStatus(train);
      const matchesFitness = !fitnessFilter || fs === fitnessFilter;

      const matchesBay =
        !bayFilter ||
        (train.stabling["Current Bay"] !== null &&
          train.stabling["Current Bay"] !== undefined &&
          train.stabling["Current Bay"].toString() === bayFilter);

      return matchesSearch && matchesPriority && matchesFitness && matchesBay;
    });
  }, [trains, searchTerm, priorityFilter, fitnessFilter, bayFilter]);

  const stats = useMemo(() => {
    let high = 0,
      medium = 0,
      low = 0;
    trains.forEach((t) => {
      const p = calculatePriority(t);
      if (p === "high") high++;
      else if (p === "medium") medium++;
      else low++;
    });
    return { total: trains.length, high, medium, low };
  }, [trains]);

  function openModal(train: Train) {
    setSelectedTrain(train);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedTrain(null);
  }

  function generateCSVContent(data: Train[]) {
    const headers = [
      "Train ID",
      "Priority",
      "Current Bay",
      "Position",
      "Job Cards Count",
      "Critical Jobs",
      "Fitness Status",
      "Km Travelled",
      "Last Cleaned",
      "Advertiser",
      "Wrap ID",
      "Exposure Hours Today",
    ];

    const lines = [headers.join(",")];

    data.forEach((train) => {
      const priority = calculatePriority(train);
      const fitness = getFitnessStatus(train);
      const criticalJobs = train.job_cards.filter(
        (job) => job.Severity === "Critical"
      ).length;
      const row = [
        train.train_id,
        priority,
        train.stabling["Current Bay"],
        train.stabling.Position,
        train.job_cards.length,
        criticalJobs,
        fitness,
        train.mileage["Km Travelled"],
        train.cleaning["Last Deep Cleaned Date"],
        train.branding.Advertiser,
        train.branding["Wrap ID"],
        train.branding["Exposure Hours Today"],
      ];
      lines.push(row.join(","));
    });

    return lines.join("\n");
  }

  function exportReport() {
    const content = generateCSVContent(trains);
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "metro_fleet_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold mt-4">{t.loading}</div>
          <div className="text-slate-300 mt-2">
            {t.loadingSubtitle}
          </div>
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
          <p className="text-slate-300 mt-2">
            {t.headerSubtitle}
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative overflow-hidden col-span-1 md:col-span-1 bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-sky-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold z-10 relative">
              {stats.total}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              {t.totalMetros}
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-rose-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold text-rose-400 z-10 relative">
              {stats.high}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              {t.highPriority}
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-amber-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold text-amber-400 z-10 relative">
              {stats.medium}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              {t.mediumPriority}
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-emerald-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold text-emerald-300 z-10 relative">
              {stats.low}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              {t.lowPriority}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-3 items-center mb-6">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-md bg-slate-800/60 border border-slate-700 placeholder-slate-400"
            placeholder={t.searchPlaceholder}
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
          >
            <option value="">{t.allPriorities}</option>
            <option value="high">{t.highPriority}</option>
            <option value="medium">{t.mediumPriority}</option>
            <option value="low">{t.lowPriority}</option>
          </select>

          <select
            value={fitnessFilter}
            onChange={(e) => setFitnessFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
          >
            <option value="">{t.allFitnessStatus}</option>
            <option value="valid">{t.valid}</option>
            <option value="expiring">{t.expiringSoon}</option>
            <option value="expired">{t.expired}</option>
          </select>

          <select
            value={bayFilter}
            onChange={(e) => setBayFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
          >
            <option value="">{t.allBays}</option>
            <option value="1">Bay 1</option>
            <option value="2">Bay 2</option>
            <option value="3">Bay 3</option>
            <option value="4">Bay 4</option>
            <option value="5">Bay 5</option>
          </select>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredTrains.map((train) => {
            const pr = calculatePriority(train);
            const fitness = getFitnessStatus(train);
            return (
              <article
                key={train.train_id}
                onClick={() => openModal(train)}
                className="train-card cursor-pointer bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 transform transition-all duration-300 hover:scale-[1.02] hover:translate-y-[-4px] shadow-lg hover:shadow-cyan-500/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold">{train.train_id}</div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                      pr === "high"
                        ? "text-rose-500 border border-rose-500/30 bg-rose-500/5"
                        : pr === "medium"
                        ? "text-amber-400 border border-amber-400/30 bg-amber-400/5"
                        : "text-emerald-400 border border-emerald-400/30 bg-emerald-400/5"
                    }`}
                  >
                    {pr}
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.bayPosition}:</span>
                    <span className="font-medium">
                      Bay {train.stabling["Current Bay"]} -{" "}
                      {train.stabling.Position}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.fitness}:</span>
                    <span className="font-medium">
                      {fitness.toUpperCase()}
                      <span
                        className={`inline-block ml-2 w-2 h-2 rounded-full ${
                          fitness === "valid"
                            ? "bg-emerald-400"
                            : fitness === "expiring"
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        }`}
                      ></span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.mileage}:</span>
                    <span className="font-medium">
                      {train.mileage["Km Travelled"]} km
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.jobCards}:</span>
                    <span className="font-medium">
                      {train.job_cards.length}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.wrapID}:</span>
                    <span className="font-medium">
                      {train.branding["Wrap ID"]}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Modal */}
        {modalOpen && selectedTrain && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/60"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 border border-slate-700 rounded-xl p-6 overflow-y-auto max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {selectedTrain.train_id} - {t.detailedInfo}
                </h3>
                <button onClick={closeModal} className="text-2xl leading-none">
                  &times;
                </button>
              </div>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.generalInfo}
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.trainID}</span>
                      <span className="font-medium">
                        {selectedTrain.train_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.priorityLevel}</span>
                      <span className="font-medium">
                        {calculatePriority(selectedTrain).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.currentDate}</span>
                      <span className="font-medium">{selectedTrain.date}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.fitnessCertificates}
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.rollingStockValid}
                      </span>
                      <span className="font-medium">
                        {
                          selectedTrain.fitness_certificates[
                            "Rolling Stock Valid"
                          ]
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.signallingValid}
                      </span>
                      <span className="font-medium">
                        {selectedTrain.fitness_certificates["Signalling Valid"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.telecomValid}
                      </span>
                      <span className="font-medium">
                        {selectedTrain.fitness_certificates["Telecom Valid"]}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-slate-400">{t.overallStatus}</span>
                      <span className="font-medium">
                        {getFitnessStatus(selectedTrain).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.mileageInfo}
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.distanceTravelled}</span>
                      <span className="font-medium">
                        {selectedTrain.mileage["Km Travelled"]} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.currentDate}</span>
                      <span className="font-medium">
                        {selectedTrain.mileage["Date"]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.cleaningInfo}
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.lastDeepCleaned}</span>
                      <span className="font-medium">
                        {selectedTrain.cleaning["Last Deep Cleaned Date"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.daysSinceClean}</span>
                      <span className="font-medium">
                        {Math.floor(
                          daysBetween(
                            currentDate,
                            new Date(
                              selectedTrain.cleaning["Last Deep Cleaned Date"]
                            )
                          )
                        )}{" "}
                        days
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.stablingInfo}
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.currentBay}</span>
                      <span className="font-medium">
                        Bay {selectedTrain.stabling["Current Bay"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.position}</span>
                      <span className="font-medium">
                        {selectedTrain.stabling.Position}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.recommendedDeparture}
                      </span>
                      <span className="font-medium">
                        {selectedTrain.stabling["Recommended Departure"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.stablingPriority}</span>
                      <span className="font-medium">
                        {selectedTrain.stabling.Priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.brandingAdvertising}
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.wrapID}</span>
                      <span className="font-medium">
                        {selectedTrain.branding["Wrap ID"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.advertiser}</span>
                      <span className="font-medium">
                        {selectedTrain.branding.Advertiser}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.exposureHoursToday}
                      </span>
                      <span className="font-medium">
                        {selectedTrain.branding["Exposure Hours Today"]} hours
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        {t.slaHoursMonth}
                      </span>
                      <span className="font-medium">
                        {selectedTrain.branding["SLA Hours Month"]} hours
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t.preferredTimes}</span>
                      <span className="font-medium">
                        {selectedTrain.branding["Preferred Times"]}
                      </span>
                    </div>

                    {(() => {
                      try {
                        const ap = JSON.parse(
                          selectedTrain.branding["Audience Profile"]
                        );
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                {t.officeWorkers}
                              </span>
                              <span className="font-medium">
                                {Math.round(ap.office * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t.students}</span>
                              <span className="font-medium">
                                {Math.round(ap.students * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{t.shoppers}</span>
                              <span className="font-medium">
                                {Math.round(ap.shoppers * 100)}%
                              </span>
                            </div>
                          </>
                        );
                      } catch (err) {
                        return null;
                      }
                    })()}
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    {t.jobCardsCount} ({selectedTrain.job_cards.length})
                  </h4>
                  {selectedTrain.job_cards.length === 0 ? (
                    <div className="text-sm text-slate-400">
                      {t.noActiveJobCards}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTrain.job_cards.map((job) => (
                        <div
                          key={job["Job ID"]}
                          className="bg-slate-700/30 p-3 rounded border border-slate-600"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{job["Job ID"]}</div>
                            <div
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                job.Severity === "Critical"
                                  ? "bg-rose-500/20 text-rose-400"
                                  : job.Severity === "High"
                                  ? "bg-orange-500/20 text-orange-400"
                                  : job.Severity === "Medium"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-green-500/20 text-green-400"
                              }`}
                            >
                              {job.Severity}
                            </div>
                          </div>
                          <div className="text-sm text-slate-300 mb-1">
                            {job.Description}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <div>
                              {t.status}:{" "}
                              <span
                                className={`font-medium ${
                                  job.Status === "Open"
                                    ? "text-amber-400"
                                    : "text-green-400"
                                }`}
                              >
                                {job.Status}
                              </span>
                            </div>
                            <div>{t.created}: {job["Created At"]}</div>
                            <div>{t.expected}: {job["Expected Completion"]}</div>
                          </div>
                        </div>
                      ))}
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
