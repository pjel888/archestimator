"use client";

import { useCallback, useInsertionEffect, useRef } from "react";

// Identity-stable event-handler wrapper: callers always reach the latest
// closure. Only safe for handlers invoked after commit — never call the
// returned function during render.
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const callbackRef = useRef(callback);
  useInsertionEffect(() => {
    callbackRef.current = callback;
  });
  return useCallback((...args: Args) => callbackRef.current(...args), []);
}
