"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Crown,
  Loader2,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

type Step = "gallery" | "onboarding" | "waiting" | "result";

type Emotion = "confidence" | "urgency" | "luxury" | "fun";

type PersonaId =
  | "solo-creator"
  | "coach"
  | "agency"
  | "student"
  | "freelancer"
  | "ecom-owner"
  | "marketer"
  | "developer";

type ThemeId =
  | "minimalist-wealth"
  | "cyberpunk-digital"
  | "zen-course"
  | "luxury-editorial"
  | "bold-conversion"
  | "neon-studio"
  | "soft-pastel"
  | "noir-gold";

interface ThemeTemplate {
  id: ThemeId;
  name: string;
  vibe: string;
  preview: { a: string; b: string; c: string };
  accent: "violet" | "cyan" | "amber" | "rose";
}

interface PersonaOption {
  id: PersonaId;
  label: string;
  desc: string;
  examples: string[];
}

interface IdeaSuggestion {
  title: string;
  subtitle: string;
}

interface DigitalPagePayload {
  brandName: string;
  title: string;
  subtitle: string;
  hero: string;
  offer: string[];
  objections: string[];
  upsell: string[];
  crossSell: string[];
  launchChecklist: string[];
  faq: Array<{ question: string; answer: string }>;
  guarantee: string;
  legal: string[];
  pricing: {
    currency: string;
    safe: number;
    optimal: number;
    aggressive: number;
    positioning: "low" | "mid" | "premium";
    why: string[];
  };
  visuals: {
    coverUrl: string;
    heroUrl: string;
    mockupUrls: string[];
  };
  // Optional: only if API provides it
  testimonials?: Array<{ name: string; role?: string; quote: string }>;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useTilt(maxDeg: number = 10) {
  const [style, setStyle] = useState<CSSProperties>({});
  const raf = useRef<number | null>(null);

  const onMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * maxDeg;
      const ry = (px - 0.5) * maxDeg;
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        setStyle({
          transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`,
        });
      });
    },
    [maxDeg]
  );

  const onLeave = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setStyle({ transform: "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)" });
  }, []);

  return { style, onMove, onLeave };
}

const THEMES: ThemeTemplate[] = [
  {
    id: "minimalist-wealth",
    name: "Minimalist Wealth",
    vibe: "Épure + luxe discret",
    preview: { a: "#0B1020", b: "#1A2140", c: "#D4D4D8" },
    accent: "amber",
  },
  {
    id: "noir-gold",
    name: "Noir & Gold",
    vibe: "Éditorial premium",
    preview: { a: "#07070A", b: "#151522", c: "#EAB308" },
    accent: "amber",
  },
  {
    id: "cyberpunk-digital",
    name: "Cyberpunk Digital",
    vibe: "Néon + techno",
    preview: { a: "#070B1E", b: "#4C1D95", c: "#22D3EE" },
    accent: "cyan",
  },
  {
    id: "neon-studio",
    name: "Neon Studio",
    vibe: "Créatif + contrasté",
    preview: { a: "#081018", b: "#1D4ED8", c: "#F472B6" },
    accent: "rose",
  },
  {
    id: "zen-course",
    name: "Zen Course",
    vibe: "Calme + crédible",
    preview: { a: "#071A14", b: "#0EA5A5", c: "#A7F3D0" },
    accent: "cyan",
  },
  {
    id: "luxury-editorial",
    name: "Luxury Editorial",
    vibe: "Typo + storytelling",
    preview: { a: "#0B1020", b: "#111827", c: "#A78BFA" },
    accent: "violet",
  },
  {
    id: "bold-conversion",
    name: "Bold Conversion",
    vibe: "Direct + puissant",
    preview: { a: "#0B1020", b: "#0F172A", c: "#60A5FA" },
    accent: "violet",
  },
  {
    id: "soft-pastel",
    name: "Soft Pastel",
    vibe: "Friendly + clean",
    preview: { a: "#0B1020", b: "#1F2937", c: "#93C5FD" },
    accent: "cyan",
  },
];

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const tilt = useTilt(9);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseMove={tilt.onMove}
      onMouseLeave={tilt.onLeave}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-violet-400/40 bg-violet-500/10 shadow-[0_0_60px_rgba(124,58,237,0.10)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
      )}
      style={tilt.style}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            `radial-gradient(circle at 20% 15%, ${theme.preview.c}22, transparent 55%),` +
            `radial-gradient(circle at 85% 75%, ${theme.preview.b}55, transparent 55%),` +
            `linear-gradient(135deg, ${theme.preview.a}, ${theme.preview.b})`,
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="border-white/15 bg-white/[0.04] text-slate-200">
            Template
          </Badge>
          <span className="text-xs text-slate-300/70">Clique</span>
        </div>
        <p className="mt-4 text-sm font-semibold text-white">{theme.name}</p>
        <p className="mt-1 text-xs text-slate-300">{theme.vibe}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.preview.c }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.preview.b }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.preview.a }} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-300/80">Depth tilt</span>
          <Sparkles className="h-4 w-4 text-white/50 transition group-hover:text-white/70" />
        </div>
      </div>
    </button>
  );
}

const PERSONAS: PersonaOption[] = [
  {
    id: "solo-creator",
    label: "Créateur solo",
    desc: "Veut vendre vite sans équipe",
    examples: ["Pack Notion", "Ebook", "Prompt pack"],
  },
  {
    id: "coach",
    label: "Coach / Formateur",
    desc: "Programme structuré + confiance",
    examples: ["Course", "Coaching", "Bootcamp"],
  },
  {
    id: "marketer",
    label: "Marketer",
    desc: "Angle conversion + offers",
    examples: ["Templates", "Scripts", "Playbook"],
  },
  {
    id: "freelancer",
    label: "Freelance",
    desc: "Produit de service packagé",
    examples: ["Kit", "Bundle", "Process"],
  },
  {
    id: "developer",
    label: "Builder / Dev",
    desc: "Produit technique, clair, crédible",
    examples: ["Starter kit", "Template", "Docs"],
  },
  {
    id: "student",
    label: "Étudiant",
    desc: "Apprendre + résultats rapides",
    examples: ["Méthode", "Notes", "Guides"],
  },
  {
    id: "ecom-owner",
    label: "E-commerçant",
    desc: "Monétise son expertise",
    examples: ["Guides", "Checklists", "Scripts"],
  },
  {
    id: "agency",
    label: "Agence",
    desc: "Produit scalable + premium",
    examples: ["Bundle", "Templates", "Offres"],
  },
];

const EMOTIONS: Array<{ id: Emotion; label: string; desc: string }> = [
  { id: "confidence", label: "Confiance", desc: "Crédible, rassurant, solide" },
  { id: "urgency", label: "Urgence", desc: "Action rapide, focus résultats" },
  { id: "luxury", label: "Luxe", desc: "Premium, exclusif, élégant" },
  { id: "fun", label: "Fun", desc: "Léger, dynamique, créatif" },
];

async function parseApiPayload(res: Response): Promise<Record<string, unknown>> {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    if (!res.ok) {
      throw new Error(`Réponse serveur invalide (${res.status}): ${raw.slice(0, 140)}`);
    }
    return {};
  }
}

function RoyalWaiting({
  progress,
  label,
  done,
  onEnter,
}: {
  progress: number;
  label: string;
  done: boolean;
  onEnter: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <Crown className="h-7 w-7 text-amber-200" />
          </motion.div>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Ton empire se construit…</h2>
        <p className="mt-2 text-sm text-slate-300">{label}</p>

        <div className="mt-6 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-amber-300"
            animate={{ width: `${clamp(progress, 2, 100)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{Math.round(progress)}%</p>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={onEnter}
            disabled={!done}
            className={cn(
              "rounded-2xl px-6",
              done ? "bg-violet-600 hover:bg-violet-500" : "bg-white/10 text-slate-300 hover:bg-white/10"
            )}
          >
            {done ? (
              <>
                Entrer dans ton empire
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DigitalLuxuryClient({
  storeId,
  storeName,
  shopDomain,
}: {
  storeId: string;
  storeName: string;
  shopDomain: string | null;
}) {
  const [step, setStep] = useState<Step>("gallery");
  const [themeId, setThemeId] = useState<ThemeId>("minimalist-wealth");
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) ?? THEMES[0], [themeId]);

  const [idea, setIdea] = useState("");
  const [persona, setPersona] = useState<PersonaId>("solo-creator");
  const personaObj = useMemo(() => PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0], [persona]);
  const [emotion, setEmotion] = useState<Emotion>("luxury");

  const [language, setLanguage] = useState("fr");
  const [country, setCountry] = useState("FR");

  const [suggestions, setSuggestions] = useState<IdeaSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const suggestTimer = useRef<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<DigitalPagePayload | null>(null);

  const [progress, setProgress] = useState(4);
  const [progressLabel, setProgressLabel] = useState("Initialisation…");
  const [canEnter, setCanEnter] = useState(false);

  const canContinue = idea.trim().length >= 12;

  useEffect(() => {
    if (step !== "onboarding") return;
    if (idea.trim().length < 8) {
      setSuggestions([]);
      return;
    }
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    suggestTimer.current = window.setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch("/api/store/create-digital", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "suggest-idea",
            theme: theme.name,
            persona: personaObj.label,
            emotion,
            input: idea.trim(),
            language,
          }),
        });
        const data = await parseApiPayload(res);
        if (!res.ok) throw new Error(String(data.error ?? "Suggestion impossible"));
        const items = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(
          items
            .slice(0, 4)
            .map((s: any) => ({ title: String(s.title ?? ""), subtitle: String(s.subtitle ?? "") }))
            .filter((s: any) => s.title)
        );
      } catch {
        // silence: suggestions are best-effort
      } finally {
        setSuggesting(false);
      }
    }, 450);

    return () => {
      if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    };
  }, [idea, step, theme.name, personaObj.label, emotion, language]);

  async function startGeneration() {
    setLoading(true);
    setError(null);
    setCanEnter(false);
    setPage(null);
    setStep("waiting");

    // Smooth progress driver (UX only)
    setProgress(6);
    const phases = [
      { p: 18, t: "Analyse du marché en cours… 📈" },
      { p: 36, t: "Design de ton identité visuelle unique… 🎨" },
      { p: 58, t: "Rédaction de ton argumentaire irrésistible… ✍️" },
      { p: 78, t: "Optimisation de la conversion… 🚀" },
      { p: 92, t: "Finalisation des assets… ✨" },
    ];
    let idx = 0;
    const timer = window.setInterval(() => {
      const next = phases[idx];
      if (!next) return;
      setProgress(next.p);
      setProgressLabel(next.t);
      idx += 1;
    }, 900);

    try {
      const res = await fetch("/api/store/create-digital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-luxury",
          storeId,
          themeId: theme.id,
          themeName: theme.name,
          idea: idea.trim(),
          personaId: persona,
          personaLabel: personaObj.label,
          emotion,
          language,
          country,
        }),
      });
      const data = await parseApiPayload(res);
      if (!res.ok) throw new Error(String(data.error ?? "Génération impossible"));
      setPage(data.page as DigitalPagePayload);
      setProgress(100);
      setProgressLabel("Empire prêt. 🎉");
      setCanEnter(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur génération");
      setStep("onboarding");
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function publishShopify() {
    if (!page) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/create-digital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish-shopify",
          storeId,
          page,
          coverImageUrl: page.visuals.coverUrl,
        }),
      });
      const data = await parseApiPayload(res);
      if (!res.ok || !data.success) throw new Error(String(data.error ?? "Publication Shopify impossible"));
      alert("Produit digital publié sur Shopify.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur publication");
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-200">
            <Crown className="h-3.5 w-3.5 text-amber-200" />
            Digital Builder — mode luxe
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Construis un business digital comme une agence premium
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Boutique cible: <span className="font-semibold text-white">{storeName}</span>{" "}
            <span className="text-slate-400">
              {shopDomain ? `(${shopDomain})` : "(Shopify non connecté)"}
            </span>
          </p>
        </div>
        <Link href="/app/create-store" className="self-start">
          <Button variant="outline" className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.06]">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="relative space-y-6 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_55%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.14),transparent_45%)]" />
      {header}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "gallery" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Étape 1 — The Gallery
              </p>
              <h2 className="mt-2 text-xl font-bold">Choisis ton thème</h2>
              <p className="mt-1 text-sm text-slate-300">
                Sensation Apple, rendu agence. Clique sur un template pour continuer.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {THEMES.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  selected={t.id === themeId}
                  onSelect={() => {
                    setThemeId(t.id);
                    setStep("onboarding");
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === "onboarding" && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Étape 2 — Intelligence augmentée
                  </p>
                  <h2 className="mt-2 text-xl font-bold">3 questions. Le reste, on l’infère.</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Template: <span className="font-semibold text-white">{theme.name}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.06]"
                  onClick={() => setStep("gallery")}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Changer de thème
                </Button>
              </div>
            </div>

            <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-base text-white">C&apos;est quoi ton idée ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label className="text-slate-200">Décris en 1 phrase (objectif + promesse)</Label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Ex: Un ebook premium pour aider les freelances à doubler leurs revenus avec une méthode simple en 14 jours."
                  className="min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {suggesting ? "Suggestions IA…" : suggestions.length ? "Suggestions IA" : " "}
                  </p>
                  <p className="text-xs text-slate-500">{idea.trim().length}/240</p>
                </div>
                {suggestions.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => setIdea(`${s.title} — ${s.subtitle}`)}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.05]"
                      >
                        <p className="text-sm font-semibold text-white">{s.title}</p>
                        <p className="mt-1 text-xs text-slate-300">{s.subtitle}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white">Quel est ton public cible ?</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {PERSONAS.map((p) => {
                    const active = p.id === persona;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersona(p.id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          active
                            ? "border-violet-400/40 bg-violet-500/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        )}
                      >
                        <p className="text-sm font-semibold text-white">{p.label}</p>
                        <p className="mt-1 text-xs text-slate-300">{p.desc}</p>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Ex: {p.examples.slice(0, 2).join(" · ")}
                        </p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white">Quelle émotion veux-tu dégager ?</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {EMOTIONS.map((e) => {
                    const active = e.id === emotion;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEmotion(e.id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          active
                            ? "border-cyan-400/40 bg-cyan-500/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        )}
                      >
                        <p className="text-sm font-semibold text-white">{e.label}</p>
                        <p className="mt-1 text-xs text-slate-300">{e.desc}</p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-200">Langue</Label>
                  <Input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value.slice(0, 2).toLowerCase())}
                    className="h-11 rounded-2xl border-white/10 bg-slate-950/40 text-white"
                    placeholder="fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Pays</Label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value.slice(0, 2).toUpperCase())}
                    className="h-11 rounded-2xl border-white/10 bg-slate-950/40 text-white"
                    placeholder="FR"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <Button
                  onClick={startGeneration}
                  disabled={loading || !canContinue}
                  className="h-12 rounded-2xl bg-violet-600 px-6 text-base font-semibold text-white hover:bg-violet-500"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Générer mon empire
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-slate-400">
                  {canContinue ? "OK. L’IA infère le reste." : "Écris une phrase un peu plus précise pour démarrer."}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === "waiting" && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <RoyalWaiting
              progress={progress}
              label={progressLabel}
              done={canEnter}
              onEnter={() => setStep("result")}
            />
          </motion.div>
        )}

        {step === "result" && page && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-emerald-200">
                <Check className="h-4 w-4" />
                <p className="font-semibold">Génération terminée</p>
              </div>
              <p className="mt-1 text-sm text-slate-200">
                {page.brandName} — {page.title}
              </p>
            </div>

            <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Aperçu rapide</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Hero</p>
                  <p className="text-xl font-extrabold">{page.title}</p>
                  <p className="text-sm text-slate-300">{page.subtitle}</p>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                    {page.hero}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pricing (justifié)</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { k: "Safe", v: page.pricing.safe },
                      { k: "Optimal", v: page.pricing.optimal },
                      { k: "Aggressive", v: page.pricing.aggressive },
                    ].map((p) => (
                      <div key={p.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-xs text-slate-400">{p.k}</p>
                        <p className="mt-1 text-lg font-bold text-white">
                          {p.v} {page.pricing.currency}
                        </p>
                      </div>
                    ))}
                  </div>
                  {page.pricing.why?.length ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-semibold text-slate-300">Pourquoi ce prix</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {page.pricing.why.slice(0, 5).map((w) => (
                          <li key={w} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-400/80" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={() => setStep("onboarding")}
                variant="outline"
                className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.06]"
              >
                Revenir / ajuster
              </Button>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  onClick={publishShopify}
                  disabled={loading}
                  className="rounded-2xl bg-violet-600 text-white hover:bg-violet-500"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Publier sur Shopify
                </Button>
                {!shopDomain && (
                  <p className="text-xs text-slate-400">
                    Shopify non connecté. Va dans <span className="text-slate-200">Ma boutique</span>.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

