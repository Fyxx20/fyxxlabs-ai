"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Loader2, Zap, Sparkles, Bot, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function CoachChat({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [rescanLoading, setRescanLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Pourquoi mon taux de conversion est faible ?",
    "Donne-moi 5 quick wins pour ma page produit",
    "Qu'est-ce qui bloque mon checkout ?",
    "Quels KPI dois-je suivre cette semaine ?",
  ];

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/coach/messages?store_id=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
      setLoadingHistory(false);
    })();
  }, [storeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        created_at: new Date().toISOString(),
      },
    ]);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, content: userMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          role: "assistant",
          content: data.content,
          created_at: data.created_at,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Erreur: ${msg}. Clique sur « Réessayer » pour renvoyer ton message.`,
          created_at: new Date().toISOString(),
        },
      ]);
      setInput(userMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleRescan() {
    setRescanLoading(true);
    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur");
      }
      router.push(`/app/scans/${data.id}?new=1`);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRescanLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Discussion avec FyxxLabs
            </CardTitle>
            <CardDescription>
              Recommandations basées sur ton dernier scan. Pose des questions concrètes pour obtenir des actions priorisées.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Coach e-commerce actif
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        <div className="px-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-[520px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {loadingHistory ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2">Chargement de la conversation…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
                <Sparkles className="h-10 w-10 text-primary/70" />
                <p className="mt-4 font-medium">Démarre la conversation</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Ex. "Que dois-je corriger en priorité ?" ou "Donne-moi un plan d'action sur 7 jours".
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm",
                      m.role === "user"
                        ? "border-primary/20 bg-primary text-primary-foreground"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] opacity-80">
                      {m.role === "user" ? (
                        <>
                          <UserRound className="h-3 w-3" />
                          <span>Toi</span>
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3" />
                          <span>FyxxLabs</span>
                        </>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-card px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={handleSubmit}
            className="border-t border-border/60 bg-background/80 p-4"
          >
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 shadow-sm">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écris ta question…"
                disabled={loading}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button type="submit" size="sm" disabled={loading || !input.trim()} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer
              </Button>
            </div>
          </form>
        </div>

        <div className="border-t border-border/60 p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleRescan}
            disabled={rescanLoading}
          >
            <Zap className="h-4 w-4" />
            {rescanLoading
              ? "Relance en cours…"
              : "J’ai modifié mon site — relancer un scan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
