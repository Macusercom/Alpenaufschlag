const REGIONS = {
  at: { label: '🇦🇹 AT', path: '/at/de/' },
  de: { label: '🇩🇪 DE', path: '/de/de/' },
  sk: { label: '🇸🇰 SK', path: '/sk/sk/' },
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

async function refreshPrice() {
  if (!LOCAL_REGION_KEY) return;

  const priceElement = getPriceElement();
  if (!priceElement) return;

  const localRegion = REGIONS[LOCAL_REGION_KEY];
  const otherRegions = Object.entries(REGIONS).filter(([k]) => k !== LOCAL_REGION_KEY);
  const href = window.location.href;

  const localPrice = getLocalPrice();
  const otherPrices = await Promise.all(
    otherRegions.map(([, r]) => fetchPrice(href.replace(localRegion.path, r.path)))
  );

  if (!localPrice) return;

  const prices = [
    { label: localRegion.label, value: localPrice, isLocal: true, url: href },
    ...otherRegions.map(([, r], i) => ({ label: r.label, value: otherPrices[i], isLocal: false, url: href.replace(localRegion.path, r.path) })),
  ];

  const widget = renderWidget(prices);
  priceElement.parentNode.insertBefore(widget, priceElement.nextSibling);
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    setTimeout(refreshPrice, 1000);
  }
});
