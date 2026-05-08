window.TrigCommon = (() => {
  function normalizeDeg(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function toRad(deg) {
    return deg * Math.PI / 180;
  }

  function round3(n) {
    return Math.round(n * 1000) / 1000;
  }

  function formatNum(n) {
    if (!Number.isFinite(n)) return '정의되지 않음';
    const v = round3(n);
    return Number.isInteger(v) ? String(v) : v.toString();
  }

  function sliderAngleFromDeg(deg) {
    let a = ((deg + 180) % 360 + 360) % 360 - 180;
    if (a === -180 && normalizeDeg(deg) === 180) a = 180;
    return a;
  }

  function nearestCoterminal(baseDeg, currentDeg) {
    const k = Math.round((currentDeg - baseDeg) / 360);
    return baseDeg + 360 * k;
  }

  function canvasAngleToDegree(x, y, cx, cy) {
    const dx = x - cx;
    const dy = cy - y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  function getCanvasCoords(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  function drawArrowHead(ctx, x1, y1, x2, y2, size = 10) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function drawArc(ctx, cx, cy, radius, start, end, anticlockwise, color, lineWidth = 4) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end, anticlockwise);
    ctx.stroke();
    ctx.restore();
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }

  function formatMultipleOfPi(num, den) {
    if (num === 0) return '0';
    const sign = num < 0 ? '-' : '';
    const n = Math.abs(num);
    if (den === 1) return `${sign}${n === 1 ? '' : n}π`;
    return `${sign}${n === 1 ? '' : n}π/${den}`;
  }

  function degreeToRadianExactString(deg) {
    const scaled = Math.round(deg * 1000);
    const denBase = 180000;
    const g = gcd(scaled, denBase);
    const num = scaled / g;
    const den = denBase / g;
    if (den <= 48) return formatMultipleOfPi(num, den);
    const ratio = deg / 180;
    return `${ratio.toFixed(4)}π`;
  }

  function degreeToRadianDecimal(deg) {
    return (deg * Math.PI / 180).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  }

  function parseRadianInput(input) {
    if (!input) return null;
    let s = String(input).trim().replace(/\s+/g, '').replace(/pi/gi, 'π');
    if (s === '') return null;
    if (!s.includes('π')) {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    const match = s.match(/^([+-]?\d*(?:\.\d+)?)?π(?:\/([+-]?\d+(?:\.\d+)?))?$/);
    if (!match) return null;

    let coeffText = match[1];
    let coeff;
    if (coeffText === '' || coeffText === undefined) coeff = 1;
    else if (coeffText === '+') coeff = 1;
    else if (coeffText === '-') coeff = -1;
    else coeff = Number(coeffText);

    const denom = match[2] ? Number(match[2]) : 1;
    if (!Number.isFinite(coeff) || !Number.isFinite(denom) || denom === 0) return null;
    return coeff * Math.PI / denom;
  }

  function radianToDegree(rad) {
    return rad * 180 / Math.PI;
  }

  function formatDegreeValue(deg) {
    return Number(deg.toFixed(4)).toString();
  }

  function radToPiText(rad) {
    const ratio = rad / Math.PI;
    const rounded = Math.round(ratio * 12) / 12;
    const eps = 1e-9;
    if (Math.abs(rounded) < eps) return '0';

    const sign = rounded < 0 ? '-' : '';
    const value = Math.abs(rounded);
    const denoms = [1, 2, 3, 4, 6, 12];

    for (const d of denoms) {
      const n = Math.round(value * d);
      if (Math.abs(value - n / d) < 1e-6) {
        if (d === 1) return sign + (n === 1 ? 'π' : n + 'π');
        return sign + (n === 1 ? 'π' : n + 'π') + '/' + d;
      }
    }
    return formatNum(ratio) + 'π';
  }

  function getSharedVerticalGeometry(h, margin = 50) {
    const top = margin;
    const bottom = margin;
    const plotHeight = h - top - bottom;
    const cy = top + plotHeight / 2;
    const radius = plotHeight / 2;
    return { top, bottom, plotHeight, cy, radius };
  }

  function drawFractionText(ctx, centerX, topY, numerator, denominator, width = 42) {
    ctx.textAlign = 'center';
    ctx.fillText(numerator, centerX, topY);
    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, topY + 6);
    ctx.lineTo(centerX + width / 2, topY + 6);
    ctx.stroke();
    ctx.fillText(denominator, centerX, topY + 26);
  }

  function drawTrigDefOnCanvas(ctx, x, y, name, topText, bottomText, lineWidth = 34) {
    ctx.textAlign = 'left';
    ctx.fillText(name, x, y);
    ctx.fillText('=', x + 62, y);
    drawFractionText(ctx, x + 110, y - 8, topText, bottomText, lineWidth);
  }

  function postHeight(page, selector = '.inner', minHeight = 760) {
    const inner = document.querySelector(selector);
    const height = inner ? Math.max(minHeight, Math.ceil(inner.getBoundingClientRect().height) + 24) : minHeight;
    window.parent.postMessage({ type: 'setHeight', height, page }, '*');
  }

  function setupFrameShell(frameId = 'contentFrame', navSelector = '.nav-btn', minHeight = 760) {
    const navButtons = [...document.querySelectorAll(navSelector)];
    const frame = document.getElementById(frameId);
    let lastFrameHeight = 0;

    function setActive(pageName) {
      navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageName));
    }

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => setActive(btn.dataset.page));
    });

    window.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.type === 'setHeight' && data.height && frame) {
        const nextHeight = Math.max(minHeight, Math.ceil(data.height));
        if (Math.abs(nextHeight - lastFrameHeight) > 1) {
          frame.style.height = nextHeight + 'px';
          lastFrameHeight = nextHeight;
        }
      }
      if (data.page) setActive(data.page);
    });
  }

  return {
    normalizeDeg,
    toRad,
    round3,
    formatNum,
    sliderAngleFromDeg,
    nearestCoterminal,
    canvasAngleToDegree,
    getCanvasCoords,
    resizeCanvas,
    drawArrowHead,
    drawArc,
    gcd,
    formatMultipleOfPi,
    degreeToRadianExactString,
    degreeToRadianDecimal,
    parseRadianInput,
    radianToDegree,
    formatDegreeValue,
    radToPiText,
    getSharedVerticalGeometry,
    drawFractionText,
    drawTrigDefOnCanvas,
    postHeight,
    setupFrameShell
  };
})();
