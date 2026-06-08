import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  parsePageDimension,
  resolvePageSizeConfig,
} = require('../../src/page-size.cjs');

test('resolvePageSizeConfig defaults to presentation sizing', () => {
  const cfg = resolvePageSizeConfig();

  assert.equal(cfg.source, 'mode');
  assert.equal(cfg.slideMode, 'presentation');
  assert.equal(cfg.sizeLabel, '720pt x 405pt');
  assert.deepEqual(cfg.framePx, { width: 960, height: 540 });
  assert.deepEqual(cfg.screenshotPx, { width: 1600, height: 900 });
});

test('resolvePageSizeConfig supports A4 portrait preset', () => {
  const cfg = resolvePageSizeConfig({ pageSize: 'a4' });

  assert.equal(cfg.source, 'preset');
  assert.equal(cfg.name, 'a4');
  assert.equal(cfg.pageSizeLabel, 'A4 portrait');
  assert.equal(cfg.sizeLabel, '595.28pt x 841.89pt');
  assert.deepEqual(cfg.framePx, { width: 794, height: 1123 });
  assert.deepEqual(cfg.screenshotPx, { width: 1131, height: 1600 });
  assert.equal(cfg.coordinateSpaceLabel, '794x1123');
  assert.equal(cfg.isCustomPageSize, true);
});

test('resolvePageSizeConfig supports custom dimensions with explicit units', () => {
  const cfg = resolvePageSizeConfig({ width: '10in', height: '5.625in' });

  assert.equal(cfg.source, 'custom');
  assert.equal(cfg.sizeLabel, '10in x 5.625in');
  assert.deepEqual(cfg.framePx, { width: 960, height: 540 });
});

test('parsePageDimension treats bare custom lengths as pixels', () => {
  assert.deepEqual(parsePageDimension('960', '--width'), {
    px: 960,
    label: '960px',
    pt: 720,
  });
});

test('resolvePageSizeConfig requires width and height together', () => {
  assert.throws(
    () => resolvePageSizeConfig({ width: '960px' }),
    /both --width and --height/i,
  );
});
