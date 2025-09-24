"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Play,
  Zap,
  Brain,
  Shield,
  CheckCircle,
  Cpu,
  User,
  Mail,
  Phone,
  MapPin,
  Train,
  Database,
  Menu,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

// Quick and support links for footer
const quickLinks = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Contact", href: "/contact" },
];

const supportLinks = [
  { name: "Help Center", href: "/help" },
  { name: "FAQ", href: "/faq" },
  { name: "Support", href: "/support" },
];

const currentYear = new Date().getFullYear();

// Features list
const featuresMetro = [
  {
    title: "Real-Time Data Ingestion",
    description:
      "Consolidates Maximo job cards, IoT fitness sensors, cleaning rosters, branding dashboards, and stabling maps.",
    icon: Zap,
    color: "#38bdf8",
  },
  {
    title: "AI Scheduling & Optimisation",
    description:
      "Balances fitness, maintenance, branding, cleaning, mileage, and stabling using multi-objective algorithms.",
    icon: Brain,
    color: "#06d6a0",
  },
  {
    title: "3D Yard Simulation",
    description:
      "Drag-and-drop depot view for testing scenarios and minimizing shunting time.",
    icon: Shield,
    color: "#fbbf24",
  },
];

// Workflow steps
const workflowSteps = [
  {
    id: 1,
    title: "Data Ingestion",
    description:
      "Nightly Maximo exports, daily constraints ingestion, and data sync.",
    icon: <Database className="w-8 h-8 text-sky-400" />,
  },
  {
    id: 2,
    title: "Optimisation",
    description: "Quantum-inspired multi-objective scheduling optimisation.",
    icon: <Cpu className="w-8 h-8 text-emerald-400" />,
  },
  {
    id: 3,
    title: "Supervisor Adjustments",
    description: "Human-in-the-loop verification and AI-assisted overrides.",
    icon: <User className="w-8 h-8 text-amber-400" />,
  },
  {
    id: 4,
    title: "Final Plan",
    description:
      "Trains ready with validated schedules for morning operations.",
    icon: <CheckCircle className="w-8 h-8 text-pink-400" />,
  },
];

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 }
    );

    const section = document.getElementById("workflow");
    if (section) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % 4);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      {/* Navbar */}
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-slate-600/30"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                }}
              >
                <Train className="h-5 w-5 text-slate-50" />
              </div>
              <span className="text-2xl font-bold text-slate-50">
                MetroMind
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a
                  href="#features"
                  className="text-slate-300 hover:text-slate-50 transition-colors duration-300 font-medium"
                >
                  Features
                </a>
                <a
                  href="#about"
                  className="text-slate-300 hover:text-slate-50 transition-colors duration-300 font-medium"
                >
                  About
                </a>
                <a
                  href="#contact"
                  className="text-slate-300 hover:text-slate-50 transition-colors duration-300 font-medium"
                >
                  Contact
                </a>
                <Link
                  href="/security"
                  className="text-slate-300 hover:text-slate-50 transition-colors duration-300 font-medium"
                >
                  Security
                </Link>
                <Link href="/security">
                  <button
                    className="px-6 py-2 text-slate-50 font-semibold rounded-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                      boxShadow: "0 4px 15px -3px rgba(56, 189, 248, 0.3)",
                    }}
                  >
                    Login
                  </button>
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-300 hover:text-slate-50 transition-colors duration-300"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div
                className="px-2 pt-2 pb-3 space-y-1 backdrop-blur-md rounded-xl mt-2 border border-slate-600/30"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.8)" }}
              >
                <a
                  href="#features"
                  className="block px-3 py-2 text-slate-300 hover:text-slate-50 transition-colors duration-300"
                >
                  Features
                </a>
                <a
                  href="#about"
                  className="block px-3 py-2 text-slate-300 hover:text-slate-50 transition-colors duration-300"
                >
                  About
                </a>
                <a
                  href="#contact"
                  className="block px-3 py-2 text-slate-300 hover:text-slate-50 transition-colors duration-300"
                >
                  Contact
                </a>
                <Link
                  href="/security"
                  className="block px-3 py-2 text-slate-300 hover:text-slate-50 transition-colors duration-300"
                >
                  Security
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center text-slate-50 overflow-hidden pt-16">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-pulse"
            style={{
              background:
                "radial-gradient(circle, #38bdf8 0%, transparent 70%)",
            }}
          ></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 animate-pulse"
            style={{
              background:
                "radial-gradient(circle, #06d6a0 0%, transparent 70%)",
            }}
          ></div>
        </div>

        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full">
          <video
            src="https://media.istockphoto.com/id/1971890728/video/the-train-has-arrived-at-the-railway-station.mp4?s=mp4-640x640-is&k=20&c=wzbBXSjZeoXPNPMSuayUl4ujiaP1tTrRqV1bFGPmlNI="
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{
              filter: "blur(8px) brightness(0.3)",
              objectPosition: "center",
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                    MetroMind
                  </span>
                  <br />
                  <span className="text-slate-50">The Brain Behind</span>
                  <br />
                  <span className="text-slate-50">Every Train Move</span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-xl lg:text-2xl text-slate-300 leading-relaxed"
              >
                Smart Train Induction & Scheduling System for Kochi Metro.
                <br />
                Revolutionizing metro operations with AI-powered optimization
                and real-time intelligence.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-6"
              >
                <button
                  className="flex items-center justify-center space-x-3 px-8 py-4 text-xl font-semibold text-slate-50 rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                    boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.4)",
                  }}
                >
                  <span>Access Dashboard</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>

                <button className="flex items-center justify-center space-x-3 px-8 py-4 text-xl text-slate-50 border-2 border-slate-400 rounded-2xl transition-all duration-300 hover:bg-slate-700/30 backdrop-blur-sm">
                  <Play className="w-6 h-6" />
                  <span>Watch Demo</span>
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-50 mb-4">
              Advanced Features
            </h2>
            <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Features cards */}
            <div className="space-y-8">
              {featuresMetro.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl transition-all duration-300 hover:transform hover:-translate-y-2"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: idx * 0.2, duration: 0.6 }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(56, 189, 248, 0.25)",
                  }}
                >
                  <div className="flex items-center mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mr-4"
                      style={{
                        background: `linear-gradient(135deg, ${feature.color}, ${feature.color}80)`,
                      }}
                    >
                      <feature.icon className="w-6 h-6 text-slate-50" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-50">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Right side - Metro Animation */}
            <div className="flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-full max-w-md"
              >
                <img
                  src="/metro.gif"
                  alt="Metro Animation"
                  className="rounded-2xl shadow-2xl w-full h-auto max-h-96 object-contain border border-slate-600/30"
                  style={{
                    mixBlendMode: "multiply",
                    filter:
                      "brightness(1.2) contrast(1.1) drop-shadow(0 25px 50px rgba(56, 189, 248, 0.15))",
                  }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl lg:text-5xl font-bold text-center text-slate-50 mb-20"
          >
            Workflow Journey
          </motion.h2>

          <div className="relative">
            {/* Workflow Steps */}
            <div className="space-y-16">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className={`flex items-center ${
                    index % 2 === 0 ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className="backdrop-blur-md rounded-2xl p-8 border border-slate-600/30 shadow-2xl max-w-md"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                      >
                        {step.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-slate-50">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-slate-300">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Central Track */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-600 transform -translate-x-1/2">
              <motion.div
                className="absolute top-0 w-3 h-3 bg-sky-400 rounded-full transform -translate-x-1/2"
                animate={{ y: ["0%", "100%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Process Highlight */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="backdrop-blur-md rounded-2xl p-12 border border-slate-600/30 shadow-2xl text-center"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-3xl font-bold text-slate-50 mb-6">
              Continuous Learning & Optimization
            </h3>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Every supervisor override and operational decision feeds back into
              our AI system, making MetroMind smarter and more efficient with
              each passing day.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-sky-400 mb-2">24/7</div>
                <div className="text-sm text-slate-400">Learning Mode</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  ∞
                </div>
                <div className="text-sm text-slate-400">Adaptation Cycles</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-amber-400 mb-2">
                  Real-time
                </div>
                <div className="text-sm text-slate-400">Optimization</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t border-slate-600/30 pt-16 pb-8"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                  }}
                >
                  <Train className="h-5 w-5 text-slate-50" />
                </div>
                <span className="text-xl font-bold text-slate-50">
                  MetroMind
                </span>
              </div>
              <p className="text-slate-400 max-w-xs">
                The Brain Behind Every Train Move. Smart scheduling & induction
                system for efficient metro operations.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h6 className="text-slate-50 font-semibold mb-4">Quick Links</h6>
              <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-slate-50 transition-colors duration-300"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h6 className="text-slate-50 font-semibold mb-4">Support</h6>
              <ul className="space-y-2">
                {supportLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-slate-50 transition-colors duration-300"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h6 className="text-slate-50 font-semibold mb-4">Contact Us</h6>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span className="text-slate-400 text-sm">
                    support@metromind.kochi
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400 text-sm">
                    +91 484 xxx xxxx
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-400 text-sm">
                    Kochi Metro Rail Limited
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-600/30 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">
              © {currentYear} MetroMind. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="/privacy"
                className="text-slate-400 hover:text-slate-50 transition-colors duration-300 text-sm"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-slate-400 hover:text-slate-50 transition-colors duration-300 text-sm"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
