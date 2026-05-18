"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/locale";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Module-scope so the cookie write isn't a component-body side effect. */
function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${ONE_YEAR};samesite=lax`;
}

/**
 * Locale toggle. Writes the {@link LOCALE_COOKIE} cookie and refreshes so the
 * server tree re-renders in the new locale. No URL change — room links stay
 * prefix-free.
 *
 * Mounted globally in the root layout for now; later page-extraction PRs move
 * it into each page's nav.
 */
export function LanguageSwitcher() {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === active) return;
    writeLocaleCookie(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      aria-label="Language"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 50,
        display: "flex",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "var(--q-bg)",
        border: "1.5px solid var(--q-line)",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {locales.map((loc) => {
        const isActive = loc === active;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => pick(loc)}
            aria-pressed={isActive}
            disabled={pending}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "none",
              cursor: isActive ? "default" : "pointer",
              fontFamily: "var(--q-sans)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              background: isActive ? "var(--q-ink)" : "transparent",
              color: isActive ? "var(--q-yellow)" : "var(--q-ink)",
            }}
          >
            {loc}
          </button>
        );
      })}
    </div>
  );
}
