import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe,
  Image as ImageIcon,
  Rocket,
  ScanSearch,
  Sparkles,
  Zap,
} from "lucide-react";

export default function CreateStoreHubPage() {
  return (
    <div className="relative max-w-6xl space-y-10 overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.20),transparent_55%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_45%)]" />

      {/* Hero */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
              <Zap className="h-3.5 w-3.5" />
              Fyxx AI — Génération premium
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Création boutique
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Choisis ton mode de création. On génère une base propre et orientée conversion
              (branding, pricing, images, copywriting, pages clés).
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { icon: ImageIcon, text: "Images IA premium" },
                { icon: FileText, text: "Copy & pages clés" },
                { icon: Globe, text: "Prêt Shopify" },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-200"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-300" />
                  {text}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Button asChild variant="outline" className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.06]">
              <Link href="/app/scans" className="gap-2">
                <ScanSearch className="h-4 w-4" />
                Lancer un scan
              </Link>
            </Button>
            <p className="text-xs text-slate-400">
              Déjà une boutique ? Utilise l&apos;analyse.
            </p>
          </div>
        </div>
      </div>

      {/* Two big choices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href="/app/store-generator" className="group block">
          <Card className="h-full border-white/10 bg-white/[0.04] backdrop-blur-xl transition hover:bg-white/[0.06]">
            <CardHeader>
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
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                  1 lien produit
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                  Images optimisées obligatoires
                </Badge>
              </div>
              <p>Colle un lien produit. On génère une boutique Shopify complète et cohérente.</p>
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
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/create-digital" className="group block">
          <Card className="h-full border-white/10 bg-white/[0.04] backdrop-blur-xl transition hover:bg-white/[0.06]">
            <CardHeader>
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
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-violet-400/30 bg-violet-500/10 text-violet-200">
                  Wizard 3 étapes
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200">
                  Upload optionnel
                </Badge>
              </div>
              <p>Wizard rapide. On génère la marque, la landing et le système de livraison.</p>
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
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* How it works */}
      <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Comment ça marche</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            { n: "01", title: "Choisis un mode", desc: "Physique (lien AliExpress) ou digital (brief simplifié)." },
            { n: "02", title: "Fyxx AI génère", desc: "Branding, pricing, images, copywriting et structure." },
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

      {/* Secondary CTA */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-white">Tu hésites ?</p>
          <p className="text-sm text-slate-300">
            Lance un scan pour obtenir une action prioritaire et une note sur 100.
          </p>
        </div>
        <Button asChild className="bg-violet-600 text-white hover:bg-violet-500">
          <Link href="/app/scans" className="gap-2">
            <ScanSearch className="h-4 w-4" />
            Scanner maintenant
          </Link>
        </Button>
      </div>
    </div>
  );
}

