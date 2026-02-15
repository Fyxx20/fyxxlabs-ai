import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderKanban, Rocket, Sparkles } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="max-w-6xl space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-violet-300" />
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Regroupe tes créations physiques et digitales, puis relance rapidement une génération.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/app/store-generator">
            <Button variant="outline">
              <Rocket className="mr-2 h-4 w-4" />
              Create Physical
            </Button>
          </Link>
          <Link href="/app/create-digital">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Digital
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
