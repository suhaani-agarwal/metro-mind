"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
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
  UserCircle,
  ShieldCheck,
  ArrowRight,
  Clock,
  TrendingUp,
  Linkedin,
  Twitter,
  Github,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";

const currentYear = new Date().getFullYear();

export default function LandingPage() {
  const t = useTranslations("Landing");

  const quickLinks = [
    { name: t("footer.links.home"), href: "/" },
    { name: t("footer.links.about"), href: "/about" },
    { name: t("footer.links.services"), href: "/services" },
    { name: t("footer.links.contact"), href: "/contact" },
  ];

  const supportLinks = [
    { name: t("footer.links.help"), href: "/help" },
    { name: t("footer.links.faq"), href: "/faq" },
    { name: t("footer.links.support"), href: "/support" },
  ];

  const featuresMetro = [
    {
      title: t("advancedFeatures.realTime.title"),
      description: t("advancedFeatures.realTime.description"),
      icon: Zap,
      color: "#38bdf8",
    },
    {
      title: t("advancedFeatures.ai.title"),
      description: t("advancedFeatures.ai.description"),
      icon: Brain,
      color: "#06d6a0",
    },
    {
      title: t("advancedFeatures.simulation.title"),
      description: t("advancedFeatures.simulation.description"),
      icon: Shield,
      color: "#fbbf24",
    },
  ];

  const workflowSteps = [
    {
      id: 1,
      title: t("workflow.ingestion.title"),
      description: t("workflow.ingestion.description"),
      icon: <Database className="w-8 h-8 text-sky-400" />,
    },
    {
      id: 2,
      title: t("workflow.optimisation.title"),
      description: t("workflow.optimisation.description"),
      icon: <Cpu className="w-8 h-8 text-emerald-400" />,
    },
    {
      id: 3,
      title: t("workflow.adjustments.title"),
      description: t("workflow.adjustments.description"),
      icon: <User className="w-8 h-8 text-amber-400" />,
    },
    {
      id: 4,
      title: t("workflow.finalPlan.title"),
      description: t("workflow.finalPlan.description"),
      icon: <CheckCircle className="w-8 h-8 text-pink-400" />,
    },
  ];

  const stats = [
    { value: "99.9%", label: t("stats.uptime"), icon: Clock },
    { value: "40%", label: t("stats.efficiency"), icon: TrendingUp },
    { value: "24/7", label: t("stats.monitoring"), icon: Brain },
    { value: "100+", label: t("stats.trains"), icon: Train },
  ];
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const navbarOpacity = useTransform(scrollY, [0, 100], [0.8, 0.95]);
  const { locale } = useParams();

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
      className="min-h-screen w-full overflow-x-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      {/* Enhanced Navbar */}
      <motion.nav
        className="fixed top-0 w-full z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled
            ? "rgba(15, 23, 42, 0.95)"
            : "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(56, 189, 248, 0.2)"
            : "1px solid rgba(71, 85, 105, 0.3)",
          boxShadow: scrolled
            ? "0 10px 40px rgba(0, 0, 0, 0.3)"
            : "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-3 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                  boxShadow: "0 8px 32px rgba(56, 189, 248, 0.3)",
                }}
              >
                <Train className="h-6 w-6 text-slate-50 relative z-10" />
                <motion.div
                  className="absolute inset-0 bg-white"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.2 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                MetroMind
              </span>
            </motion.div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-2">
              {[
                { name: t("features"), href: "#features" },
                { name: t("about"), href: "#about" },
                { name: t("contact"), href: "#contact" },
                { name: t("security"), href: "#security" },
              ].map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className="relative px-5 py-2 text-slate-300 font-medium transition-colors duration-300 group"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <span className="relative z-10 group-hover:text-sky-400 transition-colors duration-300">
                    {item.name}
                  </span>
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.a>
              ))}
            </div>

            {/* Mobile menu button */}
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-600/40 text-slate-300 hover:text-sky-400 hover:border-sky-400/60 transition-all duration-300"
              whileTap={{ scale: 0.9 }}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </motion.button>
          </div>

          {/* Mobile Menu */}
          <motion.div
            initial={false}
            animate={{
              height: isMobileMenuOpen ? "auto" : 0,
              opacity: isMobileMenuOpen ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden"
          >
            <div className="px-2 pt-2 pb-6 space-y-3">
              {[
                { name: t("features"), href: "#features" },
                { name: t("about"), href: "#about" },
                { name: t("contact"), href: "#contact" },
                { name: t("security"), href: "#security" },
              ].map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-3 rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-600/30 text-slate-300 hover:text-sky-400 hover:border-sky-400/60 transition-all duration-300"
                >
                  {item.name}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.nav>

      {/* Enhanced Hero Section */}
      <section className="relative min-h-screen flex items-center text-slate-50 overflow-hidden pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
            style={{
              background:
                "radial-gradient(circle, #38bdf8 0%, transparent 70%)",
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
            style={{
              background:
                "radial-gradient(circle, #06d6a0 0%, transparent 70%)",
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
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
              >
                <motion.h1
                  className="text-6xl lg:text-7xl font-bold leading-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.span
                    className="bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ backgroundSize: "200% 200%" }}
                  >
                    {t("heroTitle")}
                  </motion.span>
                  <br />
                  <span className="text-slate-50">{t("heroSubtitle1")}</span>
                  <br />
                  <span className="text-slate-50">{t("heroSubtitle2")}</span>
                </motion.h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-xl lg:text-2xl text-slate-300 leading-relaxed"
              >
                {t("heroDescription")}
                operations. Powered by AI to optimize every journey.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-6"
              >
                {/* Employee Login Button */}
                <motion.a
                  href={`/${locale}/security`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-sky-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <button className="relative w-full sm:w-auto px-8 py-4 bg-slate-800/30 backdrop-blur-xl border-2 border-sky-400/40 rounded-2xl text-slate-50 font-semibold flex items-center justify-center space-x-3 hover:border-sky-400/80 hover:bg-slate-800/50 transition-all duration-300 shadow-xl">
                    <UserCircle className="w-6 h-6 text-sky-400" />
                    <span className="text-lg">{t("employeeLogin")}</span>
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </button>
                </motion.a>

                {/* Admin Login Button */}
                <motion.a
                  href={`/${locale}/adminLogin`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <button className="relative w-full sm:w-auto px-8 py-4 bg-slate-800/30 backdrop-blur-xl border-2 border-emerald-400/40 rounded-2xl text-slate-50 font-semibold flex items-center justify-center space-x-3 hover:border-emerald-400/80 hover:bg-slate-800/50 transition-all duration-300 shadow-xl">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <span className="text-lg">{t("adminLogin")}</span>
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.3,
                      }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </button>
                </motion.a>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="flex flex-wrap items-center gap-6 pt-4"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-400 text-sm">
                    {t("realTimeTracking")}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span className="text-slate-400 text-sm">
                    {t("enterpriseSecurity")}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400 text-sm">
                    {t("aiOptimization")}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 text-center"
                style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(56, 189, 248, 0.1)",
                }}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800/60">
                    <stat.icon className="w-6 h-6 text-sky-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-50 mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
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
              {t("advancedFeatures.title")}
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              {t("advancedFeatures.subtitle")}
            </p>
            <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuresMetro.map((feature, idx) => (
              <motion.div
                key={feature.title}
                className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl transition-all duration-300"
                style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: idx * 0.2, duration: 0.6 }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: `0 25px 50px -12px ${feature.color}40`,
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
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-50 mb-4">
              {t("workflow.title")}
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {t("workflow.subtitle")}
            </p>
          </motion.div>

          <div className="relative">
            <div className="space-y-16">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className={`flex items-center ${index % 2 === 0 ? "justify-start" : "justify-end"
                    }`}
                >
                  <motion.div
                    className="backdrop-blur-md rounded-2xl p-8 border border-slate-600/30 shadow-2xl max-w-md relative overflow-hidden group"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-sky-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <div className="flex items-center space-x-4 mb-4 relative z-10">
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
                    <p className="text-slate-300 relative z-10">
                      {step.description}
                    </p>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Central Track */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-600/50 transform -translate-x-1/2">
              <motion.div
                className="absolute top-0 w-3 h-3 bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transform -translate-x-1/2"
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
            className="backdrop-blur-md rounded-2xl p-12 border border-slate-600/30 shadow-2xl text-center relative overflow-hidden group"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-sky-400/10 via-emerald-400/10 to-sky-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            <h3 className="text-3xl font-bold text-slate-50 mb-6 relative z-10">
              {t("learning.title")}
            </h3>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto relative z-10">
              {t("learning.description")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {[
                { value: "24/7", label: "Learning Mode", color: "text-sky-400" },
                { value: "∞", label: "Adaptation Cycles", color: "text-emerald-400" },
                { value: "Real-time", label: "Optimization", color: "text-amber-400" },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className={`text-4xl font-bold ${item.color} mb-2`}>
                    {item.value}
                  </div>
                  <div className="text-sm text-slate-400">{item.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer
        className="border-t border-slate-600/30 pt-16 pb-8 relative overflow-hidden"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
      >
        {/* Background elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/20 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <motion.div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                    boxShadow: "0 8px 32px rgba(56, 189, 248, 0.2)",
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Train className="h-6 w-6 text-slate-50" />
                </motion.div>
                <span className="text-2xl font-bold text-slate-50">
                  {t("heroTitle")}
                </span>
              </div>
              <p className="text-slate-400 max-w-xs mb-6">
                {t("footer.brandDesc")}
              </p>
              <div className="flex space-x-4">
                {[Twitter, Linkedin, Github].map((Icon, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    className="w-10 h-10 rounded-xl bg-slate-800/60 backdrop-blur-xl border border-slate-600/30 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-400/60 transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h6 className="text-slate-50 font-semibold mb-6 text-lg">
                {t("footer.quickLinks")}
              </h6>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-sky-400 transition-colors duration-300 flex items-center group"
                    >
                      <ArrowRight className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h6 className="text-slate-50 font-semibold mb-6 text-lg">
                {t("footer.support")}
              </h6>
              <ul className="space-y-3">
                {supportLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-emerald-400 transition-colors duration-300 flex items-center group"
                    >
                      <ArrowRight className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h6 className="text-slate-50 font-semibold mb-6 text-lg">
                {t("footer.contactUs")}
              </h6>
              <div className="space-y-4">
                {[
                  { icon: Mail, text: "support@metromind.kochi", color: "text-sky-400" },
                  { icon: Phone, text: "+91 484 xxx xxxx", color: "text-emerald-400" },
                  { icon: MapPin, text: "Kochi Metro Rail Limited", color: "text-amber-400" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 group">
                    <div className={`p-2 rounded-lg bg-slate-800/60 backdrop-blur-xl ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors duration-300">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-600/30 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm mb-4 md:mb-0">
              © {currentYear} {t("heroTitle")}. {t("footer.rights")}
            </p>
            <div className="flex space-x-6">
              <a
                href="/privacy"
                className="text-slate-400 hover:text-slate-50 transition-colors duration-300 text-sm"
              >
                {t("footer.privacy")}
              </a>
              <a
                href="/terms"
                className="text-slate-400 hover:text-slate-50 transition-colors duration-300 text-sm"
              >
                {t("footer.terms")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
