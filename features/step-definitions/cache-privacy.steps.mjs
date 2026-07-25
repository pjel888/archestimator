import { execFileSync } from "node:child_process";

import { Given, Then, When } from "@cucumber/cucumber";

function probe(path) {
  const stdout = execFileSync(
    "bun",
    ["run", "features/support/probe-cache-privacy.ts", path],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        ARCHESTIMATOR_AUTH_PROVIDER: "",
        ARCHESTIMATOR_DEV_AUTH_BYPASS: "0",
      },
    },
  );
  return JSON.parse(stdout);
}

Given("a public visitor requests {string}", function (path) {
  this.requestPath = path;
});

Given(
  "an OAuth callback failure contains state and code secrets",
  function () {
    this.requestPath =
      "/?error=state_mismatch&state=gherkin-state-secret&code=gherkin-code-secret&cookie=gherkin-cookie-secret&next=%2Fapi%2Fauth%2Fcallback%2Fgoogle%3Fcode%3Dgherkin-code-secret";
  },
);

When("the edge request policy is applied", function () {
  this.response = probe(this.requestPath);
});

Then("the response is cacheable at the edge", function () {
  if (!this.response.cacheControl?.includes("s-maxage=31536000")) {
    throw new Error(
      `Expected shared edge caching, got ${this.response.cacheControl}`,
    );
  }
});

Then("the response is not marked private", function () {
  if (this.response.cacheControl?.includes("private")) {
    throw new Error(
      `Expected a public cache policy, got ${this.response.cacheControl}`,
    );
  }
});

Then("the response is private and non-cacheable", function () {
  const value = this.response.cacheControl ?? "";
  if (!value.includes("private") || !value.includes("no-store")) {
    throw new Error(`Expected private no-store, got ${value}`);
  }
});

Then("the response is not cacheable at the edge", function () {
  if (this.response.cacheControl?.includes("s-maxage")) {
    throw new Error(
      `Sensitive response exposed shared caching: ${this.response.cacheControl}`,
    );
  }
});

Then(
  "the response does not disclose the recipient token in a redirect",
  function () {
    if (this.response.location?.includes("private-recipient")) {
      throw new Error("Recipient token was reflected into a redirect.");
    }
  },
);

Then(
  "the callback secrets are absent from the recovery destination",
  function () {
    const location = this.response.location ?? "";
    if (
      /gherkin-state-secret|gherkin-code-secret|gherkin-cookie-secret/.test(
        location,
      )
    ) {
      throw new Error(`Recovery destination reflected a secret: ${location}`);
    }
  },
);

Then("the response redirects to a clean login recovery", function () {
  const location = new URL(this.response.location);
  const keys = [...location.searchParams.keys()].sort();
  if (
    this.response.status !== 307 ||
    location.pathname !== "/login" ||
    location.searchParams.get("next") !== "/workshop" ||
    location.searchParams.get("oauth_state_reset") !== "1" ||
    keys.join(",") !== "next,oauth_state_reset"
  ) {
    throw new Error(`Unsafe OAuth recovery response: ${JSON.stringify(this.response)}`);
  }
});

Then("browser cache cookies and storage are cleared", function () {
  if (
    this.response.clearSiteData !== '"cache", "cookies", "storage"' ||
    !this.response.setCookie?.includes("better-auth.state=")
  ) {
    throw new Error(
      `Expected browser-state cleanup, got ${JSON.stringify(this.response)}`,
    );
  }
});
