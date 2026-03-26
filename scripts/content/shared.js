function parsePrice(str) {
  if (!str) return null;
  const s = String(str);
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

function formatPrice(value) {
  if (!value) return value;
  // Normalize dot-decimal (e.g. IKEA "1249.00") to comma format
  let formatted = String(value).replace(/^(\d+)\.(\d+)$/, '$1,$2');
  // If integer without decimals (e.g. "25"), add ",00"
  if (/^\d+$/.test(formatted)) formatted += ',00';
  return formatted;
}

function renderLoadingWidget(count) {
  document.getElementById('price-checker-widget')?.remove();

  if (!document.getElementById('price-checker-shimmer-style')) {
    const style = document.createElement('style');
    style.id = 'price-checker-shimmer-style';
    style.textContent = '@keyframes pcs{0%,100%{opacity:.4}50%{opacity:.9}}';
    document.head.appendChild(style);
  }

  const widget = document.createElement('div');
  widget.id = 'price-checker-widget';
  widget.style.cssText = [
    'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;margin-bottom:12px;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'font-size:13px;',
  ].join('');

  for (let i = 0; i < count; i++) {
    const chip = document.createElement('div');
    chip.style.cssText = [
      'display:inline-flex;align-items:center;padding:3px 8px;border-radius:12px;',
      'border:1px solid #d1d5db;background:#f3f4f6;',
      'width:70px;height:22px;',
      'animation:pcs 1.5s ease-in-out infinite;',
      `animation-delay:${i * 0.15}s;`,
    ].join('');
    widget.appendChild(chip);
  }

  return widget;
}

function renderWidget(prices) {
  document.getElementById('price-checker-widget')?.remove();

  const numericValues = prices.map(p => parsePrice(p.value)).filter(v => v !== null);
  const minPrice = numericValues.length > 0 ? Math.min(...numericValues) : null;

  const widget = document.createElement('div');
  widget.id = 'price-checker-widget';
  widget.style.cssText = [
    'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;margin-bottom:12px;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'font-size:13px;',
  ].join('');

  for (const { label, value, approx, isLocal, url } of prices) {
    const numVal = parsePrice(value);
    const isCheapest = minPrice !== null && numVal === minPrice;

    const chip = document.createElement('a');
    chip.href = url;
    chip.target = '_blank';
    chip.rel = 'noopener noreferrer';
    chip.style.cssText = [
      'display:inline-flex;align-items:center;padding:3px 8px;border-radius:12px;',
      'cursor:pointer;text-decoration:none;',
      `border:1px solid ${isCheapest ? '#22c55e' : '#d1d5db'};`,
      `background:${isCheapest ? '#f0fdf4' : isLocal ? '#eff6ff' : '#f9fafb'};`,
      `color:${isCheapest ? '#15803d' : '#374151'};`,
      `font-weight:${isLocal ? '600' : '400'};`,
    ].join('');
    chip.textContent = `${label} ${numVal !== null ? `${approx ? '~\u202F' : ''}€\u202F${formatPrice(value)}` : '—'}`;
    widget.appendChild(chip);
  }

  return widget;
}
