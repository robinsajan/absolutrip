import { useEffect, useState } from "react";
import { requestForToken, onMessageListener } from "@/lib/firebase";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "./use-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const useNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      // Check if browser supports notifications
      if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return;
      }

      setPermission(Notification.permission);

      if (Notification.permission === "granted") {
        await registerToken();
      } else if (Notification.permission !== "denied") {
        const status = await Notification.requestPermission();
        setPermission(status);
        if (status === "granted") {
          await registerToken();
        }
      }
    };

    const registerToken = async () => {
      try {
        const messaging = await import("@/lib/firebase").then(m => m.getFirebaseMessaging());
        if (!messaging) return;

        // Unregister any existing service workers to avoid conflicts (Fixes "push service error")
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }

        // Register service worker with config as query params
        const swUrl = `/firebase-messaging-sw.js?` + 
          `apiKey=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}&` +
          `authDomain=${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}&` +
          `projectId=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}&` +
          `storageBucket=${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}&` +
          `messagingSenderId=${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}&` +
          `appId=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}`;

        const registration = await navigator.serviceWorker.register(swUrl);
        
        // Wait for the service worker to be ready and active
        await navigator.serviceWorker.ready;
        console.log("Service Worker ready and active");

        const token = await import("@/lib/firebase").then(m => m.requestForToken(registration));
        console.log("FCM Token obtained:", token);
        
        if (token) {
          await axios.post(`${API_URL}/auth/update-fcm-token`, 
            { fcm_token: token },
            { withCredentials: true }
          );
          console.log("FCM Token registered with backend successfully");
        }
      } catch (err) {
        console.error("Detailed failure to register FCM token:", err);
      }
    };

    setupNotifications();

    // Listen for foreground messages
    const listenForMessages = async () => {
      const payload: any = await onMessageListener();
      if (payload) {
        toast(payload.notification.title, {
          description: payload.notification.body,
          action: payload.data?.path ? {
            label: "View",
            onClick: () => window.location.href = payload.data.path
          } : undefined
        });
      }
      listenForMessages(); // Keep listening
    };

    listenForMessages();
  }, [user]);

  return { permission };
};
