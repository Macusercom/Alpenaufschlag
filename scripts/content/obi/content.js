const LOCAL_COUNTRY = window.location.hostname.endsWith('.at') ? 'at' : 'de';
const OTHER_COUNTRY = LOCAL_COUNTRY === 'at' ? 'de' : 'at';
const FLAGS = { at: '🇦🇹', de: '🇩🇪' };

function getPriceElement() {
  const newPricing = document.querySelector('[data-component="NewPricing"]');
  return newPricing?.parentElement ?? null;
}

function getLocalPrice() {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      if (data['@type'] === 'Product' && data.offers?.[0]?.price != null)
        return parseFloat(data.offers[0].price).toFixed(2);
    } catch {}
  }
  return null;
}

function getOtherUrl() {
  const hreflang = LOCAL_COUNTRY === 'at' ? 'de-DE' : 'de-AT';
  return document.querySelector(`link[hreflang="${hreflang}"]`)?.href ?? null;
}

function extractPriceFromText(text) {
  const match = /<script[^>]*application\/ld\+json[^>]*>([^<]*"@type"[^<]*"Product"[^<]*)<\/script>/.exec(text);
  if (!match) return null;
  const priceMatch = /"price":([\d]+(?:\.[\d]+)?)/.exec(match[1]);
  return priceMatch ? parseFloat(priceMatch[1]).toFixed(2) : null;
}

function insertWidget(priceElement, widget) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:block;width:100%;text-align:right;';
  widget.style.justifyContent = 'flex-end';
  wrapper.appendChild(widget);
  priceElement.parentNode.insertBefore(wrapper, priceElement.nextSibling);
}

async function fetchOtherPrice(otherUrl) {
  try {
    const response = await new Promise(resolve =>
      chrome.runtime.sendMessage({ url: otherUrl }, resolve)
    );
    return response?.found ? extractPriceFromText(response.text) : null;
  } catch {
    return null;
  }
}

async function refreshPrice() {
  if (!/^\/p\/\d+\//.test(window.location.pathname)) return;

  const priceElement = getPriceElement();
  if (!priceElement) return;

  const localPrice = getLocalPrice();
  if (!localPrice) return;

  document.getElementById('price-checker-widget')?.parentNode?.remove();
  insertWidget(priceElement, renderLoadingWidget(2));

  const otherUrl = getOtherUrl();
  const otherPrice = otherUrl ? await fetchOtherPrice(otherUrl) : null;

  const prices = [
    { label: `${FLAGS[LOCAL_COUNTRY]} ${LOCAL_COUNTRY.toUpperCase()}`, value: localPrice, isLocal: true, url: window.location.href },
    { label: `${FLAGS[OTHER_COUNTRY]} ${OTHER_COUNTRY.toUpperCase()}`, value: otherPrice, isLocal: false, url: otherUrl ?? window.location.href },
  ];

  insertWidget(priceElement, renderWidget(prices));
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    if (!/^\/p\/\d+\//.test(window.location.pathname)) return;
    const el = getPriceElement();
    if (el) insertWidget(el, renderLoadingWidget(2));
    setTimeout(refreshPrice, 1000);
  }
});
