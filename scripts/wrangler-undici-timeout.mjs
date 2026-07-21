import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(
  new Agent({
    // Large OpenNext Worker uploads regularly exceed 20m on slow links.
    bodyTimeout: 45 * 60 * 1000,
    headersTimeout: 45 * 60 * 1000,
    connect: {
      timeout: 5 * 60 * 1000,
    },
  }),
);
