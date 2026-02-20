import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";

export default function CreateStoreHubPage() {
  return (
    <div className="relative max-w-6xl space-y-6 overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_55%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_45%)]" />

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Création boutique</h1>
        <p className="mt-1 text-sm text-slate-300">
          Choisis ton mode de création. L&apos;IA s&apos;occupe du reste.
        </p>
      </div>

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
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>Colle un lien produit. On génère une boutique Shopify complète.</p>
              <p className="text-xs text-slate-400">
                Inclut optimisation d&apos;images IA + pricing + pages clés.
              </p>
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
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>Wizard rapide. On génère la marque, la landing et la livraison.</p>
              <p className="text-xs text-slate-400">
                Brief simplifié + fichiers optionnels + preview + publish.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

