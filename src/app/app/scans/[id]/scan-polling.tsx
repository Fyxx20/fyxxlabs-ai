"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ScanPolling({ scanId, initialStatus }: { scanId: string; initialStatus: string }) {
  const router = useRouter();

  useEffect(() => {
    if (initialStatus !== "running") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/${scanId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status && data.status !== "running") {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [scanId, initialStatus, router]);

  return null;
}
