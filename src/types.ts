/** One review as the page needs it.
 *
 *  Plain values, not Google's response shape: the component must not care
 *  which version of the Places API answered, and a site may as well hand in
 *  reviews it got from somewhere else.
 */
export interface Review {
  author: string;
  /** The author's profile on Google Maps. */
  authorUrl?: string | undefined;
  /** Served by Google. Showing it makes every visitor's browser call Google;
   *  the component only does that when asked to (`photos`). */
  authorPhoto?: string | undefined;
  /** 1 to 5, whole stars. */
  rating: number;
  /** In the language that was asked for; Google translates where it can. */
  text: string;
  /** "vor 3 Monaten" — written by Google, in the language asked for. */
  relativeTime: string;
  /** ISO timestamp. */
  publishedAt?: string | undefined;
  /** This one review on Google Maps. */
  url?: string | undefined;
}

/** A place with its rating and the reviews Google hands out for it. */
export interface PlaceReviews {
  name: string;
  /** Average over all reviews, one decimal: 4.8. */
  rating: number;
  /** How many reviews the average is made of — not how many are in `reviews`. */
  total: number;
  /** The place on Google Maps. */
  url: string;
  /** Where a visitor can write a review of their own. */
  writeUrl: string;
  /** At most five: that is all the Places API returns. */
  reviews: Review[];
}

/** The words. The component has no language of its own.
 *  `{rating}`, `{count}` and `{name}` are filled in where they appear. */
export interface ReviewsLabels {
  /** Read out for the stars: "{rating} von 5 Sternen". */
  stars: string;
  /** Next to the average: "{count} Bewertungen auf Google". */
  count: string;
  /** Under a shortened review: "Auf Google weiterlesen". */
  more: string;
  /** Google wants its reviews attributed: "Bewertungen von Google". */
  source: string;
}
