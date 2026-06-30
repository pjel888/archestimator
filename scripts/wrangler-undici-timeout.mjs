import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(
  new Agent({
    bodyTimeout: 20 * 60 * 1000,
    headersTimeout: 20 * 60 * 1000,
    connect: {
      timeout: 2 * 60 * 1000,
    },
  }),
);
