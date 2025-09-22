
"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Container, Navbar, Nav, Row, Col } from "react-bootstrap";
import {
  ArrowRight,
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
} from "lucide-react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

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

// Metro-themed 3D train car component
function TrainCar({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[2.5, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// 3D Metro Line Component
function Metro3DFeature() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.25;
    }
  });

  const colors = ["#0ea5e9", "#0284c7", "#0369a1", "#075985"];

  return (
    <group ref={groupRef} position={[0, 0, 0]} castShadow>
      {colors.map((color, index) => (
        <TrainCar
          key={index}
          position={[index * 2.6, 0, 0]}
          color={color}
        />
      ))}
      <Text fontSize={0.5} color="#0ea5e9" position={[3.5, 1, 0]}>
        Kochi Metro
      </Text>
    </group>
  );
}

// Features list
const featuresMetro = [
  {
    title: "Real-Time Data Ingestion",
    description:
      "Consolidates Maximo job cards, IoT fitness sensors, cleaning rosters, branding dashboards, and stabling maps.",
    icon: Zap,
    color: "#0ea5e9",
  },
  {
    title: "AI Scheduling & Optimisation",
    description:
      "Balances fitness, maintenance, branding, cleaning, mileage, and stabling using multi-objective algorithms.",
    icon: Brain,
    color: "#0284c7",
  },
  {
    title: "3D Yard Simulation",
    description:
      "Drag-and-drop depot view for testing scenarios and minimizing shunting time.",
    icon: Shield,
    color: "#0369a1",
  },
];

const metroGlow =
  "shadow-[0_0_28px_0_rgba(14,165,233,0.3)] ring-2 ring-blue-400";

// Workflow steps
const workflowSteps = [
  {
    id: 1,
    title: "Data Ingestion",
    description: "Nightly Maximo exports, daily constraints ingestion, and data sync.",
    icon: <Database className="w-8 h-8 text-blue-500" />,
  },
  {
    id: 2,
    title: "Optimisation",
    description: "Quantum-inspired multi-objective scheduling optimisation.",
    icon: <Cpu className="w-8 h-8 text-green-500" />,
  },
  {
    id: 3,
    title: "Supervisor Adjustments",
    description: "Human-in-the-loop verification and AI-assisted overrides.",
    icon: <User className="w-8 h-8 text-yellow-500" />,
  },
  {
    id: 4,
    title: "Final Plan",
    description: "Trains ready with validated schedules for morning operations.",
    icon: <CheckCircle className="w-8 h-8 text-red-500" />,
  },
];

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

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
    <>
{/* Navbar */}
<Navbar
  expand="lg"
  sticky="top"
  className="py-3"
  style={{
    backgroundColor: "#000", // solid black background
  }}
>
  <Container>
    <Navbar.Brand href="/" className="text-white fw-bold">
      MetroMind
    </Navbar.Brand>
    <Navbar.Toggle
      aria-controls="basic-navbar-nav"
      className="bg-white"
    />
    <Navbar.Collapse id="basic-navbar-nav">
      <Nav className="ms-auto">
        <Nav.Link href="#features" className="text-white">
          Features
        </Nav.Link>
        <Nav.Link href="#about" className="text-white">
          About
        </Nav.Link>
        <Nav.Link href="#contact" className="text-white">
          Contact
        </Nav.Link>
        <Nav.Link as={Link} href="/security" className="text-white">
          Security
        </Nav.Link>

        <Nav.Link href="/login">
          <button className="ms-3 bg-[#00A885] text-white px-4 py-2 rounded hover:bg-[#009174] transition">
            Login
          </button>
        </Nav.Link>
      </Nav>
    </Navbar.Collapse>
  </Container>
</Navbar>


      {/* Hero Section with Video */}
      <section
        className="position-relative min-vh-100 d-flex align-items-center text-white"
        style={{ overflow: "hidden" }}
      >
        <div
          className="position-absolute w-100 h-100"
          style={{ top: 0, left: 0, zIndex: 0 }}
        >
          <video
            src="https://media.istockphoto.com/id/1971890728/video/the-train-has-arrived-at-the-railway-station.mp4?s=mp4-640x640-is&k=20&c=wzbBXSjZeoXPNPMSuayUl4ujiaP1tTrRqV1bFGPmlNI="
            autoPlay
            loop
            muted
            playsInline
            className="w-100 h-100 object-fit-cover"
            style={{
              filter: "blur(8px) brightness(0.5)",
              objectPosition: "center",
            }}
          />
          <div
            className="position-absolute w-100 h-100"
            style={{
              top: 0,
              left: 0,
              background: "rgba(0, 0, 0, 0.4)",
              zIndex: 1,
            }}
          />
        </div>
        <Container className="position-relative z-2">
          <Row className="align-items-center">
            <Col lg={8} className="mb-5 mb-lg-0">
              <h1
                className="fw-bold mt-3"
                style={{ fontSize: "4rem", lineHeight: "1.2" }}
              >
                <span
                  className="text-primary"
                  style={{ fontSize: "4.5rem" }}
                >
                  MetroMind
                </span>
                <br />
                The Brain Behind
                <br />
                Every Train Move
              </h1>
              <p
                className="mt-4"
                style={{ fontSize: "1.5rem", color: "#d3d3d3" }}
              >
                Smart Train Induction & Scheduling System for Kochi Metro. <br />
                Revolutionizing metro operations with AI-powered optimization
                and real-time intelligence.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 mt-5">
                <button className="bg-[#00A885] text-white text-xl px-6 py-3 rounded fw-bold shadow flex items-center gap-2 hover:opacity-90 transition">
  Access Dashboard
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


                <button className="flex items-center px-4 py-3 text-white border border-white rounded text-lg hover:bg-white/10 transition">
                  <Play className="me-2" /> Watch Demo
                </button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
<section id="features" className="py-5 bg-gradient-to-b from-blue-50 to-white">
  <Container>
    <h2 className="text-center mb-5 fw-bold text-blue-900">Features</h2>
    <div className="row g-4 items-center">
      {/* Left side - Metro GIF */}
      <div className="col-lg-6 flex items-center justify-center">
        <img
          src="/metro.gif" // 👈 place your uploaded file in /public as metro.gif
          alt="Metro Animation"
          className="rounded-xl shadow-lg w-full h-auto max-h-[380px] object-contain"
        />
      </div>

      {/* Right side - Features cards */}
      <div className="col-lg-6">
        {featuresMetro.map((feature, idx) => (
          <motion.div
            key={feature.title}
            className={`card mb-4 rounded-lg p-5 bg-white border-2 border-[#00A885] cursor-pointer ${metroGlow}`}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.07 }}
            transition={{ delay: idx * 0.2, duration: 0.6 }}
            style={{
              borderRadius: "15px",
              boxShadow: "0 0 15px rgba(0, 168, 133, 0.4)", // teal glow
            }}
          >
            <div className="flex items-center mb-3 text-[#00A885]">
              <feature.icon size={30} />
              <h5 className="ms-3 font-bold text-xl">{feature.title}</h5>
            </div>
            <p className="text-gray-700 text-base">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </Container>
</section>


      {/* Workflow Section */}
      <section
        id="workflow"
        className="relative min-h-screen bg-gradient-to-b from-white to-gray-50 py-24"
      >
        <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold text-center text-gray-900 mb-20"
          >
            Workflow Journey
          </motion.h2>
          <div className="relative flex justify-center">
            {/* Track */}
            <div className="absolute top-0 bottom-0 flex flex-col items-center">
              <div className="w-1 bg-gray-400 rounded-full h-full relative">
                <div className="absolute inset-0 flex flex-col justify-between py-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-1 bg-gray-600 mx-auto rounded-sm"
                    />
                  ))}
                </div>
              </div>
              <motion.div
                className="absolute"
                initial={{ y: 0 }}
                whileInView={{ y: "90%" }}
                transition={{ duration: 3, ease: "easeInOut" }}
              >
                <Train className="w-10 h-10 text-blue-600" />
              </motion.div>
            </div>
            {/* Workflow Steps */}
            <div className="relative space-y-32 w-full max-w-3xl">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? "justify-start" : "justify-end"
                  }`}
                >
                  <div className="bg-white shadow-lg rounded-xl p-6 w-80">
                    <div className="flex items-center space-x-4">
                      {step.icon}
                      <h3 className="text-xl font-semibold text-gray-800">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-4 text-gray-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Container>
      </section>


{/* Process Highlight */}
<section style={{ backgroundColor: "#f8f9fa", padding: "4rem 0" }}>
  <div
    className={`metro-card-elevated p-8 border-primary/20 ${
      isVisible ? "metro-animate-slide-up animate-in" : "metro-animate-slide-up"
    }`}
    style={{ animationDelay: "1.2s" }}
  >
    <div className="text-center">
      <h3 className="text-2xl font-bold text-foreground mb-4">
        Continuous Learning & Optimization
      </h3>
      <p className="max-w-2xl mx-auto mb-6 text-[#00A885]">
        Every supervisor override and operational decision feeds back into our
        AI system, making MetroMind smarter and more efficient with each passing
        day.
      </p>
      <div className="flex justify-center space-x-8">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">24/7</div>
          <div className="text-sm text-muted-foreground">Learning Mode</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">∞</div>
          <div className="text-sm text-muted-foreground">Adaptation Cycles</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-warning">Real-time</div>
          <div className="text-sm text-muted-foreground">Optimization</div>
        </div>
      </div>
    </div>
  </div>
</section>




      {/* Footer */}
      <footer
        style={{
          backgroundColor: "#f2f2f2",
          color: "#333",
          borderTop: "1px solid #ddd",
          paddingTop: "2rem",
          paddingBottom: "2rem",
        }}
      >
        <Container>
          <Row className="mb-4">
            <Col md={4} className="mb-3">
              <div className="d-flex align-items-center mb-2">
                <div
                  style={{
                    background:
                      "linear-gradient(to bottom right, #00bfff, #87cefa)",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                  }}
                  className="d-flex align-items-center justify-content-center"
                >
                  <strong style={{ color: "#fff", fontSize: "1.25rem" }}>
                    M
                  </strong>
                </div>
                <h5
                  className="ms-2 mb-0"
                  style={{ color: "#333", fontWeight: "600" }}
                >
                  MetroMind
                </h5>
              </div>
              <p
                style={{
                  color: "#666",
                  fontSize: "0.9rem",
                  maxWidth: "280px",
                }}
              >
                The Brain Behind Every Train Move. Smart scheduling & induction
                system for efficient metro operations.
              </p>
            </Col>
            <Col md={2} className="mb-3">
              <h6 style={{ color: "#444", fontWeight: "600" }}>Quick Links</h6>
              <ul className="list-unstyled">
                {quickLinks.map((link) => (
                  <li key={link.name} className="mb-2">
                    <a
                      href={link.href}
                      style={{
                        color: "#666",
                        fontSize: "0.9rem",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#00bfff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#666")
                      }
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </Col>
            <Col md={2} className="mb-3">
              <h6 style={{ color: "#444", fontWeight: "600" }}>Support</h6>
              <ul className="list-unstyled">
                {supportLinks.map((link) => (
                  <li key={link.name} className="mb-2">
                    <a
                      href={link.href}
                      style={{
                        color: "#666",
                        fontSize: "0.9rem",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#00bfff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#666")
                      }
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </Col>
            <Col md={4} className="mb-3">
              <h6 style={{ color: "#444", fontWeight: "600" }}>
                Contact Us
              </h6>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                <div className="d-flex align-items-center mb-2">
                  <Mail size={16} className="me-2" style={{ color: "#00bfff" }} />
                  <span>support@metromind.kochi</span>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <Phone size={16} className="me-2" style={{ color: "#00bfff" }} />
                  <span>+91 484 xxx xxxx</span>
                </div>
                <div className="d-flex align-items-center">
                  <MapPin size={16} className="me-2" color="#00bfff" />
                  <span>Kochi Metro Rail Limited</span>
                </div>
              </div>
            </Col>
          </Row>
          <div
            className="d-flex flex-column flex-md-row justify-content-between align-items-center"
            style={{ borderTop: "1px solid #ddd", paddingTop: "1rem" }}
          >
            <p
              style={{
                color: "#666",
                fontSize: "0.8rem",
                margin: 0,
              }}
            >
              © {currentYear} MetroMind. All rights reserved.
            </p>
            <div className="mt-2 mt-md-0">
              <a
                href="/privacy"
                style={{
                  color: "#666",
                  marginRight: "1rem",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#00bfff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "#666")
                }
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                style={{
                  color: "#666",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#00bfff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "#666")
                }
              >
                Terms of Service
              </a>
            </div>
          </div>
        </Container>
      </footer>
    </>
  );
}