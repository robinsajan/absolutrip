"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trips as tripsApi } from "@/lib/api/endpoints";
import { useTrips } from "@/lib/hooks";
import { FullPageLoader } from "@/components/common/FullPageLoader";

function JoinTripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useTrips();
  const hasJoined = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code && !hasJoined.current) {
      hasJoined.current = true;
      tripsApi
        .join(code)
        .then((result) => {
          if (result.status === "approved") {
            toast.success(`Joined ${result.trip?.name}!`);
            mutate();
            router.replace(`/trip/${result.trip?.id}/explore`);
          } else if (result.status === "pending") {
            toast.info(result.message);
            router.replace("/trips");
          }
        })
        .catch((error: unknown) => {
          const err = error as { response?: { data?: { error?: string } } };
          toast.error(err.response?.data?.error || "Invalid invite code");
          router.replace("/trips");
        });
    } else if (!code) {
      router.replace("/trips");
    }
  }, [searchParams, router, mutate]);

  return <FullPageLoader />;
}

export default function JoinTripPage() {
  return (
    <Suspense
      fallback={<FullPageLoader />}
    >
      <JoinTripContent />
    </Suspense>
  );
}
