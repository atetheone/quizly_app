/**
 * Shared locale constants and helpers.
 *
 * Used by the middleware (Edge), the next-intl request config, and the
 * client-side language switcher — keep this dependency-free and Edge-safe.
 */

export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that pins the active locale. Read by `i18n/request.ts`. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Resolve a locale from an `Accept-Language` header value.
 *
 * Picks the first language tag whose primary subtag is a supported locale
 * (e.g. `fr-FR` → `fr`); falls back to {@link defaultLocale}. Quality values
 * (`;q=`) are stripped but not ranked — for two locales, first-match is enough.
 */
export function resolveLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return defaultLocale;
}
