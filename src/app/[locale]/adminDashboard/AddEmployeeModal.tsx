"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Camera, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { db } from "@/firebase/config";
import { collection, addDoc } from "firebase/firestore";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

interface AddEmployeeModalProps {
    isOpen: boolean; // Added isOpen prop
    onClose: () => void;
}

interface Depot {
    name: string;
    // Add other properties if your API returns more fields
    id?: number;
    location?: string;
}

export default function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
    const t = useTranslations("AddEmployeeModal");
    const [depots, setDepots] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [fullName, setFullName] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [role, setRole] = useState("");
    const [selectedDepot, setSelectedDepot] = useState("");

    // Image State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Image Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const startCamera = async () => {
        try {
            setIsCameraOpen(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
                        setImageFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                        stopCamera();
                    }
                }, "image/jpeg");
            }
        }
    };

    // Close logic needs to stop camera if open
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
        }
    }, [isOpen]);

    useEffect(() => {
        async function fetchDepots() {
            try {
                const res = await fetch(`${API_BASE}/api/onboarding/depot`);
                const data: Depot[] = await res.json();
                if (Array.isArray(data)) {
                    setDepots(data.map((d: Depot) => d.name));
                }
            } catch (err) {
                console.error("Failed to fetch depots", err);
            }
        }
        fetchDepots();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !fullName ||
            !employeeId ||
            !email ||
            !role ||
            !selectedDepot
        ) {
            alert(t("fillRequired"));
            return;
        }

        setIsSubmitting(true);

        try {
            let profileImageUrl = "";

            // Upload Image if exists (Local Backend)
            if (imageFile) {
                const formData = new FormData();
                formData.append("file", imageFile);

                const uploadResponse = await fetch(`${API_BASE}/api/upload/employee-image`, {
                    method: "POST",
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error("Failed to upload image to backend");
                }

                const uploadData = await uploadResponse.json();
                // Construct full URL so it can be used directly in <img> tags
                // uploadData.url is something like "/uploads/filename.jpg"
                profileImageUrl = `${API_BASE}${uploadData.url}`;
            }

            const employeeData = {
                fullName,
                employeeId,
                emailadd: email, // Saved as 'emailadd' per user request to avoid auth matching
                phoneNumber,
                role,
                depot: selectedDepot,
                profileImageUrl, // Save Full Backend URL to Firestore
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, "employees"), employeeData);

            // Close logic
            onClose();

            // Reset form
            setFullName("");
            setEmployeeId("");
            setEmail("");
            setPhoneNumber("");
            setRole("");
            setSelectedDepot("");
            setImageFile(null);
            setPreviewUrl("");

            alert(t("successMessage"));
        } catch (err: any) {
            console.error("Error adding employee:", err);
            alert(`Error adding employee: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-600/30 shadow-2xl p-6"
                style={{ backgroundColor: "#0f172a" }}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-50">{t("title")}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-50 transition">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Image Upload Section */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-300">Profile Photo</label>

                        <div className="flex flex-col items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                            {isCameraOpen ? (
                                <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden">
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white text-black rounded-full font-medium shadow-lg hover:bg-slate-200 transition-colors"
                                    >
                                        Capture
                                    </button>
                                    <button
                                        type="button"
                                        onClick={stopCamera}
                                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-6 w-full">
                                    <div className="relative w-24 h-24 rounded-full bg-slate-700/50 border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-slate-500" />
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3 w-full">
                                        <div className="flex gap-3">
                                            <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors cursor-pointer text-sm font-medium text-slate-200 border border-slate-600">
                                                <Upload size={18} />
                                                Upload Image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-medium text-slate-200 border border-slate-600"
                                            >
                                                <Camera size={18} />
                                                Take Photo
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400">Supported formats: JPG, PNG. Max size: 5MB.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Employee Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-sky-400 border-b border-slate-700 pb-2">
                            {t("employeeDetails")}
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("fullName")}</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder={t("fullNamePlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Employee ID */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("employeeId")}</label>
                                <input
                                    type="text"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder={t("employeeIdPlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("email")}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("emailPlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("phoneNumber")}</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder={t("phoneNumberPlaceholder")}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("role")}</label>
                                <input
                                    type="text"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    placeholder={t("rolePlaceholder") || "Enter role"}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                />
                            </div>

                            {/* Assigned Depot */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{t("depot")}</label>
                                <select
                                    value={selectedDepot}
                                    onChange={(e) => setSelectedDepot(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-50 focus:border-sky-400 outline-none"
                                >
                                    <option value="">{t("selectDepot")}</option>
                                    {depots.map((depot, idx) => (
                                        <option key={idx} value={depot}>{depot}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-xl transition font-semibold"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white rounded-xl transition font-semibold shadow-lg ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? "Submitting..." : t("submit")}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}