import test from 'node:test';
import assert from 'node:assert/strict';
import { pinchIntent, PINCH } from '../src/features/grove/gestures.js';

// a pinch sample: finger distance, angle between the fingers (degrees here), midpoint y
const S = (d, deg, midY = 0) => ({ d, ang: deg * Math.PI / 180, midY });

test('pinch: pure spread is zoom', () => assert.equal(pinchIntent(S(100, 0), S(130, 4), { dt: 60 }), 'zoom'));
test('pinch: twist is rotate', () => assert.equal(pinchIntent(S(100, 0), S(102, 30), { dt: 60 }), 'rotate'));
test('pinch: parallel vertical drag is tilt', () => assert.equal(pinchIntent(S(100, 0, 0), S(103, 3, 30), { dt: 60 }), 'tilt'));
test('pinch: small ambiguous movement stays undecided', () => assert.equal(pinchIntent(S(100, 0), S(103, 5), { dt: 60 }), null));
test('pinch: ambiguous pinch settles to zoom after 180 ms', () => assert.equal(pinchIntent(S(100, 0), S(103, 5), { dt: PINCH.settleMs }), 'zoom'));
test('pinch: angle wrap 350° → 10° is a 20° twist', () => assert.equal(pinchIntent(S(100, 350), S(101, 10), { dt: 60 }), 'rotate'));
test('pinch: rotation with scale change is zoom, not rotate', () => assert.equal(pinchIntent(S(100, 0), S(120, 30), { dt: 60 }), 'zoom'));
test('pinch: vertical drift with a twist is not tilt', () => assert.equal(pinchIntent(S(100, 0, 0), S(102, 10, 30), { dt: 60 }), null));
