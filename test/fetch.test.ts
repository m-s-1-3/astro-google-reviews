import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPlaceReviews, GoogleReviewsError } from '../src/fetch.ts';

/** Shaped like an answer of the Places API (New). The names are placeholders
 *  on purpose: nothing in here may be mistaken for a real review. */
const answer = {
  id: 'ChIJtest',
  displayName: { text: 'Testpraxis' },
  rating: 4.8,
  userRatingCount: 1234,
  googleMapsUri: 'https://maps.google.com/?cid=1',
  reviews: [
    {
      rating: 5,
      text: { text: '  Erster Testtext.  ' },
      relativePublishTimeDescription: 'vor 2 Monaten',
      publishTime: '2026-08-01T10:00:00Z',
      googleMapsUri: 'https://maps.google.com/review/1',
      authorAttribution: { displayName: 'Testperson A', uri: 'https://maps.google.com/contrib/1', photoUri: 'https://lh3.googleusercontent.com/a/1' },
    },
    { rating: 4, originalText: { text: 'Nur im Original.' }, relativePublishTimeDescription: 'vor 1 Jahr', authorAttribution: { displayName: 'Testperson B' } },
    { rating: 5, authorAttribution: { displayName: 'Testperson C' } },
    { rating: 2, text: { text: 'Kritischer Testtext.' }, authorAttribution: { displayName: 'Testperson D' } },
  ],
};

const respond = (body: unknown, status = 200) => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), headers: init?.headers as Record<string, string> });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
};

test('asks for one place, with the key in a header and a field mask', async () => {
  const { fetch, calls } = respond(answer);
  await fetchPlaceReviews({ placeId: 'ChIJ test/1', apiKey: 'secret', language: 'de', fetch });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, 'https://places.googleapis.com/v1/places/ChIJ%20test%2F1?languageCode=de');
  assert.equal(calls[0]!.headers['X-Goog-Api-Key'], 'secret');
  assert.match(calls[0]!.headers['X-Goog-FieldMask']!, /reviews/);
  assert.ok(!calls[0]!.url.includes('secret'), 'the key must not travel in the address');
});

test('maps the place and keeps the average as Google reports it', async () => {
  const { fetch } = respond(answer);
  const place = await fetchPlaceReviews({ placeId: 'ChIJtest', apiKey: 'k', fetch });
  assert.equal(place.name, 'Testpraxis');
  assert.equal(place.rating, 4.8);
  assert.equal(place.total, 1234);
  assert.equal(place.url, 'https://maps.google.com/?cid=1');
  assert.equal(place.writeUrl, 'https://search.google.com/local/writereview?placeid=ChIJtest');
});

test('maps a review, trims its text and falls back to the original text', async () => {
  const { fetch } = respond(answer);
  const { reviews } = await fetchPlaceReviews({ placeId: 'ChIJtest', apiKey: 'k', fetch });
  assert.deepEqual(reviews[0], {
    author: 'Testperson A',
    authorUrl: 'https://maps.google.com/contrib/1',
    authorPhoto: 'https://lh3.googleusercontent.com/a/1',
    rating: 5,
    text: 'Erster Testtext.',
    relativeTime: 'vor 2 Monaten',
    publishedAt: '2026-08-01T10:00:00Z',
    url: 'https://maps.google.com/review/1',
  });
  assert.equal(reviews[1]!.text, 'Nur im Original.');
});

test('drops reviews without a word unless told otherwise', async () => {
  const withText = await fetchPlaceReviews({ placeId: 'p', apiKey: 'k', fetch: respond(answer).fetch });
  assert.deepEqual(withText.reviews.map((r) => r.author), ['Testperson A', 'Testperson B', 'Testperson D']);
  const all = await fetchPlaceReviews({ placeId: 'p', apiKey: 'k', textOnly: false, fetch: respond(answer).fetch });
  assert.equal(all.reviews.length, 4);
});

test('minRating and max narrow the list, not the average', async () => {
  const place = await fetchPlaceReviews({ placeId: 'p', apiKey: 'k', minRating: 4, max: 1, fetch: respond(answer).fetch });
  assert.deepEqual(place.reviews.map((r) => r.author), ['Testperson A']);
  assert.equal(place.rating, 4.8);
  assert.equal(place.total, 1234);
});

test('a place without reviews is a place, not an error', async () => {
  const place = await fetchPlaceReviews({ placeId: 'ChIJnone', apiKey: 'k', fetch: respond({ displayName: { text: 'Neu' } }).fetch });
  assert.deepEqual(place.reviews, []);
  assert.equal(place.rating, 0);
  assert.equal(place.total, 0);
  assert.match(place.url, /place_id:ChIJnone/);
});

test('another endpoint is used as given', async () => {
  const { fetch, calls } = respond(answer);
  await fetchPlaceReviews({ placeId: 'p', apiKey: 'k', endpoint: 'http://127.0.0.1:9/v1/', fetch });
  assert.equal(calls[0]!.url, 'http://127.0.0.1:9/v1/places/p?languageCode=de');
});

test("a refusal carries Google's own explanation and the status", async () => {
  const { fetch } = respond({ error: { message: 'API key not valid.' } }, 400);
  await assert.rejects(
    fetchPlaceReviews({ placeId: 'p', apiKey: 'bad', fetch }),
    (error: unknown) => error instanceof GoogleReviewsError && error.status === 400 && /API key not valid/.test(error.message),
  );
});

test('an unreachable API and missing settings are reported, not swallowed', async () => {
  const down = (async () => { throw new Error('getaddrinfo ENOTFOUND'); }) as typeof globalThis.fetch;
  await assert.rejects(fetchPlaceReviews({ placeId: 'p', apiKey: 'k', fetch: down }), /not reachable: getaddrinfo ENOTFOUND/);
  await assert.rejects(fetchPlaceReviews({ placeId: '', apiKey: 'k' }), /placeId is missing/);
  await assert.rejects(fetchPlaceReviews({ placeId: 'p', apiKey: '' }), /apiKey is missing/);
});
