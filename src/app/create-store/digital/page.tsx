import { redirect } from "next/navigation";

export default function PublicCreateStoreDigitalRedirect() {
  // Keep the user-facing route requested, but drive into the authenticated app.
  redirect("/app/create-store/digital");
}

