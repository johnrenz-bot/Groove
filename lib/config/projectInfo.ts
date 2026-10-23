/**
 * Project Information for GroovePH
 * Single source of truth for the /about-project page and Grooveyy AI knowledge.
 * Keep this in sync with the deployed platform capabilities.
 */

export const PROJECT_INFO = {
  fullName: "Groove: San Jose del Monte Bulacan's Web-Based Performing Arts Hub with Smart Chat Support and Studio Locator",
  shortName: "GroovePH",
  tagline: "A web-based performing arts hub for San Jose del Monte, Bulacan",
  academicContext: {
    degree: "Bachelor of Science in Information Technology",
    institution: "STI College San Jose Del Monte",
    year: "2025",
    type: "Capstone Project 2",
  },
  purpose:
    "To bridge the gap between performing artists and coaches in San Jose del Monte by providing a centralized platform for discovery, booking, communication, and digital agreements — eliminating reliance on informal referrals and scattered messaging.",
  objectives: [
    "Create a verified directory of performing arts coaches and choreographers",
    "Enable performers to discover, contact, and book coaches seamlessly",
    "Provide a studio locator with radius-based search for rehearsal spaces",
    "Implement smart chat support (Groovey AI) for performing arts guidance",
    "Facilitate digital session agreements with signature capture",
    "Build a community hub for dance, singing, acting, and theater disciplines",
  ],
  coreModules: [
    {
      name: "Super Admin Console",
      description:
        "Platform oversight: user verification, system settings, announcements, maintenance mode, audit logs, and analytics dashboard.",
    },
    {
      name: "Performing Artist (Coach/Choreographer)",
      description:
        "Profile management, booking calendar, client roster, verification documents, portfolio showcase, and earnings tracking.",
    },
    {
      name: "Client (Performer/Student)",
      description:
        "Coach discovery, appointment booking, schedule management, direct messaging, Groovey AI assistant, and community feed.",
    },
  ],
  keyFeatures: [
    "Verified coach directory with document-based verification",
    "Studio locator with 1/3/5/10 km radius search (curated + OpenStreetMap)",
    "Groovey AI — performing arts specialized chat assistant",
    "Digital session agreements with drawn signatures",
    "Real-time messaging between clients and coaches",
    "Community discipline pages (Dance, Singing, Acting, Theater)",
    "Role-based dashboards (Client, Coach, Admin)",
    "Dark/Light theme with seasonal accents",
  ],
  limitations: [
    {
      title: "No Payment Processing",
      description:
        "Rates are agreed directly between coach and client; Groove does not handle payments, transactions, or commissions.",
    },
    {
      title: "Geographic Focus",
      description:
        "Studio locator and curated listings are centered on San Jose del Monte, Bulacan. Coaches from other areas can join but venue coverage is limited.",
    },
    {
      title: "No Push/Email Notifications",
      description:
        "In-app notification bell only. Email confirmations for registration only; no automated email/SMS for bookings or messages.",
    },
    {
      title: "No Achievement/Badge System",
      description:
        "UI components exist but the progression system is not wired up. No gamification or reputation scoring currently active.",
    },
    {
      title: "Limited Offline Support",
      description: "Requires internet connection. No offline mode or local caching for core features.",
    },
    {
      title: "Single-Language Primary",
      description: "English primary with Filipino (Wika) toggle. Full localization of all content is a future enhancement.",
    },
  ],
  surveyStats: [
    {
      question: "Primary performing arts interest",
      stat: "57.9% Dance, 25.7% Singing, 8.6% Acting, 5.9% Theater, 2.0% Others (Spoken Poetry, Bands, Clowns & Magic, Comedy)",
    },
    {
      question: "Difficulty finding coaches",
      stat: "78.9% Very Difficult, 16.4% Difficult, 4.7% Neutral",
    },
    {
      question: "Primary coach discovery method",
      stat: "88.8% Referrals, 7.2% Studios/Schools, 3.9% Online Platforms",
    },
    {
      question: "Difficulty finding right coach for genre",
      stat: "82.2% Always, 9.2% Often, 8.6% Sometimes/Rarely/Never",
    },
    {
      question: "Affordability challenge",
      stat: "96.1% Yes, 3.9% No",
    },
    {
      question: "Quick response difficulty",
      stat: "82.2% Always, 9.2% Often, 8.6% Sometimes/Rarely/Never",
    },
    {
      question: "Website would encourage engagement",
      stat: "98.7% Yes",
    },
    {
      question: "Difficulty finding nearby studio",
      stat: "88.8% Difficult/Very Difficult",
    },
    {
      question: "Preferred payment method",
      stat: "98% External (GCash/Bank Transfer)",
    },
    {
      question: "Need for dedicated collaboration platform",
      stat: "88.8% Yes",
    },
  ],
  developers: [
    { name: "Charles John L. Carbonel", role: "Project Lead / Full-Stack Developer" },
    { name: "John Renz C. Bandianon", role: "Back-End Developer / Database Architect" },
    { name: "Melaiza B. Fernandez", role: "Front-End Developer / UI Designer" },
    { name: "Adrian Martin D. Salaysay", role: "Quality Assurance / Documentation" },
  ],
  advisers: [
    { name: "Janice Flores", role: "Capstone Project Adviser" },
    { name: "Chris Jonel B. Barrameda", role: "CPE Instructor" },
    { name: "Deffrey Joshua A. Austria", role: "IT Instructor" },
    { name: "Norvin Shaq Lintag", role: "Capstone Project Coordinator" },
    { name: "Cedrick Jordan Nepomuceno", role: "Former Capstone 1 Project Adviser" },
  ],
  techStack: [
    { name: "Next.js 14+ (App Router)" },
    { name: "React 18 + TypeScript" },
    { name: "Supabase (PostgreSQL + Auth + Realtime + Storage)" },
    { name: "Tailwind CSS + Custom Design System" },
    { name: "Leaflet + OpenStreetMap (Studio Locator)" },
    { name: "Google Gemini (Groovey AI)" },
    { name: "Vercel (Deployment)" },
  ],
} as const;