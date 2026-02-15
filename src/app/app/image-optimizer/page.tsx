import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2 } from "lucide-react";

export default function ImageOptimizerPage() {
  return (
    <div className="max-w-5xl space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-cyan-300" />
          <h1 className="text-2xl font-bold">Image Optimizer</h1>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Optimise tes visuels produit avec IA (netteté, upscale, harmonie couleurs, badges conversion).
        </p>
        <Link href="/app/store-generator" className="mt-4 inline-block">
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            Optimiser depuis Create Physical
          </Button>
        </Link>
      </div>
    </div>
  );
}
