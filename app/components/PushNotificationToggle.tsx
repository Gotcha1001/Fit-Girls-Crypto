// components/PushNotificationToggle.tsx
"use client";

import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushNotificationToggle() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <p className="text-sm opacity-70">
        This browser doesn&apos;t support notifications. On iPhone, tap Share →
        Add to Home Screen first, then open the app from your home screen.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-sm opacity-70">
        Notifications are blocked. Enable them for this site in your browser
        settings, then reload.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50"
      >
        {isSubscribed ? (
          <>
            <BellOff className="h-4 w-4" />
            Turn off booking notifications
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" />
            Get notified when I&apos;m booked
          </>
        )}
      </button>
      {isSubscribed && (
        <p className="text-xs opacity-70">
          Notifications are on for this device.
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
