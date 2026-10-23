# @ms/astro-google-reviews

Google rating and reviews for Astro sites. **One** query and **one** component
for every project — the counterpart to `@ms/astro-gallery`.

Two parts that can be used on their own:

- **`fetch`** asks the Places API (New) about a place: average, count and the
  reviews Google hands out.
- **`Reviews.astro`** shows them: rating with stars, the reviews as cards, the
  attribution to Google.

## Installation

```
npm i git+https://github.com/m-s-1-3/astro-google-reviews.git#v1.0.0
```

```astro
---
import Reviews from '@ms/astro-google-reviews/Reviews.astro';
import { fetchPlaceReviews } from '@ms/astro-google-reviews/fetch';

const place = await fetchPlaceReviews({
  placeId: import.meta.env.GOOGLE_PLACE_ID,
  apiKey: import.meta.env.GOOGLE_PLACES_API_KEY,
  language: 'en',
});
---
<Reviews place={place} locale="en-GB" labels={{
  stars: '{rating} out of 5 stars',
  count: '{count} reviews on Google',
  more: 'View on Google',
  source: 'Reviews from Google',
}} />
```

The labels are the site's own texts, so a German site passes German ones
(`'{rating} von 5 Sternen'`, `'Bewertungen von Google'`, …).

**Over HTTPS, not SSH, and the repository public** — for the same reason as
the gallery: the containers build without keys and without tokens. Nothing
here is secret; the Google key is in no file of the package.

The version is pinned to a tag (`#v1.0.0`), not a branch.

## What you need from Google

| | Where from |
|---|---|
| **Place ID** (`ChIJ…`) | [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id) |
| **API key** | Google Cloud Console: enable "Places API (New)" and restrict the key to exactly that API |

Both belong in `.env` or the build variables, **never in the repository**.

## The query

```ts
fetchPlaceReviews({ placeId, apiKey, language?, minRating?, max?, textOnly?, endpoint?, timeoutMs?, fetch? })
```

| Option | Default | Purpose |
|---|---|---|
| `language` | `de` | language of the texts and of "3 months ago" |
| `minRating` | `1` | leave out reviews below this |
| `max` | `5` | show at most this many |
| `textOnly` | `true` | leave out reviews without text |
| `endpoint` | Google's | another origin of the same API: a proxy, or a stand-in for tests |
| `timeoutMs` | `10000` | give up after this |

It returns `PlaceReviews`: `name`, `rating`, `total`, `url`, `writeUrl`
("write a review") and `reviews`.

**It runs where the site is built or rendered — never in the browser.** The
key travels in a header, not in the URL, and appears in no file that is
served.

**Errors are reported, not swallowed.** If Google cannot be reached or
refuses, the query throws `GoogleReviewsError` — with Google's own reason
("API key not valid", "Places API (New) has not been used in project …"),
because the bare status is a riddle. Whether the build should fail on it or
carry on without reviews is up to the site:

```ts
try { return await fetchPlaceReviews({ … }); }
catch (error) { console.warn(String(error)); return null; }
```

## Three things that are deliberate

**The average is never touched.** `minRating` and `max` shorten the list, not
the rating. `rating` and `total` are Google's figures over **all** reviews. A
rating that averaged only the cards shown would be a different number under
Google's name.

**Reviewers' photos are off.** Google serves the images; loading them tells
Google who visits the page and, on a German site, needs consent. Without
`photos` every person gets a circle with their initial, and the page makes
**not a single request to third parties**. If you want the photos and have
sorted out consent: `<Reviews photos … />`.

**At most five reviews.** The Places API hands out no more, and Google decides
which five. For "all reviews" there is the link to Google (`place.url`), not a
second way around the API.

## Styling

Everything hangs on CSS variables. The defaults sit in the `var()` fallbacks,
not on `.gr` — so you can set them on `.gr` itself **or on any element around
it**:

| Variable | Default | Purpose |
|---|---|---|
| `--gr-accent` | `#1a73e8` | links, circle with the initial |
| `--gr-star` | `#f5a623` | filled stars |
| `--gr-star-off` | `rgb(0 0 0 / .14)` | empty stars |
| `--gr-card` | `#fff` | card background |
| `--gr-card-border` | `1px solid rgb(0 0 0 / .08)` | card border |
| `--gr-card-shadow` | `none` | card shadow |
| `--gr-radius` | `1rem` | corners |
| `--gr-gap` | `1.5rem` | spacing |
| `--gr-card-min` | `18rem` | minimum card width before wrapping |
| `--gr-lines` | `7` | lines after which a text is cut short |
| `--gr-muted` | `rgb(0 0 0 / .6)` | date and attribution |

```css
.my-reviews { --gr-accent: #3f7d1f; --gr-radius: 1.5rem; }
```

The component inherits typeface and font size from the page. It animates
nothing and ships no script.

## Google's terms

- The reviews must be recognisable as Google's — that is what `labels.source`
  is for ("Reviews from Google"). Do not leave it out.
- Show texts unchanged. Cutting them short via `--gr-lines` is presentation;
  the link below leads to the full text.
- A statically built site shows the state of its last build. If you want
  current reviews, rebuild regularly (a nightly build is enough); Google does
  not allow keeping the content for arbitrarily long.

## Testing

```
npm test
```

Nine cases against a mocked `fetch`: URL and headers of the request, the
mapping to `PlaceReviews`, the filters, a place without reviews, refusal and
outage. The names in the test data are placeholders on purpose ("Testperson
A") — nothing in them may be mistaken for a real review.

## Used by

- `zap_ambroz` — fetched while building; without a key or without reviews the
  site shows statements from the practice instead
- `lvm-stephan` — two places, fetched while building, with recorded reviews as
  fallback
