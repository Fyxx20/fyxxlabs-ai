import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanSearch, ArrowLeft } from "lucide-react";

export default function ScanNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ScanSearch className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-center">Analyse introuvable</CardTitle>
          <CardDescription className="text-center">
            Cette analyse n’existe pas, a été supprimée ou vous n’y avez pas accès.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/app/scans">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux scans
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
