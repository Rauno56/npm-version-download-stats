import tap from 'tap';

import {
	reverseObject,
} from '../src/utils.js';
import {
	filter,
	minFilterGen,
} from '../src/index.js';

tap.test('reverseObject', (tap) => {
	tap.same(
		reverseObject({ a: 'b', c: 'd' }),
		{ b: ['a'], d: ['c'] }
	);
	tap.same(
		reverseObject({ a: 'b', c: 'd' , e: 'b' }),
		{ b: ['a', 'e'], d: ['c'] }
	);
	tap.end();
});

tap.test('semver check', (tap) => {
	tap.same(
		filter([{ version: '1.2.3' }, { version: '2.2.4' }]),
		[{ version: '1.2.3' }, { version: '2.2.4' }],
	);
	tap.same(
		filter([{ version: '1.2.3' }, { version: '2.2.4' }], { semverRange: '1' }),
		[{ version: '1.2.3' }],
	);
	tap.same(
		filter([{ version: '1.2.3' }, { version: '2.2.4' }], { semverRange: '1.2.3 || 2.2.4' }),
		[{ version: '1.2.3' }, { version: '2.2.4' }],
	);
	tap.end();
});

tap.test('sort', (tap) => {
	tap.same(
		filter([{ downloads: 10 }, { downloads: 100 }]),
		[{ downloads: 100 }, { downloads: 10 }],
	);
	tap.same(
		filter([{ downloads: 10 }, { downloads: 100 }], { sort: 'downloads' }),
		[{ downloads: 100 }, { downloads: 10 }],
	);
	tap.same(
		filter([{ version: '1.2.3', downloads: 100 }, { version: '2.2.4', downloads: 10 }], { sort: 'version' }),
		[{ version: '2.2.4', downloads: 10 }, { version: '1.2.3', downloads: 100 }],
	);
	tap.same(
		filter([{ downloads: 10 }, { downloads: 100 }], { sort: false }),
		[{ downloads: 10 }, { downloads: 100 }],
	);
	tap.end();
});

tap.test('showDeprecated', (tap) => {
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10, isDeprecated: true }, { downloads: 1, isDeprecated: false }]),
		[{ downloads: 100 }, { downloads: 1, isDeprecated: false }],
	);
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10, isDeprecated: true }, { downloads: 1, isDeprecated: false }], { showDeprecated: true }),
		[{ downloads: 100 }, { downloads: 10, isDeprecated: true }, { downloads: 1, isDeprecated: false }],
	);
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10, isDeprecated: true }, { downloads: 1, isDeprecated: false }], { showDeprecated: false }),
		[{ downloads: 100 }, { downloads: 1, isDeprecated: false }],
	);
	tap.end();
});

tap.test('minFilterGen', (tap) => {
	tap.equal(minFilterGen(), null);
	tap.equal(minFilterGen(10)({ downloads: 11 }), true);
	tap.equal(minFilterGen(10)({ downloads: 10 }), true);
	tap.equal(minFilterGen(10)({ downloads:  9 }), false);
	tap.equal(minFilterGen('10')({ downloads: 11 }), true);
	tap.equal(minFilterGen('10')({ downloads: 10 }), true);
	tap.equal(minFilterGen('10')({ downloads:  9 }), false);
	tap.equal(minFilterGen('10%', 100)({ downloads: 11 }), true);
	tap.equal(minFilterGen('10%', 100)({ downloads: 10 }), true);
	tap.equal(minFilterGen('10%', 100)({ downloads:  9 }), false);

	tap.equal(minFilterGen('10.1%', 999)({ downloads: 102 }), true);
	tap.equal(minFilterGen('10.1%', 999)({ downloads: 101 }), true);
	tap.equal(minFilterGen('10.1%', 999)({ downloads: 100 }), false);

	tap.throws(() => minFilterGen('110%', 100), /bound/);
	tap.throws(() => minFilterGen('-10', 100), /negative/);
	tap.throws(() => minFilterGen('-10%', 100), /negative/);
	tap.end();
});

tap.test('min nr', (tap) => {
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10 }], { min: 12 }),
		[{ downloads: 100 }],
	);
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10 }], { min: '12' }),
		[{ downloads: 100 }],
	);
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10 }], { min: '10%' }),
		[{ downloads: 100 }],
	);
	tap.end();
});

tap.test('limit', (tap) => {
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10 }], { limit: 3 }),
		[{ downloads: 100 }, { downloads: 10 }],
	);
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10 }], { limit: 1 }),
		[{ downloads: 100 }],
	);
	tap.same(
		filter([{ downloads: 100 }, { downloads: 10 }], { limit: 0 }),
		[],
	);
	tap.end();
});

tap.test('limitTotal', (tap) => {
	tap.same(
		filter([{ downloads: 90 }, { downloads: 10 }], { limitTotal: '100%' }),
		[{ downloads: 90 }, { downloads: 10 }],
	);
	tap.same(
		filter([{ downloads: 90 }, { downloads: 10 }], { limitTotal: '89%' }),
		[{ downloads: 90 }],
	);
	tap.end();
});