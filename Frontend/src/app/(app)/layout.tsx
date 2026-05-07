"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useNotifications } from "@/lib/hooks";
import { Header } from "@/components/navigation";
import { FullPageLoader } from "@/components/common/FullPageLoader";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  useNotifications();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 pt-[calc(4rem+10px+env(safe-area-inset-top,0px))]">
        {children}
      </main>
    </div>
  );
}
