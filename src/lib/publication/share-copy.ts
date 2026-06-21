export const SHARED_LINK_UNAVAILABLE_COPY = {
  title: "This shared proposal is unavailable",
  body: "Ask the sender for a fresh link.",
} as const;

export function sharedLinkUnavailableErrorBody() {
  return {
    error: SHARED_LINK_UNAVAILABLE_COPY.title,
    message: SHARED_LINK_UNAVAILABLE_COPY.body,
  };
}
