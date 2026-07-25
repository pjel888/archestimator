import { NextRequest } from "next/server";

import { proxy } from "../../src/lib/auth/request-proxy";

const path = process.argv[2];
if (!path?.startsWith("/")) {
  throw new Error("Expected an absolute request path beginning with '/'.");
}

process.env.ARCHESTIMATOR_AUTH_PROVIDER = "";
process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS = "0";

const response = await proxy(
  new NextRequest(new URL(path, "http://localhost:3000")),
);

process.stdout.write(
  JSON.stringify({
    status: response.status,
    location: response.headers.get("location"),
    cacheControl: response.headers.get("cache-control"),
    clearSiteData: response.headers.get("clear-site-data"),
    setCookie: response.headers.get("set-cookie"),
  }),
);
