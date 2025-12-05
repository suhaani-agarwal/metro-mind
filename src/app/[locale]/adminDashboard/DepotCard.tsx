"use client";

import { useState, useRef, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, doc, writeBatch, query, where, getDocs, limit } from "firebase/firestore";
import * as XLSX from "xlsx";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

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

interface DepotCardProps {
    depot: Depot;
    onDelete: (name: string) => void;
}

export default function DepotCard({ depot, onDelete }: DepotCardProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");
    const [hasData, setHasData] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if data exists for this depot
    useEffect(() => {
        async function checkData() {
            try {
                const q = query(
                    collection(db, "employees"),
                    where("depotName", "==", depot.name),
                    limit(1)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    setHasData(true);
                }
            } catch (error) {
                console.error("Error checking depot data:", error);
            }
        }
        checkData();
    }, [depot.name]);

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${depot.name}?`)) return;

        setDeleting(true);
        try {
            const res = await fetch(`${API_BASE}/api/onboarding/depot`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: depot.name }),
            });

            if (res.ok) {
                onDelete(depot.name);
            } else {
                alert("Failed to delete depot");
            }
        } catch (error) {
            console.error("Error deleting depot:", error);
            alert("Error deleting depot");
        } finally {
            setDeleting(false);
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            setUploadMessage("Reading file...");

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = event.target?.result;
                    const workbook = XLSX.read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet);

                    // Step 1: Delete existing employees for this depot
                    setUploadMessage("Removing old employee data...");
                    const employeesRef = collection(db, "employees");
                    const q = query(employeesRef, where("depotName", "==", depot.name));
                    const existingDocs = await getDocs(q);

                    if (!existingDocs.empty) {
                        const deleteChunks = [];
                        let deleteBatch = writeBatch(db);
                        let deleteCount = 0;

                        existingDocs.forEach((docSnapshot) => {
                            deleteBatch.delete(docSnapshot.ref);
                            deleteCount++;

                            // Firestore batch limit is 500
                            if (deleteCount % 500 === 0) {
                                deleteChunks.push(deleteBatch);
                                deleteBatch = writeBatch(db);
                            }
                        });

                        if (deleteCount % 500 !== 0) {
                            deleteChunks.push(deleteBatch);
                        }

                        for (const batch of deleteChunks) {
                            await batch.commit();
                        }
                    }

                    // Step 2: Upload new employee data
                    setUploadMessage(`Uploading ${jsonData.length} records to Firestore...`);

                    const chunkSize = 500;
                    const chunks = [];
                    for (let i = 0; i < jsonData.length; i += chunkSize) {
                        chunks.push(jsonData.slice(i, i + chunkSize));
                    }

                    let totalUploaded = 0;

                    for (const chunk of chunks) {
                        const batch = writeBatch(db);

                        chunk.forEach((emp: any) => {
                            const newDocRef = doc(employeesRef);

                            // Normalize keys
                            const normalizedEmp: any = {};
                            Object.keys(emp).forEach(key => {
                                const lowerKey = key.toLowerCase().replace(/[\s-_]/g, "");
                                if (lowerKey === "employeeid" || lowerKey === "empid" || lowerKey === "id") {
                                    normalizedEmp.employeeId = String(emp[key]);
                                } else if (lowerKey === "phonenumber" || lowerKey === "phone" || lowerKey === "contact" || lowerKey === "mobile") {
                                    normalizedEmp.phoneNumber = emp[key];
                                } else if (lowerKey === "email" || lowerKey === "emailaddress" || lowerKey === "emailid") {
                                    normalizedEmp.email = emp[key];
                                } else if (lowerKey === "name" || lowerKey === "employeename") {
                                    normalizedEmp.name = emp[key];
                                } else if (lowerKey === "designation" || lowerKey === "role") {
                                    normalizedEmp.designation = emp[key];
                                } else {
                                    normalizedEmp[key] = emp[key]; // Keep other keys as is
                                }
                            });

                            // Normalize phone number
                            let formattedPhone = normalizedEmp.phoneNumber;
                            if (formattedPhone) {
                                // Convert to string first to handle numbers
                                formattedPhone = String(formattedPhone).replace(/[-\s]/g, "");
                                if (!formattedPhone.startsWith("+91")) {
                                    formattedPhone = "+91" + formattedPhone;
                                }
                                normalizedEmp.phoneNumber = formattedPhone;
                            }

                            // Normalize email
                            let formattedEmail = normalizedEmp.email;
                            if (formattedEmail) {
                                formattedEmail = String(formattedEmail).trim().toLowerCase();
                                normalizedEmp.email = formattedEmail;
                            } else {
                                console.warn("No email found for employee:", normalizedEmp.employeeId, emp);
                            }

                            console.log("Normalized Employee:", normalizedEmp);

                            batch.set(newDocRef, {
                                ...normalizedEmp,
                                depotName: depot.name,
                            });
                        });

                        await batch.commit();
                        totalUploaded += chunk.length;
                        setUploadMessage(`Uploaded ${totalUploaded} / ${jsonData.length} records...`);
                    }

                    setUploadMessage("Employee database updated successfully!");
                    setHasData(true);
                    setTimeout(() => setUploadMessage(""), 3000);
                } catch (error: any) {
                    console.error("Error processing file:", error);
                    setUploadMessage(`Error: ${error.message || "Failed to upload"}`);
                } finally {
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    return (
        <div
            className="rounded-2xl border border-slate-600/30 shadow-xl backdrop-blur-md p-6 hover:shadow-2xl transition-all duration-300 group hover:border-sky-400/50"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-50 group-hover:text-emerald-400 transition">{depot.name}</h3>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">📍 {depot.location}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-400/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded-full border border-emerald-400/20">
                        Active
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition hover:text-red-300 flex-shrink-0"
                        title="Delete Depot"
                    >
                        {deleting ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-slate-600/20 to-transparent mb-6"></div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-600/10 transition">
                    <span className="text-slate-400">📊 Max Capacity</span>
                    <span className="text-slate-50 font-semibold text-lg">{depot.max_capacity_trains} Trains</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-600/10 transition">
                    <span className="text-slate-400">⏰ Hours</span>
                    <span className="text-slate-50 font-semibold text-lg">{depot.operational_hours}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-600/10 transition">
                    <span className="text-slate-400">🔧 Maintenance Bays</span>
                    <span className="text-slate-50 font-semibold text-lg">{depot.maintenance_bays}</span>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-600/20">
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    onClick={handleFileClick}
                    disabled={uploading}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 border
            ${uploading
                            ? "bg-slate-700 text-slate-400 cursor-not-allowed border-slate-600"
                            : hasData
                                ? "bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20"
                                : "bg-gradient-to-r from-sky-400/20 to-emerald-400/20 text-slate-100 border-sky-400/30 hover:from-sky-400/30 hover:to-emerald-400/30 hover:border-sky-400/60 hover:shadow-lg"
                        }`}
                >
                    {uploading ? (
                        <span>Processing...</span>
                    ) : (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            {hasData ? "Update Employee Database" : "Add Employee Data"}
                        </>
                    )}
                </button>
                {uploadMessage && (
                    <p
                        className={`text-xs text-center mt-2 ${uploadMessage.includes("Error") ? "text-red-400" : "text-emerald-400"
                            }`}
                    >
                        {uploadMessage}
                    </p>
                )}
            </div>
        </div>
    );
}
