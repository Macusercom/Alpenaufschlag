const LOCAL_COUNTRY = window.location.hostname.endsWith('.at') ? 'at' : 'de';
const OTHER_COUNTRY = LOCAL_COUNTRY === 'at' ? 'de' : 'at';
const FLAGS = { at: '🇦🇹', de: '🇩🇪' };

function getPriceElement() {
  return document.querySelector('[data-dmid="price-localized"]') ?? null;
}

function getDan() {
  const match = document.location.pathname.match(/^\/p\/d\/(\d+)\//);
  return match ? match[1] : null;
}

async function fetchPrice(dan, country) {
  try {
    const response = await new Promise(resolve =>
      chrome.runtime.sendMessage({ dan, country }, resolve)
    );
    return response?.found ? response.price : null;
  } catch {
    return null;
  }
}

async function refreshPrice() {
  const priceElement = getPriceElement();
  if (!priceElement) return;

  const dan = getDan();
  if (!dan) return;

  const localPriceMatch = /\d{1,3}(?:\.\d{3})*(?:,\d+)?/.exec(priceElement.innerText);
  if (!localPriceMatch) return;
  const localPrice = localPriceMatch[0];
  priceElement.parentNode.insertBefore(renderLoadingWidget(2), priceElement.nextSibling);
  const otherPrice = await fetchPrice(dan, OTHER_COUNTRY);

  const prices = [
    { label: `${FLAGS[LOCAL_COUNTRY]} ${LOCAL_COUNTRY.toUpperCase()}`, value: localPrice, isLocal: true, url: window.location.href },
    { label: `${FLAGS[OTHER_COUNTRY]} ${OTHER_COUNTRY.toUpperCase()}`, value: otherPrice, isLocal: false, url: window.location.href.replace(`dm.${LOCAL_COUNTRY}`, `dm.${OTHER_COUNTRY}`) },
  ];

  const widget = renderWidget(prices);
  priceElement.parentNode.insertBefore(widget, priceElement.nextSibling);
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    const el = getPriceElement();
    if (el) el.parentNode.insertBefore(renderLoadingWidget(2), el.nextSibling);
    setTimeout(refreshPrice, 1000);
  }
});
