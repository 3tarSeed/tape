import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Settings } from "lucide-react";
import { GROUPS, INSTRUMENTS, formatChange, formatPrice, type Quote } from "@/lib/instruments";
import { getHeadlines, getQuotes } from "@/lib/quotes.functions";
import { useTapeSettings } from "@/lib/tape-settings";
import { LedTicker } from "@/components/led-ticker";

function Clock() {
  const [text, setText] = useState("--:--:--");
  useEffect(() => {
    const tick = () =>
      setText(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <time className="clock">{text}</time>;
}

export function TapeDesk() {
  const { settings, patch, toggle, setGroup } = useTapeSettings();
  const [open, setOpen] = useState(false);
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const [quoteResult, newsResult] = await Promise.allSettled([getQuotes(), getHeadlines()]);
        if (cancel) return;
        if (quoteResult.status === "fulfilled") {
          setQuotes(quoteResult.value);
          setUpdatedAt(Date.now());
          setError(null);
        } else if (!cancel) {
          setError("Feed interrupted");
        }
        if (newsResult.status === "fulfilled") setHeadlines(newsResult.value);
      } catch {
        if (!cancel) setError("Feed interrupted");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const visible = useMemo(
    () => quotes.filter((quote) => settings.enabled.includes(quote.id)),
    [quotes, settings.enabled],
  );

  const status = loading
    ? "CONNECTING LIVE FEED"
    : settings.enabled.length === 0
      ? "NO MARKETS SELECTED    OPEN SETTINGS"
      : error
        ? "FEED DARK    RETRYING"
        : "WAITING ON PRICES";

  const paused = held || (settings.pauseOnHover && hover) || open;
  const fill = settings.barOnly && !open;
  const age =
    updatedAt === null
      ? "Connecting"
      : error
        ? "Last prices, retrying"
        : `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <main className={fill ? "desk fill-bar" : "desk"}>
      {!fill && (
        <section className="board">
          <header className="mast">
            <div>
              <p className="brand">Tape</p>
              <p className="tag">Live strip for the bottom of a Mac or Windows desk</p>
            </div>
            <div className="mast-meta">
              <Clock />
              <span className={error ? "age bad" : "age"}>{age}</span>
              <button type="button" className="text-btn" onClick={() => setOpen(true)}>
                <Settings aria-hidden="true" />
                Settings
              </button>
            </div>
          </header>

          {visible.length === 0 ? (
            <p className="empty">
              {loading ? "Pulling live prices." : "Nothing is armed. Open Settings and light a market."}
            </p>
          ) : (
            <ul className="modules">
              {visible.map((quote) => {
                const up = quote.changePct >= 0;
                return (
                  <li key={quote.id} className="module">
                    <div className="module-top">
                      <span className="sym">{quote.symbol}</span>
                      <span className={up ? "chg up" : "chg down"}>{formatChange(quote.changePct)}</span>
                    </div>
                    <p className="px">{formatPrice(quote.price, quote.digits)}</p>
                    <p className="nm">{quote.name}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {open && (
        <section className="sheet" role="dialog" aria-label="Ticker settings">
          <div className="sheet-head">
            <h2>Settings</h2>
            <button type="button" className="text-btn" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
          <p className="sheet-note">
            Currency rows are how much of that currency one US dollar buys. Gold, silver, and crypto are in dollars.
          </p>
          {GROUPS.map((group) => {
            const items = INSTRUMENTS.filter((item) => item.group === group.id);
            const ids = items.map((item) => item.id);
            const allOn = ids.every((id) => settings.enabled.includes(id));
            return (
              <div key={group.id} className="group">
                <div className="group-head">
                  <h3>{group.label}</h3>
                  <button type="button" className="linkish" onClick={() => setGroup(ids, !allOn)}>
                    {allOn ? "Clear" : "All"}
                  </button>
                </div>
                <div className="picks">
                  {items.map((item) => {
                    const on = settings.enabled.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={on ? "pick on" : "pick"}
                        aria-pressed={on}
                        onClick={() => toggle(item.id)}
                      >
                        <span className="lamp" aria-hidden="true" />
                        <span className="pick-sym">{item.symbol}</span>
                        <span className="pick-name">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="group">
            <h3>Tape</h3>
            <div className="speeds" role="group" aria-label="Scroll speed">
              {(["slow", "desk", "fast"] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={settings.speed === speed ? "pick on" : "pick"}
                  aria-pressed={settings.speed === speed}
                  onClick={() => patch({ speed })}
                >
                  {speed === "desk" ? "Desk" : speed === "slow" ? "Slow" : "Fast"}
                </button>
              ))}
            </div>
            <label className="bright">
              Brightness
              <input
                type="range"
                min={0.45}
                max={1}
                step={0.05}
                value={settings.brightness}
                onChange={(event) => patch({ brightness: Number(event.target.value) })}
              />
            </label>
            <button
              type="button"
              className={settings.pauseOnHover ? "pick on" : "pick"}
              aria-pressed={settings.pauseOnHover}
              onClick={() => patch({ pauseOnHover: !settings.pauseOnHover })}
            >
              <span className="lamp" aria-hidden="true" />
              Pause when the pointer is on the tape
            </button>
            <button
              type="button"
              className={settings.barOnly ? "pick on" : "pick"}
              aria-pressed={settings.barOnly}
              onClick={() => patch({ barOnly: !settings.barOnly })}
            >
              <span className="lamp" aria-hidden="true" />
              Bar only
            </button>
            <p className="sheet-note">
              Bar only hides the board so the window is just the strip. On a Mac or Windows PC, open Tape in its own
              browser window and snap that window to the bottom of the screen.
            </p>
          </div>
        </section>
      )}

      <footer
        className="bezel"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="bezel-cap">
          <span className="cap-name">Tape</span>
          <span className={error ? "live bad" : "live"}>
            <span className="live-dot" aria-hidden="true" />
            {error ? "Retry" : "Live"}
          </span>
        </div>
        <div className="bezel-window">
          <LedTicker
            quotes={visible}
            headlines={headlines}
            speed={settings.speed}
            brightness={settings.brightness}
            paused={paused}
            status={status}
          />
        </div>
        <div className="bezel-actions">
          <button
            type="button"
            className="icon-btn"
            aria-pressed={held}
            aria-label={held ? "Resume tape" : "Pause tape"}
            onClick={() => setHeld((value) => !value)}
          >
            {held ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-expanded={open}
            aria-label="Settings"
            onClick={() => setOpen((value) => !value)}
          >
            <Settings aria-hidden="true" />
          </button>
        </div>
      </footer>
    </main>
  );
}
