import { Platform } from "react-native";

import { supabase } from "../supabase";
import type { TablesInsert } from "../database.types";
import { urlBase64ToUint8Array } from "./utils";

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window
  );
}

export function getNotificationPermission():
  NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await getReadyRegistration();
  return registration.pushManager.getSubscription();
}

type SubscriptionJSON = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

// Shared by the initial subscribe flow and by the service worker's
// 'pushsubscriptionchange' handler (public/sw.js), which hands us a plain
// JSON subscription instead of a live PushSubscription object.
//
// push_subscriptions.endpoint only has a *partial* unique index (platform =
// 'web'), so PostgREST's upsert(onConflict:) can't target it — Postgres
// requires the ON CONFLICT predicate to match a partial index exactly, and
// PostgREST doesn't expose a way to supply one. Look the row up and
// update-or-insert explicitly instead.
export async function persistSubscription(
  userId: string,
  subscriptionJson: SubscriptionJSON,
): Promise<void> {
  const { endpoint, keys } = subscriptionJson;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("Push subscription is missing required fields");
  }

  const row: TablesInsert<"push_subscriptions"> = {
    user_id: userId,
    platform: "web",
    endpoint,
    p256dh: keys.p256dh,
    web_push_auth_key: keys.auth,
    user_agent: navigator.userAgent,
    is_active: true,
    last_seen_at: new Date().toISOString(),
  };

  const { data: existing, error: lookupError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .eq("platform", "web")
    .maybeSingle();

  if (lookupError) throw lookupError;

  const { error } = existing
    ? await supabase
        .from("push_subscriptions")
        .update(row)
        .eq("id", existing.id)
    : await supabase.from("push_subscriptions").insert(row);

  if (error) throw error;
}

export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser");
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_VAPID_PUBLIC_KEY. Check your .env file.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const registration = await getReadyRegistration();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await persistSubscription(userId, subscription.toJSON());
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await getReadyRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const { endpoint } = subscription;
  await subscription.unsubscribe();

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint)
    .eq("platform", "web");

  if (error) throw error;
}
