"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "@/i18n/routing";
import RoleBasedNavigation from "@/components/RoleBasedNavigation";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

type DepartmentKey = "rolling_stock" | "signalling" | "telecom";

interface InvalidCertificate {
  train_id: string;
  certificate_type: string;
  department: string;
  issue_date: string;
  expiry_date: string;
  status: string;
}

interface DepartmentInvalidResponse {
  department: string;
  count: number;
  invalid_certificates: InvalidCertificate[];
}

interface DepartmentPageProps {
  departmentKey: DepartmentKey;
  title: string;
  description: string;
  accentFrom: string;
  accentTo: string;
}

const DepartmentInvalidCertificatesPage: React.FC<DepartmentPageProps> = ({
  departmentKey,
  title,
  description,
  accentFrom,
  accentTo,
}) => {
  const router = useRouter();
  const [data, setData] = useState<DepartmentInvalidResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [issuedAt, setIssuedAt] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const departmentPathSegment =
    departmentKey === "rolling_stock" ? "rolling-stock" : departmentKey;

  const fetchInvalidCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<DepartmentInvalidResponse>(
        `${API_BASE}/api/nightly/${departmentPathSegment}/invalid-certificates`
      );
      setData(res.data);
      setSelected({});
    } catch (err) {
      console.error("Error loading invalid certificates", err);
      setError("Failed to load invalid certificates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInvalidCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentKey]);

  const toggleSelection = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRenewSelected = async () => {
    if (!data || !data.invalid_certificates.length) return;

    const selectedRows = data.invalid_certificates.filter((row) =>
      selected[`${row.train_id}::${row.certificate_type}`]
    );

    if (!selectedRows.length) {
      alert("Please select at least one certificate to renew.");
      return;
    }

    if (!issuedAt || !validUntil) {
      alert("Please provide both issue date and valid until date.");
      return;
    }

    setSubmitting(true);
    let hasError = false;

    for (const row of selectedRows) {
      const payload: {
        train_id: string;
        fitness_certificates: {
          issued_at: string;
          valid_until: string;
          status: string;
          renew_rolling_stock?: boolean;
          renew_signalling?: boolean;
          renew_telecom?: boolean;
        };
      } = {
        train_id: row.train_id,
        fitness_certificates: {
          issued_at: issuedAt,
          valid_until: validUntil,
          status: "valid",
        },
      };

      if (departmentKey === "rolling_stock") {
        payload.fitness_certificates.renew_rolling_stock = true;
      } else if (departmentKey === "signalling") {
        payload.fitness_certificates.renew_signalling = true;
      } else if (departmentKey === "telecom") {
        payload.fitness_certificates.renew_telecom = true;
      }

      try {
        await axios.post(`${API_BASE}/api/nightly/update/train`, payload);
      } catch (err) {
        console.error(
          `Error renewing certificate for train ${row.train_id}`,
          err
        );
        hasError = true;
      }
    }

    setSubmitting(false);

    setIssuedAt("");
    setValidUntil("");
    setSelected({});
    void fetchInvalidCertificates();
  };

  const departmentLabel =
    departmentKey === "rolling_stock"
      ? "Rolling Stock"
      : departmentKey === "signalling"
        ? "Signalling"
        : "Telecom";

  return (
    <div className="flex min-h-screen bg-slate-900">
      <RoleBasedNavigation />
      <div
        className="flex-1 md:ml-64 w-full transition-all duration-300"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-50 mb-2 drop-shadow-lg">
              {title}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto">
              {description}
            </p>
            <div
              className="w-24 h-1 mx-auto rounded-full mt-4"
              style={{
                background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})`,
              }}
            ></div>
          </div>

          {/* Summary Card */}
          <div
            className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-3">
                  <div
                    className="w-2 h-8 rounded-full"
                    style={{
                      background: `linear-gradient(180deg, ${accentFrom}, ${accentTo})`,
                    }}
                  ></div>
                  {departmentLabel} Invalid Fitness Certificates
                </h2>
                <p className="text-slate-300 text-sm mt-1">
                  Track and renew expired fitness certificates for all trains in
                  the {departmentLabel.toLowerCase()} department.
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="px-4 py-2 rounded-xl bg-slate-800/70 border border-slate-600/60 text-slate-100 text-sm flex flex-col items-center">
                  <span className="text-xs text-slate-400">Invalid Certificates</span>
                  <span className="text-2xl font-bold">
                    {data?.count ?? 0}
                  </span>
                </div>
                <button
                  onClick={() => void fetchInvalidCertificates()}
                  className="px-4 py-2 text-sm font-medium text-slate-50 rounded-xl border border-slate-600/50 hover:border-sky-400/60 hover:bg-sky-400/10 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => router.push("/nightly")}
                  className="px-4 py-2 text-sm font-medium text-slate-50 rounded-xl border border-slate-600/50 hover:border-emerald-400/60 hover:bg-emerald-400/10 transition-colors"
                >
                  Go to Nightly Page
                </button>
              </div>
            </div>
          </div>

          {/* Error / Loading States */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl text-sm">
              {error}
            </div>
          )}
          {loading && (
            <div className="p-4 bg-slate-800/70 border border-slate-600/60 text-slate-200 rounded-xl text-sm">
              Loading invalid certificates...
            </div>
          )}

          {/* Renewal Controls */}
          <div
            className="backdrop-blur-md rounded-2xl p-6 border border-amber-500/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-3">
              <div className="w-2 h-8 rounded-full bg-linear-to-b from-amber-400 to-orange-400"></div>
              Renewal Details
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Issue Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-amber-400/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Valid Until (Expiry) Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-amber-400/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => void handleRenewSelected()}
                disabled={submitting}
                className="px-6 py-3 rounded-2xl text-sm font-semibold text-slate-50 border border-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ef4444 100%)",
                }}
              >
                {submitting ? "Renewing..." : "Renew Selected Certificates"}
              </button>
            </div>
          </div>

          {/* Table of invalid certificates */}
          <div
            className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.9)" }}
          >
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              Invalid Certificates List
            </h2>
            {!data || data.invalid_certificates.length === 0 ? (
              <div className="text-slate-300 text-sm">
                No invalid certificates found for this department.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-slate-200">
                  <thead className="bg-slate-800/80 border-b border-slate-700/60">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="px-4 py-3">Train ID</th>
                      <th className="px-4 py-3">Certificate Type</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invalid_certificates.map((row, idx) => {
                      const key = `${row.train_id}::${row.certificate_type}`;
                      const isSelected = !!selected[key];
                      return (
                        <tr
                          key={key}
                          className={`border-b border-slate-700/40 hover:bg-slate-800/70 transition-colors ${idx % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/20"
                            }`}
                        >
                          <td className="px-4 py-3 align-middle">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(key)}
                              className="h-4 w-4 rounded border-slate-600/70 bg-slate-900 text-amber-400 focus:ring-amber-400/40"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-100">
                            {row.train_id}
                          </td>
                          <td className="px-4 py-3 capitalize">
                            {row.certificate_type.replace("_", " ")}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-300">
                            {row.department}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {row.issue_date || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {row.expiry_date || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/40">
                              {row.status || "expired"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentInvalidCertificatesPage;
