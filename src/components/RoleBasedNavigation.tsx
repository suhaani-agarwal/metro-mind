"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import {
    Train,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Radio,
    Signal,
    Wrench,
    LayoutDashboard,
    Map,
    Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/config";

// Defined Roles (should match Firestore values)
// station-master, control-operator, maintenance-lead, safety-officer
// Also: "Train Operator", "Rolling Stock Manager", "Signalling Manager", "Telecom Manager" based on user prompts
// Normalizing:
// "Train Operator"
// "Station Master"
// "Rolling Stock Manager"
// "Signalling Manager"
// "Telecom Manager"

const RoleBasedNavigation = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const storedRole = localStorage.getItem("userRole");
        // const storedId = localStorage.getItem("userId");

        if (storedRole) {
            setRole(storedRole);
        } else {
            // If no role found in localStorage, verify via Firebase Auth state or redirect to login?
            // For now, let's assume if they are on a protected page, they should have this.
            // If not, might be a direct access or session expired.
            // We'll let the page's own auth check handle critical security, this is for UI.
        }
    }, []);

    // Access Control Logic
    useEffect(() => {
        if (!role) return;

        const lowerRole = role.toLowerCase();
        const path = pathname;

        // Define restricted paths
        // If user is Train Operator, they should NOT be on /trains or /employees
        // They should only be on /operators (and maybe profile/settings)

        if (lowerRole.includes("train operator")) {
            if (!path.includes("/operators") && !path.includes("/security")) {
                // Redirect to operators dashboard if they try to access others
                router.push("/operators");
            }
        } else if (lowerRole.includes("rolling stock manager")) {
            if (!path.includes("/employees/rolling-stock") && !path.includes("/security")) {
                router.push("/employees/rolling-stock");
            }
        } else if (lowerRole.includes("signalling manager")) {
            if (!path.includes("/employees/signalling") && !path.includes("/security")) {
                router.push("/employees/signalling");
            }
        } else if (lowerRole.includes("telecom manager")) {
            if (!path.includes("/employees/telecom") && !path.includes("/security")) {
                router.push("/employees/telecom");
            }
        }
        // Station Master has broader access, no forced redirect usually (except maybe excludes /employees/specifics?)
        // User said: "station master then he can see all the pages except employees page"
        else if (lowerRole.includes("station master")) {
            if (path.includes("/employees/")) {
                router.push("/trains"); // Redirect away from employees
            }
        }

    }, [role, pathname, router]);


    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.clear(); // Clear local storage
            router.push("/");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    if (!isClient || !role) return null;

    const lowerRole = role.toLowerCase();

    const links = [];

    // Define Links based on Role
    if (lowerRole.includes("station master")) {
        links.push(
            { href: "/trains", label: "Fleet Overview", icon: LayoutDashboard },
            { href: "/cbtc", label: "CBTC System", icon: Activity },
            { href: "/parking", label: "Depot Parking", icon: Map },
            { href: "/operators", label: "Train Operators", icon: Users },
            { href: "/adminDashboard", label: "Admin", icon: Settings }
        );
    } else if (lowerRole.includes("train operator")) {
        links.push(
            { href: "/operators", label: "My Dashboard", icon: Train }
        );
    } else if (lowerRole.includes("rolling stock")) {
        links.push(
            { href: "/employees/rolling-stock", label: "Rolling Stock", icon: Wrench }
        );
    } else if (lowerRole.includes("signalling")) {
        links.push(
            { href: "/employees/signalling", label: "Signalling", icon: Signal }
        );
    } else if (lowerRole.includes("telecom")) {
        links.push(
            { href: "/employees/telecom", label: "Telecom", icon: Radio }
        );
    } else {
        // Fallback or Unknown Role
        links.push(
            { href: "/trains", label: "Dashboard", icon: LayoutDashboard }
        );
    }

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 shadow-xl md:hidden"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Container */}
            <motion.div
                className={`fixed top-0 left-0 h-screen bg-slate-900 border-r border-slate-800 z-40 w-64 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                <div className="flex flex-col h-full p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Train className="text-slate-900 w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-100 tracking-tight">MetroMind</h1>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{role}</p>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 space-y-2">
                        {links.map((link) => {
                            const isActive = pathname.includes(link.href) && (link.href !== "/" || pathname === "/");
                            // Fix for sub-routes matching heavily if we used startsWith, but includes is safer for now?
                            // Better logic:
                            // const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-lg shadow-sky-500/10"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                                        }`}
                                    onClick={() => setIsOpen(false)} // Close mobile menu on click
                                >
                                    <link.icon className={`w-5 h-5 transition-colors ${isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                                    <span className="font-medium">{link.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer / Logout */}
                    <div className="mt-auto pt-6 border-t border-slate-800">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 group"
                        >
                            <LogOut className="w-5 h-5 group-hover:text-rose-400" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};

export default RoleBasedNavigation;
