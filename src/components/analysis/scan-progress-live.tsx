"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Circle, Clock, ExternalLink, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_ORDER = ["QUEUED", "FETCH_HOME", "DISCOVER_PAGES", "EXTRACT", "SCORE", "AI_SUMMARY", "DONE"];
const STEP_LABELS: Record<string, string> = {
  QUEUED: "En file",
  RUNNING: "En cours",
  FETCH_HOME: "Récupération page d'accueil",
  DISCOVER_PAGES: "Détection des pages clés",
  EXTRACT: "Extraction des signaux",
  SCORE: "Calcul du score",
  AI_SUMMARY: "Synthèse IA",
  DONE: "Terminé",
  FAILED: "Échec",
};

interface ScanStatus {
  status: string;
  progress?: number | null;
  step?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

interface ScanEvent {
  id: number;
  ts: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}

export function ScanProgressLive({
  scanId,
  initialStatus,
  initialProgress,
  initialStep,
  storeName,
}: {
  scanId: string;
  initialStatus: string;
  initialProgress?: number | null;
  initialStep?: string | null;
  storeName?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress ?? 0);
  const [step, setStep] = useState(initialStep ?? "QUEUED");
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const res = await fetch(`/api/scan/${scanId}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status === 404) {
          setError("Scan introuvable ou supprimé");
          setStatus("failed");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json() as ScanStatus;
      setStatus(data.status ?? status);
      setProgress(typeof data.progress === "number" ? data.progress : progress);
      setStep(data.step ?? step);
      if (data.started_at) setStartedAt(data.started_at);
      setError(null);
      setFailCount(0);
    } catch (err) {
      const newFailCount = failCount + 1;
      setFailCount(newFailCount);
      if (newFailCount >= 3) {
        setError(`Connexion impossible à l'API (tentative ${newFailCount})`);
      }
    }
  }, [scanId, status, progress, step, failCount]);

  const fetchEvents = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const res = await fetch(`/api/scan/${scanId}/events?limit=30`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status !== 404) throw new Error(`HTTP ${res.status}`);
        setEvents([]);
        return;
      }
      
      const data = await res.json() as { events: ScanEvent[] };
      setEvents(data.events ?? []);
    } catch (err) {
      // Silently fail on events fetch, show if errors accumulate
      console.debug("Failed to fetch scan events", err);
    }
  }, [scanId]);

  useEffect(() => {
    fetchStatus();
    fetchEvents();
  }, [fetchStatus, fetchEvents]);

  useEffect(() => {
    if (status !== "queued" && status !== "running") return;
    const t = setInterval(() => {
      fetchStatus();
      fetchEvents();
    }, 2500);
    return () => clearInterval(t);
  }, [status, fetchStatus, fetchEvents]);

  const stepIndex = STEP_ORDER.indexOf(step) >= 0 ? STEP_ORDER.indexOf(step) : 0;
  const elapsed = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
  const elapsedStr = elapsed < 60 ? `${elapsed} s` : `${Math.floor(elapsed / 60)} min ${elapsed % 60} s`;

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur lors du suivi</CardTitle>
            <CardDescription className="text-destructive/80">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Scan ID: <code className="rounded bg-muted px-1 font-mono text-xs">{scanId}</code>
          </CardContent>
        </Card>
        <Link href="/app/scans">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour au scan précédent
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Colonne gauche : sticky */}
      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Boutique analysée</CardTitle>
          <CardDescription>
            {storeName ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Statut</p>
            <p className="font-medium capitalize">
              {status === "succeeded" ? "Terminé" : status === "failed" ? "Échec" : status === "running" ? "En cours" : "En file"}
            </p>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-semibold tabular-nums text-primary">{progress}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
          {step && STEP_LABELS[step] && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Étape actuelle</p>
              <p className="text-sm font-medium">{STEP_LABELS[step]}</p>
            </div>
          )}
          {startedAt && (status === "queued" || status === "running") && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Temps écoulé : {elapsedStr}</span>
            </div>
          )}
          <Link href="/app/scans">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Continuer en arrière-plan
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Colonne droite : étapes + journal */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Étapes</CardTitle>
            <CardDescription>
              Progression de l'analyse en temps réel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-0">
              {STEP_ORDER.filter((s) => s !== "QUEUED").map((s, i) => {
                const label = STEP_LABELS[s] ?? s;
                const done = stepIndex > i + 1 || (step === "DONE" && s !== "DONE");
                const current = step === s || (step === "DONE" && s === "DONE");
                return (
                  <li
                    key={s}
                    className={cn(
                      "flex items-start gap-3 border-l-2 pl-4 pb-5 last:pb-0",
                      i < STEP_ORDER.length - 2 ? "border-muted" : "border-transparent"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        done && "bg-primary text-primary-foreground",
                        current && "bg-primary/20 text-primary",
                        !done && !current && "bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : current ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                    </span>
                    <p className={cn("text-sm font-medium", (done || current) ? "text-foreground" : "text-muted-foreground")}>
                      {label}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Journal</CardTitle>
            <CardDescription>
              Dernière activité et messages du scan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
              {events.length === 0 ? (
                <p className="text-muted-foreground">Aucun événement pour l'instant…</p>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className={cn(
                      "rounded px-2 py-1",
                      ev.type === "error" && "bg-destructive/10 text-destructive",
                      ev.type === "warn" && "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    <span className="text-muted-foreground">{new Date(ev.ts).toLocaleTimeString()}</span>
                    {" "}
                    {ev.message}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
