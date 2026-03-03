const LOCAL_COUNTRY = window.location.hostname.endsWith('.at') ? 'at' : 'de';
const OTHER_COUNTRY = LOCAL_COUNTRY === 'at' ? 'de' : 'at';
const FLAGS = { at: '🇦🇹', de: '🇩🇪' };

function getPriceElement() {
  return document.querySelector('[data-purpose="product.price.current"]') ?? null;
}

function getLocalPrice(el) {
  if (!el) return null;
  const match = /(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/.exec(el.textContent);
  return match ? match[1] : null;
}

function getProductCode() {
  const match = /(\d{10,})$/.exec(window.location.pathname);
  return match ? match[1] : null;
}

async function fetchPrice(productCode, country) {
  try {
    const response = await new Promise(resolve =>
      chrome.runtime.sendMessage({ xxxlutzCode: productCode, country }, resolve)
    );
    return response?.found ? response.price : null;
  } catch {
    return null;
  }
}

async function refreshPrice() {
  const priceElement = getPriceElement();
  if (!priceElement) return;

  const localPrice = getLocalPrice(priceElement);
  if (!localPrice) return;

  const productCode = getProductCode();
  if (!productCode) return;

  const otherUrl = window.location.href.replace(
    `xxxlutz.${LOCAL_COUNTRY}`, `xxxlutz.${OTHER_COUNTRY}`
  );
  const otherPrice = await fetchPrice(productCode, OTHER_COUNTRY);

  const prices = [
    { label: `${FLAGS[LOCAL_COUNTRY]} ${LOCAL_COUNTRY.toUpperCase()}`, value: localPrice, isLocal: true, url: window.location.href },
    { label: `${FLAGS[OTHER_COUNTRY]} ${OTHER_COUNTRY.toUpperCase()}`, value: otherPrice, isLocal: false, url: otherUrl },
  ];

  const widget = renderWidget(prices);
  priceElement.parentNode.insertBefore(widget, priceElement.nextSibling);
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'refreshPrice') {
    setTimeout(refreshPrice, 1000);
  }
});
