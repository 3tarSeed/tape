export type Group = "metals" | "crypto" | "fx" | "markets";

export type Instrument = {
  id: string;
  symbol: string;
  name: string;
  group: Group;
  yahoo: string;
  /** Quote is XXXUSD; show how many units one US dollar buys. */
  invert: boolean;
  digits: number;
};

export const GROUPS: { id: Group; label: string }[] = [
  { id: "metals", label: "Metals" },
  { id: "crypto", label: "Crypto" },
  { id: "fx", label: "US dollar" },
  { id: "markets", label: "Markets" },
];

export const INSTRUMENTS: Instrument[] = [
  { id: "xau", symbol: "XAU", name: "Gold", group: "metals", yahoo: "GC=F", invert: false, digits: 2 },
  { id: "xag", symbol: "XAG", name: "Silver", group: "metals", yahoo: "SI=F", invert: false, digits: 2 },
  { id: "xpt", symbol: "XPT", name: "Platinum", group: "metals", yahoo: "PL=F", invert: false, digits: 2 },

  { id: "btc", symbol: "BTC", name: "Bitcoin", group: "crypto", yahoo: "BTC-USD", invert: false, digits: 0 },
  { id: "eth", symbol: "ETH", name: "Ethereum", group: "crypto", yahoo: "ETH-USD", invert: false, digits: 2 },
  { id: "xrp", symbol: "XRP", name: "XRP", group: "crypto", yahoo: "XRP-USD", invert: false, digits: 4 },
  { id: "sol", symbol: "SOL", name: "Solana", group: "crypto", yahoo: "SOL-USD", invert: false, digits: 2 },
  { id: "doge", symbol: "DOGE", name: "Dogecoin", group: "crypto", yahoo: "DOGE-USD", invert: false, digits: 5 },
  { id: "ada", symbol: "ADA", name: "Cardano", group: "crypto", yahoo: "ADA-USD", invert: false, digits: 4 },
  { id: "ltc", symbol: "LTC", name: "Litecoin", group: "crypto", yahoo: "LTC-USD", invert: false, digits: 2 },
  { id: "bnb", symbol: "BNB", name: "BNB", group: "crypto", yahoo: "BNB-USD", invert: false, digits: 2 },

  { id: "eur", symbol: "EUR", name: "USD to EUR", group: "fx", yahoo: "EURUSD=X", invert: true, digits: 4 },
  { id: "gbp", symbol: "GBP", name: "USD to GBP", group: "fx", yahoo: "GBPUSD=X", invert: true, digits: 4 },
  { id: "jpy", symbol: "JPY", name: "USD to JPY", group: "fx", yahoo: "JPY=X", invert: false, digits: 2 },
  { id: "chf", symbol: "CHF", name: "USD to CHF", group: "fx", yahoo: "CHF=X", invert: false, digits: 4 },
  { id: "cad", symbol: "CAD", name: "USD to CAD", group: "fx", yahoo: "CAD=X", invert: false, digits: 4 },
  { id: "aud", symbol: "AUD", name: "USD to AUD", group: "fx", yahoo: "AUDUSD=X", invert: true, digits: 4 },
  { id: "cny", symbol: "CNY", name: "USD to CNY", group: "fx", yahoo: "CNY=X", invert: false, digits: 4 },
  { id: "mxn", symbol: "MXN", name: "USD to MXN", group: "fx", yahoo: "MXN=X", invert: false, digits: 4 },

  { id: "spx", symbol: "SPX", name: "S&P 500", group: "markets", yahoo: "^GSPC", invert: false, digits: 2 },
  { id: "dji", symbol: "DJI", name: "Dow", group: "markets", yahoo: "^DJI", invert: false, digits: 2 },
  { id: "ixic", symbol: "IXIC", name: "Nasdaq", group: "markets", yahoo: "^IXIC", invert: false, digits: 2 },
  { id: "oil", symbol: "WTI", name: "Crude oil", group: "markets", yahoo: "CL=F", invert: false, digits: 2 },
];

export const DEFAULT_ENABLED = ["xau", "xag", "btc", "eth", "xrp", "eur", "gbp", "jpy"];

export type Quote = {
  id: string;
  symbol: string;
  name: string;
  group: Group;
  price: number;
  changePct: number;
  digits: number;
};

export function formatPrice(value: number, digits: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatChange(pct: number) {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
