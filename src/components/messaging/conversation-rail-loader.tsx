import { listConversationsForUser } from "@/lib/data/conversations";
import { ConversationRail } from "./conversation-rail";

/**
 * Async server component that fetches the viewer's inbox and renders the rail.
 * Kept separate from the messages layout so the heavy `listConversationsForUser`
 * query runs INSIDE the layout's <Suspense> boundary — the shell and the open
 * thread paint immediately while this streams in.
 */
export async function ConversationRailLoader({
  userId,
  basePath,
}: {
  userId: string;
  basePath: string;
}) {
  const conversations = await listConversationsForUser(userId);
  return <ConversationRail conversations={conversations} basePath={basePath} />;
}
