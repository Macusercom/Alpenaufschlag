chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.gtin && request.country) {
    const url = `https://products.dm.de/product/${request.country}/products/gtins/${request.gtin}`

    fetch(url)
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(json => {
        if (json?.length > 0) {
          const raw = json[0].price;
          const n = parseFloat(String(raw).replace(',', '.'));
          const price = !isNaN(n) ? n.toFixed(2).replace('.', ',') : String(raw);
          sendResponse({ found: true, price });
        } else {
          sendResponse({ found: false });
        }
      })
      .catch(_ => sendResponse({ found: false }));

    return true;
  }

  if (request.xxxlutzCode && request.country) {
    const url = `https://www.xxxlutz.${request.country}/api/graphql`;
    const query = `query product($productCode: String!) {
      getProduct(productCode: $productCode) {
        priceData { currentPrice { value } }
      }
    }`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ operationName: 'product', query, variables: { productCode: request.xxxlutzCode } })
    })
      .then(resp => resp.ok ? resp.json() : Promise.reject(resp.status))
      .then(json => {
        const value = json?.data?.getProduct?.priceData?.currentPrice?.value;
        if (value != null) {
          sendResponse({ found: true, price: parseFloat(value).toFixed(2).replace('.', ',') });
        } else {
          sendResponse({ found: false });
        }
      })
      .catch(_ => sendResponse({ found: false }));
    return true;
  }

  if (request.url) {
    fetch(request.url)
      .then(response => response.ok ? response.text() : Promise.reject())
      .then(text => sendResponse({ found: true, text }))
      .catch(_ => sendResponse({ found: false }));

    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, _) => {
  if (changeInfo.status === "complete") {
    chrome.tabs
      .sendMessage(tabId, { message: 'refreshPrice', })
      .catch(_ => { });
  }
});
