/** The query: one place, its rating and its reviews, from the Places API (New).
 *
 *  Runs wherever the site builds or renders — never in the browser, the key
 *  must not get there. What comes back is plain data (`PlaceReviews`), so the
 *  site may cache it, filter it or hand it straight to `<Reviews>`.
 */
import type { PlaceReviews, Review } from './types.ts';

export interface FetchOptions {
  /** `ChIJ…` — from the Place ID Finder. */
  placeId: string;
  /** A key with the "Places API (New)" enabled. */
  apiKey: string;
  /** Language of the texts and of "vor 3 Monaten". */
  language?: string;
  /** Leave out reviews below this many stars. The average stays untouched —
   *  it is Google's figure for all reviews, and shading it would be a lie. */
  minRating?: number;
  /** Show at most this many. Google returns five at the most. */
  max?: number;
  /** A star rating without a word says nothing on a page; such reviews are
   *  dropped unless this is switched off. */
  textOnly?: boolean;
  /** Another origin for the same API: a proxy, or a stand-in while testing. */
  endpoint?: string;
  /** Give up after this long. A build must not hang on Google. */
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export class GoogleReviewsError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'GoogleReviewsError';
  }
}

/** Only what is used. The field mask decides what Google bills. */
const FIELDS = ['id', 'displayName', 'rating', 'userRatingCount', 'googleMapsUri', 'reviews'].join(',');

interface ApiText { text?: string }
interface ApiReview {
  rating?: number;
  text?: ApiText;
  originalText?: ApiText;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
}
interface ApiPlace {
  id?: string;
  displayName?: ApiText;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: ApiReview[];
}

const toReview = (r: ApiReview): Review => ({
  author: r.authorAttribution?.displayName?.trim() || '',
  authorUrl: r.authorAttribution?.uri || undefined,
  authorPhoto: r.authorAttribution?.photoUri || undefined,
  rating: Math.round(r.rating ?? 0),
  text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
  relativeTime: r.relativePublishTimeDescription ?? '',
  publishedAt: r.publishTime || undefined,
  url: r.googleMapsUri || undefined,
});

/** Throws `GoogleReviewsError` when Google cannot be reached or refuses.
 *  Whether a build should fail on that or go on without reviews is the
 *  site's decision, so it is not made here. */
export async function fetchPlaceReviews(options: FetchOptions): Promise<PlaceReviews> {
  const {
    placeId, apiKey, language = 'de', minRating = 1, max = 5, textOnly = true,
    endpoint = 'https://places.googleapis.com/v1', timeoutMs = 10_000,
    fetch: request = globalThis.fetch,
  } = options;
  if (!placeId) throw new GoogleReviewsError('placeId is missing');
  if (!apiKey) throw new GoogleReviewsError('apiKey is missing');

  const address = `${endpoint.replace(/\/$/, '')}/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(language)}`;
  let response: Response;
  try {
    response = await request(address, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELDS },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    throw new GoogleReviewsError(`Places API not reachable: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  if (!response.ok) {
    // Google explains itself in the body ("API key not valid", "Places API
    // (New) has not been used in project …"); without it the status is a riddle.
    const body = await response.text().catch(() => '');
    let reason = body.slice(0, 300);
    try { reason = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? reason; } catch { /* not JSON */ }
    throw new GoogleReviewsError(`Places API answered ${response.status}: ${reason}`, response.status);
  }

  const place = (await response.json()) as ApiPlace;
  const reviews = (place.reviews ?? [])
    .map(toReview)
    .filter((r) => r.rating >= minRating && (!textOnly || r.text !== ''))
    .slice(0, Math.max(0, max));

  return {
    name: place.displayName?.text ?? '',
    rating: place.rating ?? 0,
    total: place.userRatingCount ?? 0,
    url: place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`,
    writeUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
    reviews,
  };
}
