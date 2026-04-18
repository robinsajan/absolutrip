import SettingsPageClient from "./SettingsPageClient";

export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function SettingsPage() {
  return <SettingsPageClient />;
}
