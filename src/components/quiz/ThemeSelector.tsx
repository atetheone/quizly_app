"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const THEME_KEYS = [
  "scienceNature",
  "worldHistory",
  "geography",
  "mathematics",
  "technologyAI",
  "sports",
  "moviesTV",
  "music",
  "literature",
  "foodCooking",
  "spaceAstronomy",
  "generalKnowledge",
] as const;

type ThemeKey = (typeof THEME_KEYS)[number];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ThemeSelector({ value, onChange, placeholder }: Props) {
  const t = useTranslations("import");
  const tTheme = useTranslations("import.themes");

  const findKey = (v: string): ThemeKey | null =>
    THEME_KEYS.find((k) => tTheme(k) === v) ?? null;

  const [selectedKey, setSelectedKey] = useState<ThemeKey | null>(
    () => findKey(value)
  );
  const [customActive, setCustomActive] = useState(
    () => value !== "" && findKey(value) === null
  );

  function selectPreset(key: ThemeKey) {
    setSelectedKey(key);
    setCustomActive(false);
    onChange(tTheme(key));
  }

  function activateCustom() {
    setSelectedKey(null);
    setCustomActive(true);
    onChange("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {THEME_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => selectPreset(key)}
            className="q-chip"
            style={{
              cursor: "pointer",
              background: selectedKey === key ? "var(--q-ink)" : "var(--q-bg-2)",
              color: selectedKey === key ? "var(--q-bg)" : "var(--q-ink-2)",
              fontWeight: selectedKey === key ? 600 : 400,
            }}
          >
            {tTheme(key)}
          </button>
        ))}
        <button
          type="button"
          onClick={activateCustom}
          className="q-chip"
          style={{
            cursor: "pointer",
            background: customActive ? "var(--q-ink)" : "var(--q-bg-2)",
            color: customActive ? "var(--q-bg)" : "var(--q-ink-2)",
            fontWeight: customActive ? 600 : 400,
          }}
        >
          ✏️ {t("themeCustom")}
        </button>
      </div>

      {customActive && (
        <input
          className="q-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("themeCustomPlaceholder")}
          maxLength={200}
          autoFocus
        />
      )}
    </div>
  );
}
