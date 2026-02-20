import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";

export default function CreateStoreHubPage() {
  return (
    <div className="relative max-w-6xl space-y-10 overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.20),transparent_55%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_45%)]" />

      {/* Hero */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
            <Zap className="h-3.5 w-3.5" />
            Fyxx AI — Génération premium
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Création boutique</h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            2 choix. 1 action : clique sur un mode pour démarrer.
          </p>
        </div>
      </div>

      {/* How it works (must be above choices) */}
      <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Comment ça marche</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            { n: "01", title: "Choisis un mode", desc: "Physique (AliExpress) ou digital (wizard guidé)." },
            { n: "02", title: "Fyxx AI construit", desc: "Branding, pricing, images, copywriting et structure." },
            { n: "03", title: "Preview & publish", desc: "Valide, ajuste, puis publie sur Shopify." },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="font-mono text-xs font-semibold text-slate-400">{s.n}</p>
              <p className="mt-1 font-semibold text-white">{s.title}</p>
              <p className="mt-1 text-sm text-slate-300">{s.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Two big choices (primary action) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="group relative">
          {/* Full-card clickable surface */}
          <Link
            href="/app/store-generator"
            aria-label="Démarrer une boutique physique"
            className="absolute inset-0 z-20 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
          />
          <Card className="relative h-full rounded-2xl border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all group-hover:-translate-y-0.5 group-hover:bg-white/[0.06] group-hover:shadow-[0_0_60px_rgba(6,182,212,0.10)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl transition group-hover:bg-cyan-500/20" />
            <CardHeader>
              <div className="mb-3 flex items-center justify-between">
                <Badge variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                  Physique
                </Badge>
                <span className="text-xs text-slate-400">Clique pour démarrer</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
                    <Rocket className="h-4 w-4 text-cyan-200" />
                  </span>
                  Boutique physique (AliExpress)
                </CardTitle>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p className="text-sm text-slate-300">
                Colle un lien produit AliExpress. On génère une boutique Shopify complète, prête à vendre.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Branding + structure boutique",
                  "Pricing justifié (3 niveaux)",
                  "Images IA (fond premium)",
                  "Pages clés + éléments conversion",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-200/90" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                  Démarrage : lien produit
                </Badge>
                <div className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-sm shadow-cyan-500/10">
                  Démarrer
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          {/* Full-card clickable surface */}
          <Link
            href="/app/create-store/digital"
            aria-label="Démarrer un produit digital"
            className="absolute inset-0 z-20 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
          />
          <Card className="relative h-full rounded-2xl border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all group-hover:-translate-y-0.5 group-hover:bg-white/[0.06] group-hover:shadow-[0_0_60px_rgba(124,58,237,0.10)]">
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl transition group-hover:bg-violet-600/20" />
            <CardHeader>
              <div className="mb-3 flex items-center justify-between">
                <Badge variant="outline" className="border-violet-400/30 bg-violet-500/10 text-violet-200">
                  Digital
                </Badge>
                <span className="text-xs text-slate-400">Clique pour démarrer</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                    <Sparkles className="h-4 w-4 text-violet-200" />
                  </span>
                  Produits digitaux
                </CardTitle>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p className="text-sm text-slate-300">
                Choisis un type, définis ton audience, puis génère une landing + livraison sécurisée.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Branding complet + ton",
                  "Landing persuasive + FAQ",
                  "Pricing cohérent marché",
                  "Livraison sécurisée (liens)",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-violet-200/90" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                  Démarrage : wizard guidé
                </Badge>
                <div className="rounded-xl bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100 shadow-sm shadow-violet-600/10">
                  Démarrer
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

