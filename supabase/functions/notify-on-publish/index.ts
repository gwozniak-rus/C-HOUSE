// Sends Web Push notifications to a team's roster when a piece of content
// is published. Invoked by the `notify_on_publish` Postgres trigger via
// pg_net — see supabase/migrations/20260813120000_notify_on_publish.sql.
//
// verify_jwt is off for this function (see supabase/config.toml) because
// the caller is Postgres, not a browser, and this project's API key system
// varies by environment (legacy JWT keys vs. newer non-JWT publishable/
// secret keys). Auth is a shared secret instead, checked below.
//
// Requires NOTIFY_ON_PUBLISH_SECRET / VAPID_SUBJECT / VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY as function secrets (supabase/functions/.env locally,
// `supabase secrets set` remotely).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

import type { Database } from "../../../lib/database.types.ts";

const NOTIFY_ON_PUBLISH_SECRET = Deno.env.get("NOTIFY_ON_PUBLISH_SECRET");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

if (VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type NotifyPayload = {
  content_type: string;
  record_id: string;
  team_id: string;
};

type ResolvedContent = {
  title: string;
  body: string;
  excludeUserId: string | null;
};

// Add a case here for every content type that gets its own publish trigger
// (practice plans, itineraries, ...). Each resolver re-reads the row by id
// rather than trusting the trigger's payload, and confirms it's actually
// published, so a stale or replayed call can't leak a draft.
async function resolveContent(
  admin: ReturnType<typeof createClient<Database>>,
  payload: NotifyPayload,
): Promise<ResolvedContent | null> {
  if (payload.content_type !== "announcement") return null;

  const { data, error } = await admin
    .from("announcements")
    .select("title, body, created_by, published_at")
    .eq("id", payload.record_id)
    .maybeSingle();

  if (error || !data || !data.published_at) return null;

  return { title: data.title, body: data.body, excludeUserId: data.created_by };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (
    !NOTIFY_ON_PUBLISH_SECRET ||
    req.headers.get("x-webhook-secret") !== NOTIFY_ON_PUBLISH_SECRET
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("notify-on-publish: VAPID secrets are not configured");
    return new Response(JSON.stringify({ error: "Push not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = (await req.json()) as NotifyPayload;

  const admin = createClient<Database>(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const content = await resolveContent(admin, payload);
  if (!content) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: members, error: membersError } = await admin
    .from("team_members")
    .select("user_id")
    .eq("team_id", payload.team_id);

  if (membersError) {
    return new Response(JSON.stringify({ error: membersError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Don't notify the person who just published it.
  const recipientIds = (members ?? [])
    .map((member) => member.user_id)
    .filter((userId) => userId !== content.excludeUserId);

  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, failed: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, web_push_auth_key")
    .in("user_id", recipientIds)
    .eq("platform", "web")
    .eq("is_active", true);

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const notificationPayload = JSON.stringify({
    title: content.title,
    body: content.body,
    tag: `${payload.content_type}-${payload.record_id}`,
    url: "/",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      if (
        !subscription.endpoint ||
        !subscription.p256dh ||
        !subscription.web_push_auth_key
      ) {
        return;
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.web_push_auth_key,
            },
          },
          notificationPayload,
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone on the browser's end (uninstalled, cleared
          // storage, etc.) — stop sending to it instead of retrying forever.
          await admin
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", subscription.id);
        } else {
          console.error(
            `notify-on-publish: send failed for subscription ${subscription.id}`,
            err,
          );
        }
      }
    }),
  );

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
