"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

export function ScanFailedCard({
  errorMessage,
  errorCode,
  debug,
}: {
  errorMessage?: string | null;
  errorCode?: string | null;
  debug?: unknown;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const message = errorMessage ?? "Une erreur est survenue lors de l'analyse.";
  const hasTechnicalDetails = Boolean(errorCode) || debug != null;

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>Analyse impossible</CardTitle>
            <CardDescription className="mt-1">{message}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href="/app/scans">
            <Button variant="default" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Réessayer (nouvelle analyse)
            </Button>
          </Link>
        </div>

        {hasTechnicalDetails && (
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Voir les détails techniques
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showDetails && (
              <div className="border-t border-border px-4 py-3 font-mono text-xs">
                {errorCode && (
                  <p className="mb-2">
                    <span className="text-muted-foreground">error_code:</span> {errorCode}
                  </p>
                )}
                {debug != null && (
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2">
                    {JSON.stringify(debug, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
