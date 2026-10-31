// app/api/push/send/route.ts
// Called by the Convex action (server to server), protected by CRON_SECRET.
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

interface PushPayload {
  subscription: string; // JSON string of the PushSubscription
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const authHeader = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. VAPID config
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL!}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    // 3. Parse body
    const { subscription, title, body, url, tag } =
      (await req.json()) as PushPayload;

    const subObj = JSON.parse(subscription) as webpush.PushSubscription;

    // 4. Send
    await webpush.sendNotification(
      subObj,
      JSON.stringify({ title, body, url, tag }),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push send error:", err);

    let statusCode = 500;
    let errorMessage = "Internal server error";
    if (err && typeof err === "object") {
      if ("statusCode" in err && typeof err.statusCode === "number") {
        statusCode = err.statusCode;
      }
      if ("message" in err && typeof err.message === "string") {
        errorMessage = err.message;
      }
    }

    if (statusCode === 410 || statusCode === 404) {
      return NextResponse.json(
        { error: "Subscription expired or gone" },
        { status: 410 },
      );
    }
    return NextResponse.json(
      { error: "Push failed", details: errorMessage },
      { status: statusCode },
    );
  }
}
