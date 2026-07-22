import type {
  SupportConversationRow,
  SupportMailboxPage,
} from "@/lib/repositories/support-conversations-d1";

export function findSelectedSupportConversation(
  conversations: readonly SupportConversationRow[],
  selectedId: string,
) {
  if (!selectedId) return null;
  return conversations.find((conversation) => conversation.id === selectedId) ?? null;
}

export function mergeSupportConversationPages(pages: readonly SupportMailboxPage[]) {
  const seen = new Set<string>();
  const conversations: SupportConversationRow[] = [];

  for (const page of pages) {
    for (const conversation of page.conversations) {
      if (seen.has(conversation.id)) continue;
      seen.add(conversation.id);
      conversations.push(conversation);
    }
  }

  return conversations;
}
