import "server-only";

/** Typed access to environment variables. See .env.example for docs. */
export const env = {
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  get dataDir() {
    return process.env.DATA_DIR ?? "./data";
  },
  get discord() {
    return {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      guildId: process.env.DISCORD_GUILD_ID ?? "",
      redirectUri: process.env.DISCORD_REDIRECT_URI || `${this.appUrl}/api/auth/callback`,
    };
  },
  /** Discord OAuth is usable only when all credentials are present. */
  get discordConfigured() {
    const d = this.discord;
    return Boolean(d.clientId && d.clientSecret && d.guildId);
  },
  /**
   * Mock login lets you sign in as any role without Discord. Never enable it
   * on a public deployment: in production it needs a second explicit flag.
   */
  get mockLoginEnabled() {
    if (process.env.MOCK_LOGIN !== "true") return false;
    return !this.isProduction || process.env.ALLOW_MOCK_LOGIN_IN_PRODUCTION === "true";
  },
  /** Cookies get the Secure flag whenever the app is served over https. */
  get secureCookies() {
    return this.appUrl.startsWith("https://");
  },
  /** Trust X-Forwarded-For from the reverse proxy (set when behind nginx/caddy). */
  get trustProxy() {
    return process.env.TRUST_PROXY === "true";
  },
};
