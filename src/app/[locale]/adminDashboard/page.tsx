"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/firebase/config";
import { signOut } from "firebase/auth";
import { LogOut, Plus, Train, UserPlus } from "lucide-react";
import DepotCard from "./DepotCard";
import AddTrainModal from "./AddTrainModal";
import AddEmployeeModal from "./AddEmployeeModal";
import { useTranslations } from "next-intl";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

interface Depot {
  name: string;
  location: string;
  maintenance_bays: string;
  stabling_tracks: string;
  inspection_lines: string;
  washing_lines: string;
  max_capacity_trains: string;
  operational_hours: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const t = useTranslations("AdminDashboard");

  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTrainModal, setShowAddTrainModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // 1️⃣ Firebase Auth Check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.push(`/${locale}/adminLogin`);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, [router, locale]);

  // 2️⃣ Fetch depots
  useEffect(() => {
    async function fetchDepots() {
      try {
        const res = await fetch(`${API_BASE}/api/onboarding/depot`);
        const data = await res.json();
        setDepots(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchDepots();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push(`/${locale}/`);
  };

  const handleDeleteDepot = (name: string) => {
    setDepots((prev) => prev.filter((d) => d.name !== name));
  };

  const handleAddDepot = () => {
    router.push(`/${locale}/onboarding`);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl text-slate-50 bg-slate-900">
        Loading...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-50 drop-shadow-lg">
              {t("title")}
            </h1>
            <p className="text-slate-300 mt-2">{t("welcome")}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-xl bg-slate-800/40 border border-slate-700/40 
             text-slate-200 backdrop-blur-sm shadow-lg 
             hover:border-red-400/50 hover:text-red-400 
             hover:shadow-red-500/20 hover:scale-[1.03] 
             transition-all duration-300 flex items-center gap-2"
          >
            <LogOut size={20} />
            {t("logout")}
          </button>
        </div>

        {/* Decorative Line */}
        <div className="w-24 h-1 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>

        {/* ACTION AREA */}
        <div>
          {depots.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl border border-slate-600/30 shadow-2xl backdrop-blur-md hover:shadow-3xl transition-all duration-300"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            >
              <h2 className="text-3xl font-semibold text-slate-50 mb-4">
                {t("noDepotsTitle")}
              </h2>
              <p className="text-slate-400 mb-8 text-lg">{t("noDepotsDesc")}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleAddDepot}
                  className="px-8 py-4 bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-900 rounded-xl hover:shadow-lg transition shadow-md text-lg font-semibold flex items-center gap-2 hover:scale-105 duration-200"
                >
                  <Plus size={22} />
                  {t("addDepot")}
                </button>
                <button
                  onClick={() => setShowAddTrainModal(true)}
                  className="px-8 py-4 bg-slate-700 text-slate-50 rounded-xl hover:bg-slate-600 transition shadow-md text-lg font-semibold flex items-center gap-2 hover:scale-105 duration-200"
                >
                  <Train size={22} />
                  {t("addTrain")}
                </button>
                <button
                  onClick={() => setShowAddEmployeeModal(true)}
                  className="px-8 py-4 bg-slate-700 text-slate-50 rounded-xl hover:bg-slate-600 transition shadow-md text-lg font-semibold flex items-center gap-2 hover:scale-105 duration-200"
                >
                  <UserPlus size={22} />
                  {t("addEmployee")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-50">
                  {t("yourDepots")}
                </h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowAddTrainModal(true)}
                    className="px-6 py-3 bg-slate-700 text-slate-50 rounded-xl hover:bg-slate-600 transition shadow-md font-semibold flex items-center gap-2 hover:scale-105 duration-200"
                  >
                    <Train size={20} />
                    {t("addTrain")}
                  </button>
                  <button
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="px-6 py-3 bg-slate-700 text-slate-50 rounded-xl hover:bg-slate-600 transition shadow-md font-semibold flex items-center gap-2 hover:scale-105 duration-200"
                  >
                    <UserPlus size={20} />
                    {t("addEmployee")}
                  </button>
                  <button
                    onClick={handleAddDepot}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500/80 to-emerald-500/80 
             text-slate-900 font-semibold shadow-lg 
             hover:from-sky-400 hover:to-emerald-400 
             hover:shadow-xl hover:scale-[1.05] 
             transition-all duration-300 flex items-center gap-2"
                  >
                    <Plus size={20} />
                    {t("addAnotherDepot")}
                  </button>
                </div>
              </div>

              {/* Depots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {depots.map((depot, index) => (
                  <DepotCard
                    key={index}
                    depot={depot}
                    onDelete={handleDeleteDepot}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Train Modal */}
      {showAddTrainModal && (
        <AddTrainModal onClose={() => setShowAddTrainModal(false)} />
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <AddEmployeeModal onClose={() => setShowAddEmployeeModal(false)} />
      )}
    </div>
  );
}
