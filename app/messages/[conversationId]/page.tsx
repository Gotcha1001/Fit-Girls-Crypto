import { MessageThread } from "@/app/components/MessageThread";
import type { Id } from "@/convex/_generated/dataModel";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({
  params,
}: ConversationPageProps): Promise<React.JSX.Element> {
  const { conversationId } = await params;

  return (
    <div className="mx-auto h-[calc(100vh-8rem)] max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800">
      <MessageThread conversationId={conversationId as Id<"conversations">} />
    </div>
  );
}
