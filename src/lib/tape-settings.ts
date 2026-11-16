import { useEffect, useState } from "react";
import { DEFAULT_ENABLED, INSTRUMENTS } from "@/lib/instruments";

export type Speed = "slow" | "desk" | "fast";

export type TapeSettings = {
  enabled: string[];
  speed: Speed;
  brightness: number;
  pauseOnHover: boolean;
  barOnly: boolean;
};

const KEY = "tape.settings.v1";

const DEFAULTS: TapeSettings = {
  enabled: DEFAULT_ENABLED,
  speed: "desk",
  brightness: 1,
  pauseOnHover: true,
  barOnly: false,
};

const KNOWN = new Set(INSTRUMENTS.map((item) => item.id));

function sanitize(value: unknown): TapeSettings {
  if (!value || typeof value !== "object") return DEFAULTS;
  const raw = value as Partial<TapeSettings>;
  const enabled = Array.isArray(raw.enabled)
    ? raw.enabled.filter((id): id is string => typeof id === "string" && KNOWN.has(id))
    : DEFAULTS.enabled;
  const speed: Speed = raw.speed === "slow" || raw.speed === "fast" ? raw.speed : "desk";
  const brightness =
    typeof raw.brightness === "number" ? Math.min(1, Math.max(0.45, raw.brightness)) : 1;
  return {
    enabled,
    speed,
    brightness,
    pauseOnHover: raw.pauseOnHover !== false,
    barOnly: raw.barOnly === true,
  };
}

export function useTapeSettings() {
  const [settings, setSettings] = useState<TapeSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setSettings(sanitize(JSON.parse(stored)));
    } catch {
      /* keep defaults */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(settings));
  }, [settings, ready]);

  function patch(next: Partial<TapeSettings>) {
    setSettings((current) => ({ ...current, ...next }));
  }

  function toggle(id: string) {
    setSettings((current) => {
      const on = current.enabled.includes(id);
      return {
        ...current,
        enabled: on ? current.enabled.filter((item) => item !== id) : [...current.enabled, id],
      };
    });
  }

  function setGroup(ids: string[], on: boolean) {
    setSettings((current) => {
      const rest = current.enabled.filter((id) => !ids.includes(id));
      return { ...current, enabled: on ? [...rest, ...ids] : rest };
    });
  }

  return { settings, ready, patch, toggle, setGroup };
}

export const SPEED_PX: Record<Speed, number> = {
  slow: 42,
  desk: 86,
  fast: 148,
};
