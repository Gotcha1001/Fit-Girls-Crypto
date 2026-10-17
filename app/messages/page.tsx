// app/messages/page.tsx
import { ConversationList } from "@/app/components/ConversationList";
import { DeleteAllMessagesButton } from "@/app/components/DeleteAllMessagesButton";

export default function MessagesPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <DeleteAllMessagesButton />
      </div>
      <ConversationList />
    </div>
  );
}
