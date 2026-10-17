import { VideoCallRoom } from "@/app/components/VideoCallRoom";
import type { Id } from "@/convex/_generated/dataModel";

interface CallPageProps {
  params: Promise<{ callSessionId: string }>;
}

export default async function CallPage({
  params,
}: CallPageProps): Promise<React.JSX.Element> {
  const { callSessionId } = await params;

  return (
    <div className="h-[calc(100dvh-8rem)] overflow-hidden rounded-2xl">
      <VideoCallRoom callSessionId={callSessionId as Id<"callSessions">} />
    </div>
  );
}
