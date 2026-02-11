"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Share2, Loader2, Copy, Check, ArrowLeft, Sparkles, Instagram, Clock,
  ChevronDown, ChevronUp, Calendar, Video, Image as ImageIcon, FileText,
} from "lucide-react";
import Link from "next/link";

const PLATFORMS_OPTIONS = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "tiktok", label: "TikTok", icon: Video },
  { id: "facebook", label: "Facebook", icon: Share2 },
  { id: "pinterest", label: "Pinterest", icon: ImageIcon },
];

const TYPE_ICONS: Record<string, typeof Video> = {
  Reel: Video,
  Story: ImageIcon,
  Carrousel: FileText,
  Post: ImageIcon,
  TikTok: Video,
};

interface Post {
  platform: string;
  type: string;
  caption: string;
  hashtags: string[];
  best_time: string;
  hook: string;
  video_idea?: string;
  carousel_slides?: string[];
}

interface WeeklyItem {
  day: string;
  platform: string;
  content_type: string;
  topic: string;
}

export function SocialMediaClient() {
  const [step, setStep] = useState<"form" | "generating" | "results">("form");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [niche, setNiche] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "tiktok"]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    if (!productName.trim() || platforms.length === 0) return;
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/store/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, productDescription, platforms, niche }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setPosts(data.posts ?? []);
      setWeeklyPlan(data.weekly_plan ?? []);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("form");
    }
  };

  const copyPost = (p: Post, idx: number) => {
    navigator.clipboard.writeText(`${p.caption}\n\n${p.hashtags.join(" ")}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Media Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planifiez et créez du contenu pour vos réseaux sociaux
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="py-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {step === "form" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-8 md:p-12">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Share2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Contenu social media prêt à poster</h2>
              <p className="text-muted-foreground max-w-lg">
                Posts, captions, hashtags, hooks et planning hebdomadaire optimisés pour chaque plateforme
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom du produit *</label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Lampe LED intelligente" className="bg-background" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description du produit</label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Fonctionnalités, avantages, points forts..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Niche</label>
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex: Déco maison, Tech gadgets..." className="bg-background" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Plateformes</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PLATFORMS_OPTIONS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                          platforms.includes(p.id) ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={generate} size="lg" className="w-full gap-2" disabled={!productName.trim() || platforms.length === 0}>
                <Sparkles className="h-5 w-5" /> Générer le contenu
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "generating" && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Création du contenu…</p>
              <p className="text-sm text-muted-foreground mt-1">Posts, hashtags et planning optimisés</p>
            </div>
          </div>
        </div>
      )}

      {step === "results" && (
        <>
          {/* Posts */}
          <div className="space-y-3">
            {posts.map((p, i) => {
              const TypeIcon = TYPE_ICONS[p.type] || FileText;
              return (
                <Card key={i} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
                    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <TypeIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{p.platform}</Badge>
                            <Badge variant="outline" className="text-xs">{p.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {p.best_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyPost(p, i); }}>
                          {copiedIdx === i ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        {expandedIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedIdx === i && (
                    <CardContent className="border-t pt-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">🪝 Hook</p>
                        <p className="text-sm font-semibold bg-primary/5 p-2 rounded border border-primary/10">{p.hook}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Caption</p>
                        <p className="text-sm bg-muted/50 p-3 rounded border whitespace-pre-wrap">{p.caption}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.hashtags.map((h, j) => (
                          <Badge key={j} variant="outline" className="text-xs">{h}</Badge>
                        ))}
                      </div>
                      {p.video_idea && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">🎬 Idée vidéo</p>
                          <p className="text-sm bg-muted/50 p-2 rounded border">{p.video_idea}</p>
                        </div>
                      )}
                      {p.carousel_slides && p.carousel_slides.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">📱 Slides carrousel</p>
                          <div className="space-y-1">
                            {p.carousel_slides.map((s, j) => (
                              <p key={j} className="text-xs bg-muted/50 p-2 rounded border">
                                <span className="font-medium">Slide {j + 1}:</span> {s}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Weekly plan */}
          {weeklyPlan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Planning hebdomadaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyPlan.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                      <Badge variant="outline" className="min-w-[70px] justify-center text-xs">{w.day}</Badge>
                      <Badge variant="secondary" className="text-xs">{w.platform}</Badge>
                      <span className="text-xs text-muted-foreground">{w.content_type}</span>
                      <span className="text-xs flex-1 truncate">{w.topic}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => setStep("form")} className="w-full">
            Créer un nouveau plan
          </Button>
        </>
      )}
    </div>
  );
}
