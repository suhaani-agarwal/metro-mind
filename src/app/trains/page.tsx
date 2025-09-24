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

function daysBetween(dateA: Date, dateB: Date) {
  return (dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
}

export default function MetroMindPage() {
  const router = useRouter();
  const [trains, setTrains] = useState<Train[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [fitnessFilter, setFitnessFilter] = useState("");
  const [bayFilter, setBayFilter] = useState<string>("");
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Using axios instead of fetch
        const response = await axios.get(
          "http://localhost:5005/api/nightly/unified-data"
        );

        // Axios automatically parses JSON, so we use response.data
        const data = response.data;

        // ... rest of your data processing code remains the same
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
  // Use a stable current date
  const currentDate = useMemo(() => new Date(), []);

  // Priority calculation based on available data
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

    // Check for critical job cards
    const hasCriticalJobs = train.job_cards.some(
      (job) => job.Severity === "Critical"
    );
    const hasOpenJobs = train.job_cards.some((job) => job.Status === "Open");

    // Check cleaning date
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

  // Filters
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

  // Stats
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

  // Modal functions
  function openModal(train: Train) {
    setSelectedTrain(train);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedTrain(null);
  }

  // CSV export
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
          <div className="text-xl font-bold mt-4">Loading MetroMind...</div>
          <div className="text-slate-300 mt-2">
            Please wait while we load your fleet data
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
          <div className="text-xl font-bold mb-2">Data Loading Error</div>
          <div className="text-slate-300 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-50">
      <Head>
        <title>MetroMind — Fleet Management</title>
        <meta
          name="description"
          content="MetroMind fleet management dashboard"
        />
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
              onClick={exportReport}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-900 shadow-md"
            >
              Export CSV
            </button>
            <button
              onClick={() => router.push("/nightly")}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-900 shadow-md"
            >
              Nightly Update
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400">
            Fleet Management Dashboard
          </h2>
          <p className="text-slate-300 mt-2">
            Real-time monitoring and control of metro operations
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative overflow-hidden col-span-1 md:col-span-1 bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-sky-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold z-10 relative">
              {stats.total}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              Total Metros
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-rose-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold text-rose-400 z-10 relative">
              {stats.high}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              High Priority
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-amber-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold text-amber-400 z-10 relative">
              {stats.medium}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              Medium Priority
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 transform transition-transform duration-300 hover:scale-[1.02] active:scale-95">
            <div className="absolute inset-0 z-0 bg-emerald-500/10 animate-pulse-slow"></div>
            <div className="text-3xl font-bold text-emerald-300 z-10 relative">
              {stats.low}
            </div>
            <div className="text-slate-300 text-sm z-10 relative">
              Low Priority
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-3 items-center mb-6">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-md bg-slate-800/60 border border-slate-700 placeholder-slate-400"
            placeholder="Search by Train ID or Advertiser..."
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={fitnessFilter}
            onChange={(e) => setFitnessFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
          >
            <option value="">All Fitness Status</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={bayFilter}
            onChange={(e) => setBayFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700"
          >
            <option value="">All Bays</option>
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
                    <span className="text-slate-400">Bay & Position:</span>
                    <span className="font-medium">
                      Bay {train.stabling["Current Bay"]} -{" "}
                      {train.stabling.Position}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Fitness:</span>
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
                    <span className="text-slate-400">Mileage:</span>
                    <span className="font-medium">
                      {train.mileage["Km Travelled"]} km
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Job Cards:</span>
                    <span className="font-medium">
                      {train.job_cards.length}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Wrap ID:</span>
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
                  {selectedTrain.train_id} - Detailed Information
                </h3>
                <button onClick={closeModal} className="text-2xl leading-none">
                  &times;
                </button>
              </div>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    🚇 General Information
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Train ID</span>
                      <span className="font-medium">
                        {selectedTrain.train_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Priority Level</span>
                      <span className="font-medium">
                        {calculatePriority(selectedTrain).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Date</span>
                      <span className="font-medium">{selectedTrain.date}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    📋 Fitness Certificates
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Rolling Stock Valid Until
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
                        Signalling Valid Until
                      </span>
                      <span className="font-medium">
                        {selectedTrain.fitness_certificates["Signalling Valid"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Telecom Valid Until
                      </span>
                      <span className="font-medium">
                        {selectedTrain.fitness_certificates["Telecom Valid"]}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-slate-400">Overall Status</span>
                      <span className="font-medium">
                        {getFitnessStatus(selectedTrain).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    🔧 Mileage Information
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance Travelled</span>
                      <span className="font-medium">
                        {selectedTrain.mileage["Km Travelled"]} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date</span>
                      <span className="font-medium">
                        {selectedTrain.mileage["Date"]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    🧹 Cleaning Information
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Deep Cleaned</span>
                      <span className="font-medium">
                        {selectedTrain.cleaning["Last Deep Cleaned Date"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Days Since Clean</span>
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
                    🏢 Stabling Information
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Bay</span>
                      <span className="font-medium">
                        Bay {selectedTrain.stabling["Current Bay"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Position</span>
                      <span className="font-medium">
                        {selectedTrain.stabling.Position}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Recommended Departure
                      </span>
                      <span className="font-medium">
                        {selectedTrain.stabling["Recommended Departure"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stabling Priority</span>
                      <span className="font-medium">
                        {selectedTrain.stabling.Priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-800/60 p-4 rounded-md border border-slate-700">
                  <h4 className="text-sky-400 font-semibold">
                    🎨 Branding & Advertising
                  </h4>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wrap ID</span>
                      <span className="font-medium">
                        {selectedTrain.branding["Wrap ID"]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Advertiser</span>
                      <span className="font-medium">
                        {selectedTrain.branding.Advertiser}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Exposure Hours Today
                      </span>
                      <span className="font-medium">
                        {selectedTrain.branding["Exposure Hours Today"]} hours
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        SLA Hours This Month
                      </span>
                      <span className="font-medium">
                        {selectedTrain.branding["SLA Hours Month"]} hours
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Preferred Times</span>
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
                                Office Workers
                              </span>
                              <span className="font-medium">
                                {Math.round(ap.office * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Students</span>
                              <span className="font-medium">
                                {Math.round(ap.students * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Shoppers</span>
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
                    📋 Job Cards ({selectedTrain.job_cards.length})
                  </h4>
                  {selectedTrain.job_cards.length === 0 ? (
                    <div className="text-sm text-slate-400">
                      No active job cards
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
                              Status:{" "}
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
                            <div>Created: {job["Created At"]}</div>
                            <div>Expected: {job["Expected Completion"]}</div>
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
