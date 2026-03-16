const LOCAL_COUNTRY = window.location.hostname.endsWith('.at') ? 'at' : 'de';
const OTHER_COUNTRY = LOCAL_COUNTRY === 'at' ? 'de' : 'at';
const FLAGS = { at: '🇦🇹', de: '🇩🇪' };

function getPriceElement() {
  return document.querySelector('artikel-preis') ?? null;
}

function getLocalPrice() {
  const content = document.querySelector('meta[property="product:price:amount"]')?.content;
  if (!content) return null;
  const n = parseFloat(content);
  return isNaN(n) ? null : n.toFixed(2);
}

function extractPriceFromText(text) {
  const match = /property="product:price:amount"\s+content="([\d.]+)"/.exec(text);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return isNaN(n) ? null : n.toFixed(2);
}

function insertWidget(priceElement, widget) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:block;width:100%;';
  wrapper.appendChild(widget);
  priceElement.parentNode.insertBefore(wrapper, priceElement.nextSibling);
}

async function fetchOtherPrice() {
  const otherUrl = window.location.href.replace(`thalia.${LOCAL_COUNTRY}`, `thalia.${OTHER_COUNTRY}`);
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
  if (!window.location.pathname.includes('/artikeldetails/')) return;

  const priceElement = getPriceElement();
  if (!priceElement) return;

  const localPrice = getLocalPrice();
  if (!localPrice) return;

  document.getElementById('price-checker-widget')?.parentNode?.remove();
  insertWidget(priceElement, renderLoadingWidget(2));

  const { price: otherPrice, url: otherUrl } = await fetchOtherPrice();

  const prices = [
    { label: `${FLAGS[LOCAL_COUNTRY]} ${LOCAL_COUNTRY.toUpperCase()}`, value: localPrice, isLocal: true, url: window.location.href },
    { label: `${FLAGS[OTHER_COUNTRY]} ${OTHER_COUNTRY.toUpperCase()}`, value: otherPrice, isLocal: false, url: otherUrl },
  ];

  insertWidget(priceElement, renderWidget(prices));
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    if (!window.location.pathname.includes('/artikeldetails/')) return;
    const el = getPriceElement();
    if (el) insertWidget(el, renderLoadingWidget(2));
    setTimeout(refreshPrice, 1000);
  }
});
