export const marketCountries = [
  {
    code: "us",
    name: "United States",
    market: "us",
    region: "Americas",
    indices: [["Nasdaq 100", "FRED:NDQ100"]],
    externalIndices: [
      ["S&P 500", "SP-SPX"],
      ["Dow Jones", "DJ-DJI"],
    ],
    stock: "NASDAQ:AAPL",
  },
  {
    code: "ca",
    name: "Canada",
    market: "canada",
    region: "Americas",
    indices: [["S&P/TSX Composite", "TSX:TSX"]],
    stock: "TSX:RY",
  },
  {
    code: "br",
    name: "Brazil",
    market: "brazil",
    region: "Americas",
    indices: [["Bovespa", "BMFBOVESPA:IBOV"]],
    stock: "BMFBOVESPA:PETR4",
  },
  {
    code: "mx",
    name: "Mexico",
    market: "mexico",
    region: "Americas",
    indices: [["S&P/BMV IPC", "BMV:ME"]],
    stock: "BMV:WALMEX",
  },
  {
    code: "ar",
    name: "Argentina",
    market: "argentina",
    region: "Americas",
    indices: [["S&P Merval", "BCBA:IMV"]],
    stock: "BCBA:GGAL",
  },
  {
    code: "cl",
    name: "Chile",
    market: "chile",
    region: "Americas",
    indices: [["S&P IPSA", "BCS:IPSA"]],
    stock: "BCS:SQM_B",
  },
  {
    code: "gb",
    name: "United Kingdom",
    market: "uk",
    region: "Europe",
    indices: [["FTSE 100", "FTSE:UKX"]],
    stock: "LSE:AZN",
  },
  {
    code: "de",
    name: "Germany",
    market: "germany",
    region: "Europe",
    indices: [["DAX", "XETR:DAX"]],
    stock: "XETR:SAP",
  },
  {
    code: "fr",
    name: "France",
    market: "france",
    region: "Europe",
    indices: [["CAC 40", "EURONEXT:PX1"]],
    stock: "EURONEXT:MC",
  },
  {
    code: "it",
    name: "Italy",
    market: "italy",
    region: "Europe",
    indices: [["FTSE MIB", "MIL:FTSEMIB"]],
    stock: "MIL:ENI",
  },
  {
    code: "es",
    name: "Spain",
    market: "spain",
    region: "Europe",
    indices: [["IBEX 35", "BME:IBC"]],
    stock: "BME:SAN",
  },
  {
    code: "nl",
    name: "Netherlands",
    market: "netherlands",
    region: "Europe",
    indices: [["AEX", "EURONEXT:AEX"]],
    stock: "EURONEXT:ASML",
  },
  {
    code: "ch",
    name: "Switzerland",
    market: "switzerland",
    region: "Europe",
    indices: [["Swiss Market Index", "SIX:SMI"]],
    stock: "SIX:NESN",
  },
  {
    code: "se",
    name: "Sweden",
    market: "sweden",
    region: "Europe",
    indices: [["OMX Stockholm 30", "OMXSTO:OMXS30"]],
    stock: "OMXSTO:VOLV_B",
  },
  {
    code: "no",
    name: "Norway",
    market: "norway",
    region: "Europe",
    indices: [["Oslo Benchmark", "OSL:OSEBX"]],
    stock: "OSL:EQNR",
  },
  {
    code: "dk",
    name: "Denmark",
    market: "denmark",
    region: "Europe",
    indices: [["OMX Copenhagen 25", "OMXCOP:OMXC25"]],
    stock: "OMXCOP:NOVO_B",
  },
  {
    code: "fi",
    name: "Finland",
    market: "finland",
    region: "Europe",
    indices: [["OMX Helsinki 25", "OMXHEX:OMXH25"]],
    stock: "OMXHEX:NOKIA",
  },
  {
    code: "pl",
    name: "Poland",
    market: "poland",
    region: "Europe",
    indices: [["WIG 20", "GPW:WIG20"]],
    stock: "GPW:PKN",
  },
  {
    code: "pt",
    name: "Portugal",
    market: "portugal",
    region: "Europe",
    indices: [["PSI", "EURONEXT:PSI20"]],
    stock: "EURONEXT:EDP",
  },
  {
    code: "tr",
    name: "Türkiye",
    market: "turkey",
    region: "Europe",
    indices: [["BIST 100", "BIST:XU100"]],
    stock: "BIST:THYAO",
  },
  {
    code: "in",
    name: "India",
    market: "india",
    region: "Asia Pacific",
    indices: [["Sensex", "BSE:SENSEX"]],
    externalIndices: [["Nifty 50", "NSE-NIFTY"]],
    stock: "BSE:500325",
  },
  {
    code: "jp",
    name: "Japan",
    market: "japan",
    region: "Asia Pacific",
    indices: [
      ["Nikkei 225", "TVC:NI225"],
      ["TOPIX", "TSE:TOPIX"],
    ],
    stock: "TSE:7203",
  },
  {
    code: "cn",
    name: "China",
    market: "china",
    region: "Asia Pacific",
    indices: [
      ["Shanghai Composite", "SSE:000001"],
      ["Shenzhen Component", "SZSE:399001"],
    ],
    stock: "SSE:600519",
  },
  {
    code: "hk",
    name: "Hong Kong",
    market: "hongkong",
    region: "Asia Pacific",
    indices: [["Hang Seng", "HSI:HSI"]],
    stock: "HKEX:700",
  },
  {
    code: "au",
    name: "Australia",
    market: "australia",
    region: "Asia Pacific",
    indices: [["S&P/ASX 200", "ASX:XJO"]],
    stock: "ASX:BHP",
  },
  {
    code: "nz",
    name: "New Zealand",
    market: "newzealand",
    region: "Asia Pacific",
    indices: [["S&P/NZX 50", "NZX:NZ50G"]],
    stock: "NZX:FPH",
  },
  {
    code: "sg",
    name: "Singapore",
    market: "singapore",
    region: "Asia Pacific",
    indices: [["Straits Times", "FTSE:STI"]],
    stock: "SGX:D05",
  },
  {
    code: "kr",
    name: "South Korea",
    market: "korea",
    region: "Asia Pacific",
    indices: [["KOSPI", "KRX:KOSPI"]],
    stock: "KRX:005930",
  },
  {
    code: "tw",
    name: "Taiwan",
    market: "taiwan",
    region: "Asia Pacific",
    indices: [["Taiwan Weighted", "TWSE:TAIEX"]],
    stock: "TWSE:2330",
  },
  {
    code: "id",
    name: "Indonesia",
    market: "indonesia",
    region: "Asia Pacific",
    indices: [["Jakarta Composite", "IDX:COMPOSITE"]],
    stock: "IDX:BBCA",
  },
  {
    code: "my",
    name: "Malaysia",
    market: "malaysia",
    region: "Asia Pacific",
    indices: [["FTSE Bursa KLCI", "MYX:FBMKLCI"]],
    stock: "MYX:MAYBANK",
  },
  {
    code: "th",
    name: "Thailand",
    market: "thailand",
    region: "Asia Pacific",
    indices: [["SET Index", "SET:SET"]],
    stock: "SET:PTT",
  },
  {
    code: "ph",
    name: "Philippines",
    market: "philippines",
    region: "Asia Pacific",
    indices: [["PSE Composite", "PSE:PSEI"]],
    stock: "PSE:SM",
  },
  {
    code: "vn",
    name: "Vietnam",
    market: "vietnam",
    region: "Asia Pacific",
    indices: [["VN Index", "HOSE:VNINDEX"]],
    stock: "HNX:SHS",
  },
  {
    code: "pk",
    name: "Pakistan",
    market: "pakistan",
    region: "Asia Pacific",
    indices: [["KSE 100", "PSX:KSE100"]],
    stock: "PSX:OGDC",
  },
  {
    code: "sa",
    name: "Saudi Arabia",
    market: "ksa",
    region: "Middle East & Africa",
    indices: [["Tadawul All Share", "TADAWUL:TASI"]],
    stock: "TADAWUL:2222",
  },
  {
    code: "ae",
    name: "United Arab Emirates",
    market: "uae",
    region: "Middle East & Africa",
    indices: [
      ["DFM General", "DFM:DFMGI"],
      ["FTSE ADX General", "ADX:FADGI"],
    ],
    stock: "DFM:EMAAR",
  },
  {
    code: "qa",
    name: "Qatar",
    market: "qatar",
    region: "Middle East & Africa",
    indices: [["QE Index", "QSE:GNRI"]],
    stock: "QSE:QNBK",
  },
  {
    code: "kw",
    name: "Kuwait",
    market: "kuwait",
    region: "Middle East & Africa",
    indices: [["Boursa Kuwait All Share", "KSE:KWSE"]],
    stock: "KSE:NBK",
  },
  {
    code: "eg",
    name: "Egypt",
    market: "egypt",
    region: "Middle East & Africa",
    indices: [["EGX 30", "EGX:EGX30"]],
    stock: "EGX:COMI",
  },
  {
    code: "za",
    name: "South Africa",
    market: "rsa",
    region: "Middle East & Africa",
    indices: [["FTSE/JSE Top 40", "JSE:J200"]],
    stock: "JSE:NPN",
  },
] as const;
export type MarketCountry = (typeof marketCountries)[number];
// Avoid the provider's silent US fallback for markets excluded from embeds.
const embeddedCountries = new Set([
  "us",
  "ca",
  "br",
  "ar",
  "cl",
  "de",
  "it",
  "es",
  "ch",
  "dk",
  "fi",
  "pl",
  "tr",
  "in",
  "cn",
  "au",
  "id",
  "vn",
  "ae",
  "kw",
  "eg",
]);
export function hasEmbeddedMarket(country: MarketCountry) {
  return embeddedCountries.has(country.code);
}
export function marketExternalUrl(country: MarketCountry) {
  const routes: Record<string, string> = {
    us: "usa",
    gb: "united-kingdom",
    za: "south-africa",
    kr: "south-korea",
    hk: "hong-kong",
    nz: "new-zealand",
  };
  return `https://www.tradingview.com/markets/stocks-${routes[country.code] ?? country.market}/`;
}
export const marketPeriods = [
  { label: "1 day", range: "1D" },
  { label: "1 week", range: "5D" },
  { label: "1 month", range: "1M" },
  { label: "1 year", range: "12M" },
  { label: "5 years", range: "60M" },
] as const;
export function countryByCode(code: string): MarketCountry {
  return (
    marketCountries.find((country) => country.code === code) ??
    marketCountries[0]
  );
}
// These exchanges are excluded from public widgets. Unqualified searches open
// on the provider, where its search can resolve the company without guessing.
export function needsExternalChart(symbol: string) {
  return (
    !symbol.includes(":") || /^(NSE|LSE|DFM|SZSE|HOSE|TADAWUL):/.test(symbol)
  );
}
export function stockChartUrl(symbol: string) {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}
export function widgetConfig(
  kind: "indices" | "stocks" | "chart",
  country: MarketCountry,
  range = "12M",
  view = "overview",
) {
  if (kind === "stocks")
    return {
      width: "100%",
      height: "100%",
      defaultColumn: view === "performance" ? "performance" : "overview",
      defaultScreen: "most_capitalized",
      showToolbar: true,
      locale: "en",
      market: country.market,
      colorTheme: "light",
    };
  if (kind === "indices")
    return {
      symbols: country.indices.map(([name, symbol]) => [name, symbol + "|1D"]),
      chartOnly: false,
      width: "100%",
      height: "100%",
      locale: "en",
      colorTheme: "light",
      autosize: true,
      showVolume: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      scalePosition: "right",
      scaleMode: "Normal",
      changeMode: "price-and-percent",
      chartType: "area",
      dateRanges:
        country.code === "us"
          ? ["12m|1D", "60m|1W", "1m|1D", "1w|1D"]
          : ["1d|1", "1w|15", "1m|1D", "12m|1D", "60m|1W"],
      lineWidth: 2,
    };
  return {
    autosize: true,
    symbol: country.stock,
    interval: "D",
    range: marketPeriods.some((period) => period.range === range)
      ? range
      : "12M",
    timezone: "Etc/UTC",
    theme: "light",
    style: "3",
    locale: "en",
    allow_symbol_change: false,
    hide_side_toolbar: true,
    withdateranges: true,
    save_image: false,
    calendar: false,
  };
}
