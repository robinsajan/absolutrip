"use client";

import { useEffect } from "react";

/**
 * Hook previously used for Firebase Cloud Messaging.
 * Notifications have been disabled per user request.
 */
export const useNotifications = () => {
  useEffect(() => {
    // No-op: Push notifications are disabled
  }, []);

  return { permission: "default" as const };
};
