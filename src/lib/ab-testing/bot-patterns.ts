const BOT_UA_PATTERNS = [
  /googlebot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /bingbot/i,
  /duckduckbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /slurp/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /discordbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /uptime/i,
  /pingdom/i,
  /statuscake/i,
  /monitor/i,
  /headless/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
];

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
