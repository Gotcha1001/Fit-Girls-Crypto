// hooks/usePushNotifications.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export function usePushNotifications() {
  const { isAuthenticated } = useConvexAuth();
  const saveSub = useMutation(api.pushSubscriptions.save);
  const removeSub = useMutation(api.pushSubscriptions.remove);

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [endpoint, setEndpoint] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Is THIS device saved on the server?
  const savedOnServer = useQuery(
    api.pushSubscriptions.hasSubscriptionForEndpoint,
    isAuthenticated ? { endpoint } : "skip",
  );
  const isSubscribed = !!endpoint && savedOnServer === true;

  // Register the service worker + read the current browser subscription
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setIsSupported(false);
      setPermission("unsupported");
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission as PermissionState);

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint))
      .catch((err) => {
        console.error("Service worker setup failed:", err);
        setError("Failed to register service worker");
      });
  }, []);

  // If the browser rotated its subscription, keep the server copy fresh
  useEffect(() => {
    if (!isSupported || !isAuthenticated || permission !== "granted") return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub && savedOnServer === true) {
          return saveSub({
            endpoint: sub.endpoint,
            subscription: JSON.stringify(sub.toJSON()),
          });
        }
      })
      .catch(() => {});
    // run once per sign-in / permission change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, isAuthenticated, permission]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !isAuthenticated) {
      setError("Push not supported or not signed in");
      return;
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== "granted") {
        setError("Notification permission denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            vapidKey,
          ) as unknown as BufferSource,
        }));

      await saveSub({
        endpoint: subscription.endpoint,
        subscription: JSON.stringify(subscription.toJSON()),
      });
      setEndpoint(subscription.endpoint);
    } catch (err) {
      console.error("Push subscription failed:", err);
      setError("Failed to subscribe to notifications");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isAuthenticated, saveSub]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeSub({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEndpoint(undefined);
    } catch (err) {
      console.error("Unsubscribe failed:", err);
      setError("Failed to turn off notifications");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, removeSub]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
