import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./locale";

/**
 * Per-request i18n config (no i18n routing).
 *
 * The active locale is resolved from the {@link LOCALE_COOKIE} cookie, which
 * the middleware stamps from `Accept-Language` on first visit and the language
 * switcher overrides. There is no `[locale]` URL segment, so `requestLocale`
 * is ignored here.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieValue) ? cookieValue : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
