const cucumberConfig = {
  default: {
    paths: ["features/**/*.feature"],
    import: ["features/step-definitions/**/*.mjs"],
    format: [
      "progress",
      "json:artifacts/cucumber/cucumber.json",
      "junit:artifacts/cucumber/cucumber.xml",
      "html:artifacts/cucumber/cucumber.html",
    ],
    parallel: 1,
    retry: 0,
    strict: true,
  },
};

export default cucumberConfig;
