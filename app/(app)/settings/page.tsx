import { redirect } from "next/navigation";

// Settings have been merged into the Profile page.
export default function SettingsPage() {
  redirect("/profile");
}
