const {
  DEFAULT_SLIDE_MODE,
  PT_TO_PX,
  getSlideModeChoices,
  getSlideModeConfig,
  normalizeSlideMode,
} = require('./slide-mode.cjs');

const MAX_SCREENSHOT_EDGE = 1600;

const PAGE_SIZE_PRESETS = Object.freeze({
  a4: Object.freeze({ name: 'a4', widthPt: 595.28, heightPt: 841.89, label: 'A4 portrait' }),
  'a4-portrait': Object.freeze({ name: 'a4-portrait', widthPt: 595.28, heightPt: 841.89, label: 'A4 portrait' }),
  'a4-landscape': Object.freeze({ name: 'a4-landscape', widthPt: 841.89, heightPt: 595.28, label: 'A4 landscape' }),
  letter: Object.freeze({ name: 'letter', widthPt: 612, heightPt: 792, label: 'Letter portrait' }),
  'letter-portrait': Object.freeze({ name: 'letter-portrait', widthPt: 612, heightPt: 792, label: 'Letter portrait' }),
  'letter-landscape': Object.freeze({ name: 'letter-landscape', widthPt: 792, heightPt: 612, label: 'Letter landscape' }),
});

function formatNumber(value, maxFractionDigits = 3) {
  return Number(value.toFixed(maxFractionDigits)).toString();
}

function roundPx(value) {
  return Math.max(1, Math.round(value));
}

function buildScreenshotPx(framePx) {
  const maxEdge = Math.max(framePx.width, framePx.height);
  const scale = MAX_SCREENSHOT_EDGE / maxEdge;
  return {
    width: roundPx(framePx.width * scale),
    height: roundPx(framePx.height * scale),
  };
}

function buildConfigFromFramePt({ name, framePt, label, source, slideMode }) {
  const framePx = {
    width: roundPx(framePt.width * PT_TO_PX),
    height: roundPx(framePt.height * PT_TO_PX),
  };
  const sizeLabel = `${formatNumber(framePt.width)}pt x ${formatNumber(framePt.height)}pt`;
  return {
    name,
    source,
    slideMode,
    framePt: {
      width: framePt.width,
      height: framePt.height,
    },
    framePx,
    screenshotPx: buildScreenshotPx(framePx),
    sizeLabel,
    pageSizeLabel: label || sizeLabel,
    coordinateSpaceLabel: `${framePx.width}x${framePx.height}`,
    aspectRatioLabel: `${formatNumber(framePx.width / framePx.height, 3)}:1`,
    isCustomPageSize: source !== 'mode',
  };
}

function configFromSlideMode(mode) {
  const normalizedMode = normalizeSlideMode(mode);
  const cfg = getSlideModeConfig(normalizedMode);
  return {
    ...cfg,
    pageSizeLabel: cfg.sizeLabel,
    source: 'mode',
    slideMode: normalizedMode,
    isCustomPageSize: false,
  };
}

function configFromPreset(presetName, slideMode) {
  const preset = PAGE_SIZE_PRESETS[presetName];
  if (!preset) return null;
  return buildConfigFromFramePt({
    name: preset.name,
    framePt: { width: preset.widthPt, height: preset.heightPt },
    label: preset.label,
    source: 'preset',
    slideMode,
  });
}

function parsePageDimension(value, optionName) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${optionName} must be a page length such as 960, 720pt, 10in, or 794px.`);
  }

  const raw = String(value).trim().toLowerCase();
  const match = /^(\d+(?:\.\d+)?)(px|pt|in)?$/.exec(raw);
  if (!match) {
    throw new Error(`${optionName} must be a page length such as 960, 720pt, 10in, or 794px.`);
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${optionName} must be greater than 0.`);
  }

  const unit = match[2] || 'px';
  if (unit === 'pt') {
    return {
      px: roundPx(amount * PT_TO_PX),
      label: `${formatNumber(amount)}pt`,
      pt: amount,
    };
  }
  if (unit === 'in') {
    return {
      px: roundPx(amount * 96),
      label: `${formatNumber(amount)}in`,
      pt: amount * 72,
    };
  }
  return {
    px: roundPx(amount),
    label: `${formatNumber(amount)}px`,
    pt: amount / PT_TO_PX,
  };
}

function configFromCustomDimensions({ width, height, slideMode }) {
  const parsedWidth = parsePageDimension(width, '--width');
  const parsedHeight = parsePageDimension(height, '--height');
  const framePx = {
    width: parsedWidth.px,
    height: parsedHeight.px,
  };
  return {
    name: 'custom',
    source: 'custom',
    slideMode,
    framePt: {
      width: parsedWidth.pt,
      height: parsedHeight.pt,
    },
    framePx,
    screenshotPx: buildScreenshotPx(framePx),
    sizeLabel: `${parsedWidth.label} x ${parsedHeight.label}`,
    pageSizeLabel: 'custom',
    coordinateSpaceLabel: `${framePx.width}x${framePx.height}`,
    aspectRatioLabel: `${formatNumber(framePx.width / framePx.height, 3)}:1`,
    isCustomPageSize: true,
  };
}

function getPageSizeChoices() {
  return [
    ...getSlideModeChoices(),
    ...Object.keys(PAGE_SIZE_PRESETS),
  ];
}

function resolvePageSizeConfig({ mode = DEFAULT_SLIDE_MODE, pageSize = '', width = '', height = '' } = {}) {
  const slideMode = normalizeSlideMode(mode);
  const hasWidth = typeof width === 'string' ? width.trim() !== '' : width !== undefined && width !== null;
  const hasHeight = typeof height === 'string' ? height.trim() !== '' : height !== undefined && height !== null;

  if (hasWidth || hasHeight) {
    if (!hasWidth || !hasHeight) {
      throw new Error('Use both --width and --height when setting a custom editor page size.');
    }
    return configFromCustomDimensions({ width, height, slideMode });
  }

  const normalizedPageSize = typeof pageSize === 'string' ? pageSize.trim().toLowerCase() : '';
  if (!normalizedPageSize) {
    return configFromSlideMode(slideMode);
  }

  if (getSlideModeChoices().includes(normalizedPageSize)) {
    return configFromSlideMode(normalizedPageSize);
  }

  const preset = configFromPreset(normalizedPageSize, slideMode);
  if (preset) return preset;

  throw new Error(`Unknown --page-size value: ${pageSize}. Expected one of: ${getPageSizeChoices().join(', ')}`);
}

module.exports = {
  PAGE_SIZE_PRESETS,
  getPageSizeChoices,
  parsePageDimension,
  resolvePageSizeConfig,
};
