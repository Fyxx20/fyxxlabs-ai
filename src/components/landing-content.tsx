"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  X,
  ChevronDown,
  Sparkles,
  Zap,
  ShoppingBag,
  FileText,
  Mail,
  Scale,
  MessageSquare,
  Globe,
  Shield,
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
  Copy,
  Package,
  Store,
  Megaphone,
  Target,
  Eye,
  TrendingUp,
} from "lucide-react";

/* ─── Animation variants ─── */

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (d: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: d },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Particles ─── */

const PARTICLES = [
  { w: 3, x: 5, y: 10, d: 0, dur: 15 },
  { w: 2, x: 15, y: 30, d: 1.5, dur: 20 },
  { w: 4, x: 25, y: 60, d: 3, dur: 12 },
  { w: 2, x: 35, y: 20, d: 0.5, dur: 18 },
  { w: 3, x: 45, y: 80, d: 2, dur: 14 },
  { w: 2, x: 55, y: 40, d: 4, dur: 16 },
  { w: 3, x: 65, y: 70, d: 1, dur: 22 },
  { w: 4, x: 75, y: 15, d: 3.5, dur: 13 },
  { w: 2, x: 85, y: 50, d: 2.5, dur: 17 },
  { w: 3, x: 92, y: 35, d: 0, dur: 19 },
  { w: 2, x: 10, y: 90, d: 4.5, dur: 21 },
  { w: 3, x: 30, y: 5, d: 1, dur: 15 },
  { w: 2, x: 50, y: 95, d: 3, dur: 18 },
  { w: 4, x: 70, y: 25, d: 2, dur: 14 },
  { w: 2, x: 88, y: 65, d: 0.5, dur: 20 },
];

function Particles() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="particle-animate absolute rounded-full"
          style={
            {
              width: p.w,
              height: p.w,
              left: `${p.x}%`,
              top: `${p.y}%`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.d}s`,
              backgroundColor:
                i % 3 === 0
                  ? "rgba(124,58,237,0.25)"
                  : i % 3 === 1
                    ? "rgba(6,182,212,0.2)"
                    : "rgba(59,130,246,0.2)",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ─── Hero Demo Animation ─── */

function HeroDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 3000);
    const t3 = setTimeout(() => setStep(3), 5200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <motion.div variants={fadeInUp} custom={0.6} className="mx-auto mt-16 max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 bg-white/[0.04] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
          </div>
          <div className="ml-3 flex-1 rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-xs text-slate-500">
            fyxxlabs.com/generate
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Input */}
          <div className="flex gap-3">
            <div className="relative flex-1 overflow-hidden rounded-xl border border-white/[0.1] bg-slate-800/80 px-4 py-3">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.span
                    key="placeholder"
                    exit={{ opacity: 0 }}
                    className="font-mono text-sm text-slate-500"
                  >
                    Collez un lien AliExpress…
                  </motion.span>
                )}
                {step >= 1 && (
                  <motion.span
                    key="url"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-mono text-sm text-cyan-400"
                  >
                    https://aliexpress.com/item/1005006…
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              animate={step === 1 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
            >
              Générer
            </motion.button>
          </div>

          {/* Thinking */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 flex items-center gap-3 overflow-hidden"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-2 w-2 rounded-full bg-violet-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <span className="text-sm text-violet-400">
                  Fyxx AI thinking… Analyse du produit en cours
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated preview */}
          <AnimatePresence>
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5"
              >
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <Check className="h-4 w-4" />
                  <span>Boutique générée avec succès</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/40 to-cyan-500/30">
                        <Package className="h-7 w-7 text-violet-300" />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-white">LED Therapy Pro</p>
                        <p className="font-mono text-lg font-bold text-violet-400">49,90€</p>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap content-start gap-2">
                    {["Homepage", "Fiche produit", "FAQ", "CGV", "Emails", "Ads"].map(
                      (page) => (
                        <span
                          key={page}
                          className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400"
                        >
                          {page} ✓
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── FAQ Item ─── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:bg-white/[0.04]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <span className="pr-4 font-display font-medium text-white">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 leading-relaxed text-slate-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Section wrapper ─── */

function Section({
  children,
  id,
  className = "",
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      className={`relative py-24 md:py-32 ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </motion.section>
  );
}

/* ─── Data ─── */

const TIMELINE_STEPS = [
  {
    num: "01",
    title: "Coller un lien",
    desc: "Collez le lien d'un produit AliExpress. C'est tout ce dont l'IA a besoin.",
    icon: Copy,
  },
  {
    num: "02",
    title: "Analyse IA",
    desc: "L'IA extrait les données, analyse le marché et crée la stratégie.",
    icon: Eye,
  },
  {
    num: "03",
    title: "Génération",
    desc: "Branding, textes, fiches, légal, marketing — tout est créé automatiquement.",
    icon: Zap,
  },
  {
    num: "04",
    title: "Boutique pro",
    desc: "Votre boutique Shopify est prête à être exportée et à vendre.",
    icon: Store,
  },
];

const PROBLEMS = [
  "Écrire les textes soi-même",
  "Gérer le juridique RGPD",
  "Faire le design et le branding",
  "Créer le marketing et les ads",
];

const SOLUTIONS = [
  "Tout généré par l'IA",
  "Cohérent et conforme",
  "Prêt à vendre immédiatement",
  "Professionnel et optimisé",
];

const AI_PRODUCTS = [
  { icon: FileText, title: "Fiche produit", desc: "Copywriting persuasif, SEO-optimisé et unique pour chaque produit." },
  { icon: MessageSquare, title: "FAQ dynamique", desc: "Questions-réponses générées à partir de l'analyse produit." },
  { icon: Target, title: "Offres & bundles", desc: "Stratégie de prix, upsells et offres irrésistibles." },
  { icon: Megaphone, title: "Facebook & TikTok Ads", desc: "Textes publicitaires prêts à être lancés sur les plateformes." },
  { icon: Mail, title: "Séquences email", desc: "Emails de bienvenue, abandon panier et post-achat." },
  { icon: Scale, title: "Pages légales", desc: "CGV, politique de confidentialité, mentions légales conformes." },
];

const EXAMPLES = [
  {
    niche: "Fitness",
    store: "FitPulse Pro",
    product: "Bandes de résistance premium",
    price: "34,90€",
    gradient: "from-emerald-500/30 to-teal-500/20",
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    niche: "Maison",
    store: "CozyNest",
    product: "Lampe LED lévitation",
    price: "59,90€",
    gradient: "from-amber-500/30 to-orange-500/20",
    accent: "text-amber-400",
    border: "border-amber-500/20",
  },
  {
    niche: "Tech",
    store: "NexWave",
    product: "Écouteurs sans fil ANC",
    price: "44,90€",
    gradient: "from-blue-500/30 to-violet-500/20",
    accent: "text-blue-400",
    border: "border-blue-500/20",
  },
];

const PLANS = [
  {
    name: "CREATE",
    price: "29",
    unit: "€",
    period: "par création",
    color: "violet",
    features: [
      "Boutique Shopify complète",
      "Copywriting IA unique",
      "Branding sur mesure",
      "Pages légales RGPD",
      "Export Shopify en 1 clic",
    ],
    cta: "Créer une boutique",
    popular: false,
  },
  {
    name: "PRO",
    price: "39",
    unit: "€/mois",
    period: "",
    color: "violet",
    features: [
      "5 boutiques / jour",
      "Max 20 / mois",
      "Scan illimité",
      "IA illimitée",
      "Support prioritaire",
    ],
    cta: "Commencer Pro",
    popular: true,
  },
  {
    name: "AGENCE",
    price: "79",
    unit: "€/mois",
    period: "",
    color: "cyan",
    features: [
      "10 boutiques / jour",
      "Max 60 / mois",
      "Export avancé multi-format",
      "Marque blanche",
      "API & intégrations",
    ],
    cta: "Passer Agence",
    popular: false,
  },
];

const FAQS = [
  {
    q: "Les textes générés sont-ils vraiment uniques ?",
    a: "Oui. Chaque texte est généré par notre IA spécialisée e-commerce. Aucun copier-coller : tout est original, optimisé SEO et adapté à votre niche.",
  },
  {
    q: "Le contenu est-il conforme légalement ?",
    a: "Absolument. FyxxLabs génère des CGV, politique de confidentialité et mentions légales conformes au droit européen et au RGPD.",
  },
  {
    q: "C'est compatible avec Shopify ?",
    a: "Oui, l'export est conçu nativement pour Shopify. Vous importez votre boutique en quelques clics avec tous les éléments : produits, pages, navigation.",
  },
  {
    q: "Puis-je obtenir un remboursement ?",
    a: "Vous pouvez annuler votre abonnement à tout moment. Les plans mensuels sont résiliables en fin de période. Le plan CREATE à l'unité n'est pas remboursable après génération.",
  },
  {
    q: "Combien de temps faut-il pour générer une boutique ?",
    a: "En moyenne 60 secondes. L'IA analyse le produit, crée le branding, rédige les textes et structure la boutique complète en un temps record.",
  },
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export function LandingContent({
  hasSession,
  hasStore,
}: {
  hasSession: boolean;
  hasStore: boolean;
}) {
  const ctaCreate = !hasSession ? "/signup" : hasStore ? "/app/dashboard" : "/onboarding";
  const ctaScan = !hasSession ? "/signup" : "/app/dashboard";
  const [exampleIdx, setExampleIdx] = useState(0);

  // Auto-rotate examples
  useEffect(() => {
    const timer = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-900 text-white selection:bg-violet-600/40">
      <Particles />

      {/* ────────── HEADER ────────── */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 font-display text-lg font-bold text-white shadow-lg shadow-violet-600/20">
              F
            </div>
            <span className="hidden font-display text-lg font-bold text-white sm:inline">
              FyxxLabs
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-6 md:flex">
              <a
                href="#demo"
                className="text-sm text-slate-400 transition-colors duration-200 hover:text-white"
              >
                Produit
              </a>
              <a
                href="#pricing"
                className="text-sm text-slate-400 transition-colors duration-200 hover:text-white"
              >
                Tarifs
              </a>
              <a
                href="#faq"
                className="text-sm text-slate-400 transition-colors duration-200 hover:text-white"
              >
                FAQ
              </a>
            </div>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Connexion
            </Link>
            <Link
              href={ctaCreate}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all duration-200 hover:bg-violet-500 hover:shadow-violet-600/40"
            >
              Commencer
            </Link>
          </nav>
        </div>
      </header>

      {/* ────────── HERO ────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28">
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div
            className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-violet-600/[0.12] blur-[120px]"
            style={{ animation: "hero-gradient 12s ease-in-out infinite" }}
          />
          <div
            className="absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.08] blur-[120px]"
            style={{ animation: "hero-gradient 15s ease-in-out infinite 3s" }}
          />
          <div
            className="absolute bottom-0 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/[0.06] blur-[120px]"
            style={{ animation: "hero-gradient 10s ease-in-out infinite 6s" }}
          />
        </div>

        <motion.div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} custom={0} className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Propulsé par l&apos;IA — Nouvelle génération e-commerce
            </div>
          </motion.div>

          {/* Title */}
          <div className="mt-8 text-center">
            <motion.h1
              variants={fadeInUp}
              custom={0.1}
              className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Un lien produit.
            </motion.h1>
            <motion.h1
              variants={fadeInUp}
              custom={0.2}
              className="mt-2 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="gradient-text">Une boutique Shopify.</span>
            </motion.h1>
            <motion.h1
              variants={fadeInUp}
              custom={0.3}
              className="mt-2 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Prête à vendre.
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            variants={fadeInUp}
            custom={0.4}
            className="mx-auto mt-7 max-w-2xl text-center text-lg leading-relaxed text-slate-400 md:text-xl"
          >
            FyxxLabs génère automatiquement : branding, fiches produits, pages légales, marketing et structure complète grâce à l&apos;IA.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            custom={0.5}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href={ctaCreate}
              className="group flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-violet-600/25 transition-all duration-300 hover:bg-violet-500 hover:shadow-violet-600/40 hover:-translate-y-0.5"
            >
              <Sparkles className="h-5 w-5" />
              Créer ma boutique
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href={ctaScan}
              className="group flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-0.5"
            >
              <Search className="h-5 w-5 text-cyan-400" />
              Scanner ma boutique
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Micro-proofs */}
          <motion.div
            variants={fadeInUp}
            custom={0.55}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500"
          >
            {[
              { icon: Clock, text: "60 secondes" },
              { icon: FileText, text: "Textes uniques" },
              { icon: Shield, text: "Conforme RGPD" },
              { icon: Globe, text: "Export Shopify" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-violet-500/70" />
                {text}
              </span>
            ))}
          </motion.div>

          {/* Hero Demo */}
          <HeroDemo />
        </motion.div>
      </section>

      {/* ────────── DEMO TIMELINE ────────── */}
      <Section id="demo">
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Du lien au site, en{" "}
            <span className="gradient-text">60 secondes</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Un processus en 4 étapes. Aucune compétence technique requise.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-6 md:grid-cols-4">
          {TIMELINE_STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              variants={fadeInUp}
              custom={i * 0.1}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.04]"
            >
              {/* Connector line (desktop) */}
              {i < TIMELINE_STEPS.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-violet-500/40 to-transparent md:block" />
              )}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 text-violet-400 transition-colors group-hover:bg-violet-600/20">
                <step.icon className="h-6 w-6" />
              </div>
              <span className="font-mono text-xs font-bold text-violet-500/60">{step.num}</span>
              <h3 className="mt-1 font-display text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Preview mockup */}
        <motion.div
          variants={scaleIn}
          className="mt-16 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1"
        >
          <div className="grid gap-1 sm:grid-cols-4">
            {[
              { label: "Page d'accueil", sublabel: "/ homepage" },
              { label: "Fiche produit", sublabel: "/ product" },
              { label: "FAQ", sublabel: "/ faq" },
              { label: "CGV", sublabel: "/ legal" },
            ].map((page, i) => (
              <div
                key={page.label}
                className="flex flex-col items-center rounded-xl bg-white/[0.03] p-6 text-center transition-colors hover:bg-white/[0.06]"
              >
                <div
                  className="mb-3 h-24 w-full rounded-lg bg-gradient-to-br opacity-60"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(124,58,237,${0.15 + i * 0.05}), rgba(6,182,212,${0.1 + i * 0.04}))`,
                  }}
                />
                <p className="text-sm font-semibold text-white">{page.label}</p>
                <p className="font-mono text-xs text-slate-500">{page.sublabel}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ────────── PROBLEM → SOLUTION ────────── */}
      <Section className="border-y border-white/[0.04]">
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Plus de freelancers.{" "}
            <span className="gradient-text">Plus d&apos;attente.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Ce qui prenait des jours et des centaines d&apos;euros est maintenant automatisé.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* Problems */}
          <motion.div
            variants={fadeInUp}
            className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-8"
          >
            <h3 className="mb-6 font-display text-lg font-semibold text-red-400">Avant</h3>
            <div className="space-y-4">
              {PROBLEMS.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <X className="h-4 w-4 text-red-400" />
                  </div>
                  <span className="text-slate-300">{p}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Solutions */}
          <motion.div
            variants={fadeInUp}
            custom={0.15}
            className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-8"
          >
            <h3 className="mb-6 font-display text-lg font-semibold text-emerald-400">
              Avec FyxxLabs
            </h3>
            <div className="space-y-4">
              {SOLUTIONS.map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-slate-300">{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ────────── CREATE vs SCAN ────────── */}
      <Section id="features">
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Deux outils,{" "}
            <span className="gradient-text">une mission</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Créez votre boutique de zéro ou analysez un site existant.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {/* CREATE */}
          <motion.div
            variants={fadeInUp}
            className="group relative overflow-hidden rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-8 transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_0_60px_rgba(124,58,237,0.08)]"
          >
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl transition-all duration-500 group-hover:bg-violet-600/20" />
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/15">
                <ShoppingBag className="h-7 w-7 text-violet-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white">CREATE</h3>
              <p className="mt-2 text-slate-400">
                Génération complète d&apos;une boutique Shopify à partir d&apos;un lien produit.
              </p>
              <ul className="mt-6 space-y-3">
                {["Copywriting persuasif", "Branding complet", "Pages légales", "Marketing & ads", "Export Shopify"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-violet-400" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <Link
                href={ctaCreate}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 hover:shadow-violet-600/30"
              >
                Créer une boutique
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          {/* SCAN */}
          <motion.div
            variants={fadeInUp}
            custom={0.15}
            className="group relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-8 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_60px_rgba(6,182,212,0.08)]"
          >
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl transition-all duration-500 group-hover:bg-cyan-500/20" />
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15">
                <BarChart3 className="h-7 w-7 text-cyan-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white">SCAN</h3>
              <p className="mt-2 text-slate-400">
                Analyse complète de votre boutique e-commerce avec score et recommandations.
              </p>
              <ul className="mt-6 space-y-3">
                {["Note sur 100", "Recommandations IA", "Analyse conversion", "Benchmark concurrents", "Plan d'action"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-cyan-400" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <Link
                href={ctaScan}
                className="mt-8 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20"
              >
                Scanner mon site
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ────────── CE QUE L'IA PRODUIT ────────── */}
      <Section className="border-y border-white/[0.04]">
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Ce que l&apos;IA{" "}
            <span className="gradient-text">produit pour vous</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Chaque élément est généré, optimisé et prêt à être utilisé.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_PRODUCTS.map((item, i) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              custom={i * 0.08}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.04] hover:-translate-y-1"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 text-violet-400 transition-colors group-hover:bg-violet-600/20">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ────────── EXEMPLES ────────── */}
      <Section id="examples">
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Exemples de boutiques{" "}
            <span className="gradient-text">générées</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            De vrais résultats. De vraies niches. Générés en 60 secondes.
          </p>
        </motion.div>

        <div className="relative mt-16">
          {/* Carousel */}
          <div className="overflow-hidden">
            <motion.div
              className="flex"
              animate={{ x: `-${exampleIdx * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {EXAMPLES.map((ex) => (
                <div key={ex.niche} className="w-full shrink-0 px-2">
                  <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    {/* Store header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${ex.gradient}`}
                        >
                          <Store className={`h-5 w-5 ${ex.accent}`} />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-white">{ex.store}</p>
                          <p className="text-xs text-slate-500">Niche {ex.niche}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full border ${ex.border} bg-white/[0.03] px-3 py-1 text-xs ${ex.accent}`}
                      >
                        IA générée
                      </span>
                    </div>

                    {/* Store content */}
                    <div className="grid gap-6 p-6 md:grid-cols-2">
                      {/* Product visual */}
                      <div
                        className={`flex h-52 items-center justify-center rounded-xl bg-gradient-to-br ${ex.gradient}`}
                      >
                        <Package className="h-16 w-16 text-white/30" />
                      </div>

                      {/* Product details */}
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Produit vedette
                        </span>
                        <h4 className="mt-2 font-display text-xl font-bold text-white">
                          {ex.product}
                        </h4>
                        <p className="mt-1 font-mono text-2xl font-bold text-violet-400">
                          {ex.price}
                        </p>
                        <div className="mt-2 flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-amber-400 text-amber-400"
                            />
                          ))}
                          <span className="ml-2 text-xs text-slate-500">(127 avis)</span>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-slate-400">
                          Description persuasive générée par l&apos;IA, optimisée pour la
                          conversion et le SEO. Texte unique et original.
                        </p>
                        <button className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">
                          Ajouter au panier
                        </button>
                      </div>
                    </div>

                    {/* Generated pages indicator */}
                    <div className="border-t border-white/[0.06] px-6 py-3">
                      <div className="flex flex-wrap gap-2">
                        {["Homepage", "Produit", "FAQ", "CGV", "Contact", "Ads"].map(
                          (page) => (
                            <span
                              key={page}
                              className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-slate-400"
                            >
                              {page}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() =>
                setExampleIdx((i) => (i - 1 + EXAMPLES.length) % EXAMPLES.length)
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Exemple précédent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {EXAMPLES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setExampleIdx(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === exampleIdx
                      ? "w-8 bg-violet-500"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Voir exemple ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setExampleIdx((i) => (i + 1) % EXAMPLES.length)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Exemple suivant"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Section>

      {/* ────────── PRICING ────────── */}
      <Section id="pricing" className="border-y border-white/[0.04]">
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Tarification{" "}
            <span className="gradient-text">simple et transparente</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Pas d&apos;abonnement caché. Pas de surprise. Commencez, montez en puissance.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={fadeInUp}
              custom={i * 0.1}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? "border-violet-500/30 bg-violet-500/[0.06] shadow-[0_0_60px_rgba(124,58,237,0.1)]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-violet-600 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-violet-600/30">
                    POPULAIRE
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-display text-lg font-bold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-mono text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-lg text-slate-400">{plan.unit}</span>
                </div>
                {plan.period && (
                  <p className="mt-1 text-sm text-slate-500">{plan.period}</p>
                )}
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <Check
                      className={`h-4 w-4 shrink-0 ${
                        plan.popular ? "text-violet-400" : plan.color === "cyan" ? "text-cyan-400" : "text-slate-500"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={ctaCreate}
                className={`mt-8 block rounded-xl py-3.5 text-center text-sm font-semibold transition-all duration-200 ${
                  plan.popular
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500"
                    : plan.color === "cyan"
                      ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                      : "border border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          variants={fadeInUp}
          className="mt-8 text-center text-sm text-slate-500"
        >
          Annulable à tout moment sur les plans mensuels. Paiement sécurisé par Stripe.
        </motion.p>
      </Section>

      {/* ────────── FAQ ────────── */}
      <Section id="faq">
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Questions{" "}
            <span className="gradient-text">fréquentes</span>
          </h2>
        </motion.div>

        <motion.div variants={fadeInUp} className="mx-auto mt-12 max-w-2xl space-y-3">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </motion.div>
      </Section>

      {/* ────────── CTA FINAL ────────── */}
      <section className="relative overflow-hidden border-y border-white/[0.04] py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.08] blur-[120px]" />
        </div>
        <motion.div
          className="container mx-auto px-4 text-center sm:px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl"
          >
            Prêt à lancer{" "}
            <span className="gradient-text">votre boutique ?</span>
          </motion.h2>
          <motion.p variants={fadeInUp} custom={0.1} className="mx-auto mt-4 max-w-lg text-slate-400">
            Collez un lien. Laissez l&apos;IA faire. Vendez dès aujourd&apos;hui.
          </motion.p>
          <motion.div
            variants={fadeInUp}
            custom={0.2}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href={ctaCreate}
              className="group flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-violet-600/25 transition-all duration-300 hover:bg-violet-500 hover:shadow-violet-600/40 hover:-translate-y-0.5"
            >
              <Sparkles className="h-5 w-5" />
              Créer ma boutique
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href={ctaScan}
              className="group flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-0.5"
            >
              <Search className="h-5 w-5 text-cyan-400" />
              Scanner ma boutique
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ────────── FOOTER ────────── */}
      <footer className="border-t border-white/[0.04] bg-slate-900 py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 font-display text-sm font-bold text-white">
                F
              </div>
              <span className="font-display font-bold text-white">FyxxLabs</span>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <a href="#demo" className="text-slate-400 transition-colors hover:text-white">
                Produit
              </a>
              <a href="#pricing" className="text-slate-400 transition-colors hover:text-white">
                Tarifs
              </a>
              <a href="#faq" className="text-slate-400 transition-colors hover:text-white">
                FAQ
              </a>
              <Link
                href="/mentions-legales"
                className="text-slate-400 transition-colors hover:text-white"
              >
                Mentions légales
              </Link>
              <Link
                href="/terms"
                className="text-slate-400 transition-colors hover:text-white"
              >
                CGU
              </Link>
              <Link
                href="/privacy"
                className="text-slate-400 transition-colors hover:text-white"
              >
                Confidentialité
              </Link>
            </nav>

            {/* CTA */}
            <Link
              href={ctaCreate}
              className="rounded-xl bg-violet-600/80 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
            >
              Commencer
            </Link>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 md:flex-row">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} FyxxLabs. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield className="h-4 w-4 text-violet-500/60" />
              Paiement sécurisé par Stripe
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
