import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MentionsLegalesPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold">Mentions légales</h1>
      <p className="mt-4 text-muted-foreground">
        Page à compléter avec les mentions légales de FyxxLabs (éditeur, hébergeur, contact, etc.).
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button variant="outline">Retour à l’accueil</Button>
      </Link>
    </div>
  );
}
