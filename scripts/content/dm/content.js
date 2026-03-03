const LOCAL_COUNTRY = window.location.hostname.endsWith('.at') ? 'at' : 'de';
const OTHER_COUNTRY = LOCAL_COUNTRY === 'at' ? 'de' : 'at';
const FLAGS = { at: '🇦🇹', de: '🇩🇪' };

function getPriceElement() {
  return document.querySelector('[data-dmid="price-localized"]') ?? null;
}

function getGtin() {
  const match = document.location.href.match(/-p(\d+)\.html/);
  return match ? match[1] : null;
}

async function fetchPrice(gtin, country) {
  try {
    const response = await new Promise(resolve =>
      chrome.runtime.sendMessage({ gtin, country }, resolve)
    );
    return response?.found ? response.price : null;
  } catch {
    return null;
  }
}

async function refreshPrice() {
  const priceElement = getPriceElement();
  if (!priceElement) return;

  const gtin = getGtin();
  if (!gtin) return;

  const localPriceMatch = /\d{1,3}(?:\.\d{3})*(?:,\d+)?/.exec(priceElement.innerText);
  if (!localPriceMatch) return;
  const localPrice = localPriceMatch[0];
  const otherPrice = await fetchPrice(gtin, OTHER_COUNTRY);

  const prices = [
    { label: `${FLAGS[LOCAL_COUNTRY]} ${LOCAL_COUNTRY.toUpperCase()}`, value: localPrice, isLocal: true, url: window.location.href },
    { label: `${FLAGS[OTHER_COUNTRY]} ${OTHER_COUNTRY.toUpperCase()}`, value: otherPrice, isLocal: false, url: window.location.href.replace(`dm.${LOCAL_COUNTRY}`, `dm.${OTHER_COUNTRY}`) },
  ];

  const widget = renderWidget(prices);
  priceElement.parentNode.insertBefore(widget, priceElement.nextSibling);
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    setTimeout(refreshPrice, 1000);
  }
});
