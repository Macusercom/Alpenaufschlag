const REGIONS = {
  at: { label: '🇦🇹 AT', path: '/at/de/', currency: 'EUR' },
  de: { label: '🇩🇪 DE', path: '/de/de/', currency: 'EUR' },
  sk: { label: '🇸🇰 SK', path: '/sk/sk/', currency: 'EUR' },
  cz: { label: '🇨🇿 CZ', path: '/cz/cs/', currency: 'CZK' },
  hu: { label: '🇭🇺 HU', path: '/hu/hu/', currency: 'HUF' },
};

const LOCAL_REGION_KEY = Object.keys(REGIONS).find(k => window.location.href.includes(REGIONS[k].path)) ?? null;

function getPriceElement() {
  return document.querySelector('.pipcom-price-module__price') ?? null;
}

function getLocalPrice() {
  const ldScript = document.querySelector('#pip-range-json-ld');
  if (ldScript) {
    try {
      const price = JSON.parse(ldScript.textContent)?.offers?.price;
      if (price != null) return String(price);
    } catch {}
  }
  return null;
}

function extractPriceFromText(text) {
  const ldMatch = /id="pip-range-json-ld"[^>]*>([\s\S]*?)<\/script>/.exec(text);
  if (ldMatch) {
    try {
      const price = JSON.parse(ldMatch[1])?.offers?.price;
      if (price != null) return String(price);
    } catch {}
  }
  return null;
}

async function fetchPrice(url) {
  try {
    const response = await new Promise(resolve =>
      chrome.runtime.sendMessage({ url }, resolve)
    );
    return response?.found ? extractPriceFromText(response.text) : null;
  } catch {
    return null;
  }
}

async function getExchangeRates() {
  try {
    return await new Promise(resolve =>
      chrome.runtime.sendMessage({ exchangeRates: true }, r => resolve(r ?? null))
    );
  } catch { return null; }
}

async function refreshPrice() {
  if (!LOCAL_REGION_KEY) return;

  const priceElement = getPriceElement();
  if (!priceElement) return;

  const localRegion = REGIONS[LOCAL_REGION_KEY];
  const otherRegions = Object.entries(REGIONS).filter(([k]) => k !== LOCAL_REGION_KEY);
  const href = window.location.href;

  const localPrice = getLocalPrice();
  if (!localPrice) return;

  priceElement.parentNode.insertBefore(renderLoadingWidget(5), priceElement.nextSibling);

  const otherPrices = await Promise.all(
    otherRegions.map(([, r]) => fetchPrice(href.replace(localRegion.path, r.path)))
  );

  const needsRates = [localRegion, ...otherRegions.map(([, r]) => r)].some(r => r.currency !== 'EUR');
  const rates = needsRates ? await getExchangeRates() : null;

  function toEur(priceStr, currency) {
    if (!priceStr) return { value: null, approx: false };
    if (currency === 'EUR') return { value: priceStr, approx: false };
    const rate = rates?.rates?.[currency];
    if (!rate) return { value: null, approx: false };
    const eur = parseFloat(String(priceStr).replace(',', '.')) / rate;
    return { value: eur.toFixed(2), approx: true };
  }

  const localConverted = toEur(localPrice, localRegion.currency);
  if (!localConverted.value) return;

  const prices = [
    { label: localRegion.label, value: localConverted.value, approx: localConverted.approx, isLocal: true, url: href },
    ...otherRegions.map(([, r], i) => {
      const { value, approx } = toEur(otherPrices[i], r.currency);
      return { label: r.label, value, approx, isLocal: false, url: href.replace(localRegion.path, r.path) };
    }),
  ];

  const widget = renderWidget(prices);
  priceElement.parentNode.insertBefore(widget, priceElement.nextSibling);
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    const el = getPriceElement();
    if (el) el.parentNode.insertBefore(renderLoadingWidget(5), el.nextSibling);
    setTimeout(refreshPrice, 1000);
  }
});
