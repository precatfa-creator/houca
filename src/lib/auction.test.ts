import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPrice, parseAuctionState } from './auction.ts';

const valid = { horseName: 'ريح', currentPrice: 5000, timestamp: 1, isSold: false };

test('parseAuctionState accepts a valid state', () => {
  assert.deepEqual(parseAuctionState(JSON.stringify(valid)), valid);
  const noBid = { ...valid, currentPrice: null };
  assert.deepEqual(parseAuctionState(JSON.stringify(noBid)), noBid);
});

test('parseAuctionState rejects missing, corrupt, and wrongly shaped values', () => {
  assert.equal(parseAuctionState(null), null);
  assert.equal(parseAuctionState('{not json'), null);
  assert.equal(parseAuctionState('null'), null);
  assert.equal(parseAuctionState(JSON.stringify({ ...valid, currentPrice: '5000' })), null);
  assert.equal(parseAuctionState(JSON.stringify({ ...valid, currentPrice: -1 })), null);
  assert.equal(parseAuctionState(JSON.stringify({ ...valid, isSold: undefined })), null);
});

test('formatPrice uses fixed grouping regardless of device locale', () => {
  assert.equal(formatPrice(12500.5), '12,500.5');
  assert.equal(formatPrice(1000000), '1,000,000');
});
