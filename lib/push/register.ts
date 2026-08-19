import { Platform } from "react-native";

import { supabase } from "../supabase";
import { persistSubscription } from "./subscription";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

// Registers public/sw.js and wires up the one message the service worker
// sends back: a subscription the browser rotated on its own (see
// 'pushsubscriptionchange' in sw.js). Safe to call from multiple places —
// the promise is memoized so the worker is only registered once.
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (
    Platform.OS !== "web" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return Promise.resolve(null);
  }

  if (!registrationPromise) {
    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );
    registrationPromise = navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => {
        console.error("Failed to register service worker", err);
        return null;
      });
  }

  return registrationPromise;
}

async function handleServiceWorkerMessage(event: MessageEvent) {
  if (event.data?.type !== "PUSH_SUBSCRIPTION_CHANGED") return;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  try {
    await persistSubscription(userId, event.data.subscription);
  } catch (err) {
    console.error("Failed to persist rotated push subscription", err);
  }
}
