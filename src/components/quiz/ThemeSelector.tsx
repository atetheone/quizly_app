"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PRESET_THEMES = [
  "Science & Nature",
  "World History",
  "Geography",
  "Mathematics",
  "Technology & AI",
  "Sports",
  "Movies & TV",
  "Music",
  "Literature",
  "Food & Cooking",
  "Space & Astronomy",
  "General Knowledge",
] as const;

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ThemeSelector({ value, onChange, placeholder }: Props) {
  const t = useTranslations("import");

  const [customActive, setCustomActive] = useState(
    () => value !== "" && !(PRESET_THEMES as readonly string[]).includes(value)
  );

  function selectPreset(theme: string) {
    setCustomActive(false);
    onChange(theme);
  }

  function activateCustom() {
    setCustomActive(true);
    onChange("");
  }

  const activePreset = !customActive ? value : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PRESET_THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => selectPreset(theme)}
            className="q-chip"
            style={{
              cursor: "pointer",
              background: activePreset === theme ? "var(--q-ink)" : "var(--q-bg-2)",
              color: activePreset === theme ? "var(--q-bg)" : "var(--q-ink-2)",
              fontWeight: activePreset === theme ? 600 : 400,
            }}
          >
            {theme}
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
