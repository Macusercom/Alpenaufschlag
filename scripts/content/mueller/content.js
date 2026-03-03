const LOCAL_COUNTRY = window.location.hostname.endsWith('.at') ? 'at' : 'de';
const OTHER_COUNTRY = LOCAL_COUNTRY === 'at' ? 'de' : 'at';
const FLAGS = { at: '🇦🇹', de: '🇩🇪' };

function getPriceElement() {
  const wrappers = document.querySelectorAll('[class*="__attribute-wrapper__"]');
  if (wrappers.length > 0) return wrappers[wrappers.length - 1];
  return document.querySelector('[data-track-id="priceContainer"]') ?? null;
}

function getLocalPrice() {
  const el = document.querySelector('[data-track-id="priceContainer"]');
  if (el) {
    const match = /([\d]+[,.][\d]+)/.exec(el.textContent);
    if (match) return match[1];
  }
  return null;
}

function extractPriceFromText(text) {
  const match = /data-track-id="priceContainer"[^>]*>([\d]+[,.]\d+)\s*€/.exec(text);
  if (match) return match[1];
  return null;
}

async function fetchOtherPrice() {
  const otherUrl = window.location.href.replace(`mueller.${LOCAL_COUNTRY}`, `mueller.${OTHER_COUNTRY}`);
  try {
    const response = await new Promise(resolve =>
      chrome.runtime.sendMessage({ url: otherUrl }, resolve)
    );
    return { price: response?.found ? extractPriceFromText(response.text) : null, url: otherUrl };
  } catch {
    return { price: null, url: otherUrl };
  }
}

async function refreshPrice() {
  const priceElement = getPriceElement();
  if (!priceElement) return;

  const localPrice = getLocalPrice();
  if (!localPrice) return;

  const { price: otherPrice, url: otherUrl } = await fetchOtherPrice();

  const prices = [
    { label: `${FLAGS[LOCAL_COUNTRY]} ${LOCAL_COUNTRY.toUpperCase()}`, value: localPrice, isLocal: true, url: window.location.href },
    { label: `${FLAGS[OTHER_COUNTRY]} ${OTHER_COUNTRY.toUpperCase()}`, value: otherPrice, isLocal: false, url: otherUrl },
  ];

  const widget = renderWidget(prices);
  widget.style.justifyContent = 'flex-end';
  priceElement.parentNode.insertBefore(widget, priceElement.nextSibling);
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    setTimeout(refreshPrice, 1000);
  }
});
