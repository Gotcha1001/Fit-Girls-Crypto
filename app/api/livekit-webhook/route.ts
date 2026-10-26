import { WebhookReceiver } from "livekit-server-sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// livekit-server-sdk needs the Node runtime (not Edge)
export const runtime = "nodejs";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

export async function POST(req: Request) {
  // Signature verification needs the RAW body, so read it as text.
  const body = await req.text();
  const authHeader = req.headers.get("Authorization") ?? undefined;

  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    if (
      event.event === "participant_joined" &&
      event.room &&
      event.participant
    ) {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

      // participant.joinedAt is in seconds (bigint); fall back to "now"
      const joinedAtMs =
        Number(event.participant.joinedAt) * 1000 || Date.now();

      await convex.mutation(api.noShow.recordJoin, {
        secret: process.env.WEBHOOK_SHARED_SECRET!,
        roomName: event.room.name,
        identity: event.participant.identity,
        joinedAt: joinedAtMs,
      });
    }
  } catch (err) {
    console.error("livekit-webhook: failed to record event", err);
    // 500 makes LiveKit retry delivery
    return new Response("Error", { status: 500 });
  }

  return new Response("ok");
}
