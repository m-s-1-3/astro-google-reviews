# @ms/astro-google-reviews

Google-Bewertung und Rezensionen für Astro-Seiten. **Eine** Abfrage und
**ein** Baustein für alle Projekte — das Gegenstück zu `@ms/astro-gallery`.

Zwei Teile, die man einzeln benutzen kann:

- **`fetch`** fragt die Places API (New) nach einem Ort: Durchschnitt, Anzahl
  und die Rezensionen, die Google herausgibt.
- **`Reviews.astro`** stellt das dar: Note mit Sternen, die Rezensionen als
  Karten, der Hinweis auf Google.

## Einbinden

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
  language: 'de',
});
---
<Reviews place={place} locale="de-DE" labels={{
  stars: '{rating} von 5 Sternen',
  count: '{count} Bewertungen auf Google',
  more: 'Auf Google ansehen',
  source: 'Bewertungen von Google',
}} />
```

**Über HTTPS, nicht über SSH, und das Repo öffentlich** — aus demselben Grund
wie bei der Galerie: die Container bauen ohne Schlüssel und ohne Token.
Geheim ist hier nichts; der Google-Schlüssel steht in keiner Datei des Pakets.

Die Fassung steht am Tag (`#v1.0.0`), nicht an einem Zweig.

## Was man von Google braucht

| | woher |
|---|---|
| **Place ID** (`ChIJ…`) | [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id) |
| **API-Schlüssel** | Google Cloud Console, »Places API (New)« aktivieren, den Schlüssel auf genau diese API beschränken |

Beides gehört in `.env` bzw. in die Build-Variablen, **nie ins Repo**.

## Die Abfrage

```ts
fetchPlaceReviews({ placeId, apiKey, language?, minRating?, max?, textOnly?, endpoint?, timeoutMs?, fetch? })
```

| Option | Vorgabe | wofür |
|---|---|---|
| `language` | `de` | Sprache der Texte und von »vor 3 Monaten« |
| `minRating` | `1` | Rezensionen darunter weglassen |
| `max` | `5` | höchstens so viele zeigen |
| `textOnly` | `true` | Rezensionen ohne Text weglassen |
| `endpoint` | Googles | anderer Ursprung derselben API: ein Proxy, oder ein Ersatz beim Testen |
| `timeoutMs` | `10000` | danach aufgeben |

Zurück kommt `PlaceReviews`: `name`, `rating`, `total`, `url`, `writeUrl`
(»Bewertung schreiben«) und `reviews`.

**Sie läuft dort, wo die Seite gebaut oder gerendert wird — nie im Browser.**
Der Schlüssel reist in einem Header, nicht in der Adresse, und kommt in
keiner ausgelieferten Datei vor.

**Fehler werden gemeldet, nicht verschluckt.** Ist Google nicht erreichbar
oder lehnt ab, wirft die Abfrage `GoogleReviewsError` — mit Googles eigener
Begründung (»API key not valid«, »Places API (New) has not been used in
project …«), denn der nackte Status ist ein Rätsel. Ob der Build daran
scheitern oder ohne Bewertungen weiterlaufen soll, entscheidet die Seite:

```ts
try { return await fetchPlaceReviews({ … }); }
catch (error) { console.warn(String(error)); return null; }
```

## Drei Dinge, die hier absichtlich so sind

**Der Durchschnitt wird nie angefasst.** `minRating` und `max` kürzen die
Liste, nicht die Note. `rating` und `total` sind Googles Zahlen über **alle**
Rezensionen. Eine Note, die nur die gezeigten Karten mittelt, wäre eine
andere Zahl unter Googles Namen.

**Fotos der Verfasser sind aus.** Die Bilder liefert Google; sie zu laden
verrät Google, wer die Seite besucht, und braucht auf einer deutschen Seite
eine Einwilligung. Ohne `photos` bekommt jede Person einen Kreis mit ihrem
Anfangsbuchstaben, und die Seite stellt **keine einzige Anfrage an Dritte**.
Wer die Fotos will und die Einwilligung geklärt hat: `<Reviews photos … />`.

**Höchstens fünf Rezensionen.** Mehr gibt die Places API nicht heraus, und
welche fünf, bestimmt Google. Für »alle Rezensionen« gibt es den Link auf
Google (`place.url`), nicht einen zweiten Weg an der API vorbei.

## Aussehen

Alles hängt an CSS-Variablen. Die Vorgaben stehen in den `var()`-Rückfällen,
nicht auf `.gr` — man kann sie deshalb auf `.gr` selbst **oder auf einem
Element darum herum** setzen:

| Variable | Vorgabe | wofür |
|---|---|---|
| `--gr-accent` | `#1a73e8` | Links, Kreis mit dem Anfangsbuchstaben |
| `--gr-star` | `#f5a623` | gefüllte Sterne |
| `--gr-star-off` | `rgb(0 0 0 / .14)` | leere Sterne |
| `--gr-card` | `#fff` | Grund der Karten |
| `--gr-card-border` | `1px solid rgb(0 0 0 / .08)` | Rahmen der Karten |
| `--gr-card-shadow` | `none` | Schatten der Karten |
| `--gr-radius` | `1rem` | Ecken |
| `--gr-gap` | `1.5rem` | Abstände |
| `--gr-card-min` | `18rem` | Mindestbreite einer Karte, bevor umgebrochen wird |
| `--gr-lines` | `7` | Zeilen, nach denen ein Text gekürzt wird |
| `--gr-muted` | `rgb(0 0 0 / .6)` | Datum und Quellenhinweis |

```css
.meine-stimmen { --gr-accent: #3f7d1f; --gr-radius: 1.5rem; }
```

Schrift und Schriftgröße erbt der Baustein von der Seite. Er bewegt nichts
und bringt kein Skript mit.

## Googles Bedingungen

- Die Rezensionen müssen als Googles erkennbar sein — dafür ist
  `labels.source` da (»Bewertungen von Google«). Nicht weglassen.
- Texte unverändert zeigen. Kürzen per `--gr-lines` ist Darstellung, der
  Link darunter führt zum ganzen Text.
- Eine statisch gebaute Seite zeigt den Stand des letzten Builds. Wer
  aktuelle Bewertungen will, baut regelmäßig neu (ein nächtlicher Build
  reicht); Google erlaubt nicht, die Inhalte beliebig lange vorzuhalten.

## Prüfen

```
npm test
```

Neun Fälle gegen einen nachgestellten `fetch`: Adresse und Header der
Anfrage, die Abbildung auf `PlaceReviews`, die Filter, ein Ort ohne
Rezensionen, Ablehnung und Ausfall. Die Namen in den Testdaten sind
absichtlich Platzhalter (»Testperson A«) — nichts darin darf mit einer
echten Rezension verwechselt werden können.

## Benutzt von

- `zap_ambroz` — beim Bauen abgefragt; ohne Schlüssel oder ohne Rezensionen
  zeigt die Seite stattdessen Aussagen der Praxis
