"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
    "Qu’est-ce qui bloque mon checkout ?",
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
          content: `Erreur: ${msg}`,
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
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      router.push(`/app/scans/${data.id}?new=1`);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRescanLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-border/60 flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: "480px" }}>
      {/* Suggested prompts */}
      <div className="border-b border-border/60 px-4 py-3 bg-muted/20">
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <p className="font-semibold mb-1">Démarrez la conversation</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ex. &laquo; Que dois-je corriger en priorité ? &raquo; ou
              &laquo; Donne-moi un plan d&apos;action sur 7 jours &raquo;
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/60 bg-muted/30"
                )}
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] opacity-70">
                  {m.role === "user" ? (
                    <>
                      <UserRound className="h-3 w-3" />
                      <span>Vous</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-3 w-3" />
                      <span>FyxxLabs</span>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Réflexion...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border/60 p-3 bg-background/80 space-y-2">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background p-1.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre question..."
              disabled={loading}
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-9"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !input.trim()}
              className="h-8 px-3"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground h-8"
          onClick={handleRescan}
          disabled={rescanLoading}
        >
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          {rescanLoading
            ? "Relance en cours..."
            : "J’ai modifié mon site — relancer un scan"}
        </Button>
      </div>
    </Card>
  );
}
