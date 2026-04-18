import ClientLayout from "./ClientLayout";

// This satisfies the 'output: export' requirement for dynamic routes.
// We return an empty list or a placeholder. 
// Capacitor will use the 404.html -> index.html fallback to handle
// actual trip IDs at runtime.
export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function RootTripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
