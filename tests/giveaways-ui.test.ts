import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { safeDiscordUrl, safeHttpsUrl, safeImageUrl, splitDuration } from "@/lib/giveaways/client";
import { dictionaries } from "@/lib/i18n";
import { proxy, config } from "@/proxy";

describe("giveaways: links from the backend", () => {
  it("Open in Discord only accepts https discord.com links", () => {
    expect(safeDiscordUrl("https://discord.com/channels/1/2/3")).toBe("https://discord.com/channels/1/2/3");
    expect(safeDiscordUrl("https://ptb.discord.com/channels/1/2/3")).toBeTruthy();
    expect(safeDiscordUrl("https://discordapp.com/channels/1/2/3")).toBeTruthy();
    for (const bad of ["javascript:alert(1)", "http://discord.com/x", "https://discord.com.evil.io/x", "https://evil.io/discord.com", "", null, undefined]) {
      expect(safeDiscordUrl(bad)).toBeNull();
    }
  });
  it("invite links and banners must be https (or site-relative banners)", () => {
    expect(safeHttpsUrl("https://discord.gg/abc")).toBe("https://discord.gg/abc");
    expect(safeHttpsUrl("data:text/html,hi")).toBeNull();
    expect(safeImageUrl("/giveaways/banner-active.webp")).toBe("/giveaways/banner-active.webp");
    expect(safeImageUrl("https://cdn.discordapp.com/x.webp")).toBeTruthy();
    expect(safeImageUrl("//evil.io/x.png")).toBeNull();
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("giveaways: countdown", () => {
  it("splits a duration into d/h/m/s and never goes negative", () => {
    expect(splitDuration(((2 * 24 + 5) * 3600 + 17 * 60 + 9) * 1000)).toEqual({ d: 2, h: 5, m: 17, s: 9 });
    expect(splitDuration(-5000)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
  });
});

describe("giveaways: Arabic by default for Arabic browsers", () => {
  const req = (lang: string, cookie?: string) =>
    new NextRequest("http://localhost:3000/giveaways", { headers: { "accept-language": lang, ...(cookie ? { cookie } : {}) } });

  it("only runs on the public pages", () => {
    expect(config.matcher).toEqual(["/giveaways", "/giveaways/:path*"]);
  });
  it("sets jh_locale=ar for a first visit from an Arabic browser", () => {
    const res = proxy(req("ar-JO,ar;q=0.9,en;q=0.8"));
    expect(res.cookies.get("jh_locale")?.value).toBe("ar");
  });
  it("leaves other browsers and an existing choice alone", () => {
    expect(proxy(req("en-US,en;q=0.9")).cookies.get("jh_locale")).toBeUndefined();
    expect(proxy(req("ar", "jh_locale=en")).cookies.get("jh_locale")).toBeUndefined();
  });
});

describe("giveaways: copy", () => {
  it("uses the agreed authorization wording in both languages", () => {
    expect(dictionaries.en.gw.authorize.name).toBe("See your Discord name and avatar");
    expect(dictionaries.ar.gw.authorize.name).toBe("يشوف اسمك وصورتك في ديسكورد");
    expect(dictionaries.en.gw.authorize.join).toBe(
      "Add you to our servers (JoHood, JoHood Catalog, the game server) when you join a giveaway or when we move our community",
    );
    expect(dictionaries.ar.gw.authorize.join).toBe("يضيفك لسيرفراتنا (جوهود، كتالوج جوهود، سيرفر اللعبة) لما تشارك بسحب أو لما ننقل مجتمعنا");
    expect(dictionaries.en.gw.authorize.removable).toBe("You can remove this any time");
  });
});
