import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../auth-context";
import { registerServiceWorker } from "./register";
import {
  getExistingSubscription,
  getNotificationPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "./subscription";

type PushNotificationsState = {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
};

export function usePushNotifications(): PushNotificationsState {
  const { session } = useAuth();
  const supported = isPushSupported();

  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(getNotificationPermission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(supported);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    registerServiceWorker()
      .then(() => getExistingSubscription())
      .then((subscription) => {
        if (!cancelled) setIsSubscribed(subscription !== null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!session?.user.id) {
      setError("You must be signed in to enable notifications");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await subscribeToPush(session.user.id);
      setIsSubscribed(true);
      setPermission(getNotificationPermission());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [session?.user.id]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported: supported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
