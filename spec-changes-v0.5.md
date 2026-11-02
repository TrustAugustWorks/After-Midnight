# Spec change list: v0.4 → v0.5 (proposal)

Status: proposal for the product owner. Nothing in here is applied to `GTA6-Countdown-Requirements.docx` until approved.
Date: 2 November 2026

## Decisions recorded in v0.5

| # | Decision | Source |
|---|----------|--------|
| D1 | Target audience is in Denmark. The site is concerned with one timezone only: `Europe/Copenhagen` (UTC+1 in November, no DST change before launch). | Product owner, 2 Nov |
| D2 | Site language is Danish (`<html lang="da">`, all UI copy, disclaimer). | Product owner, 2 Nov |
| D3 | Dates and times use Danish format, e.g. "torsdag 19. november 2026 kl. 00.00". | Product owner, 2 Nov |
| D4 | ~~Review wheel with international outlets~~. Superseded by D6. | Product owner, 2 Nov |
| D5 | Launch target is midnight Copenhagen time: 00:00 Thu 19 Nov = `2026-11-18T23:00:00Z`, stored as one value in config. Assume this; no further verification of the unlock hour. | Product owner, 2 Nov |
| D6 | **The review roulette wheel is removed.** In its place, the site shows a list of IGN articles about GTA VI. Each item is a link to the article on ign.com. | Product owner, 2 Nov |
| D7 | **No analytics** in v1. | Product owner, 2 Nov |
| D8 | YouTube thumbnails may be fetched at build time and served from our own domain. | Product owner, 2 Nov |

## Unlock time research (2 Nov 2026)

- **Date:** 19 November 2026 on PS5 and Xbox Series X|S. Confirmed and repeatedly reaffirmed by Take-Two.
- **Hour:** *Not announced by Rockstar, Sony or Microsoft.* Two competing claims:
  - **Midnight local per store region** (most sources, based on PlayStation and Xbox store listings). For Denmark: **00:00 Thu 19 Nov = 23:00Z Wed 18 Nov**. ([keymap.io](https://keymap.io/releases/gta-6/), [allthings.how](https://allthings.how/gta-6-release-date/))
  - **One global moment at about 05:00Z** (one source, marked as an estimate). For Denmark: **06:00 Thu 19 Nov**. ([gameinsiderpro.com](https://gameinsiderpro.com/gta-6-release-time-2026/))
- **PS5 vs Xbox:** no source gives them different hours in Denmark.
- **Physical copies:** reportedly contain a download code rather than a disc. They unlock at the same time as digital.
- **Pre-load:** reportedly opens 12 November at local midnight.

**Decision (D5):** the product owner chose to assume midnight. The instant still lives in config (FR-07), so a late change is one value, and the tests derive from config (TC-13).

## Requirement changes

| ID | v0.4 | v0.5 |
|----|------|------|
| FR-01 | Days/hours/minutes/seconds, updating every second | Unchanged. Labels in Danish: dage, timer, minutter, sekunder. |
| FR-02 | Detect visitor timezone and show it | **Replaced:** The countdown targets the configured launch instant regardless of the device's timezone. All dates and times are displayed in `Europe/Copenhagen` with Danish formatting. |
| FR-03 | City switch remembered in URL | **Removed.** (Also resolves the hash-vs-path spec issue in 8.8.) |
| FR-04 | Correct device clock against server time | **Clarified:** correct only if the device clock is off by **more than 2 s**. Use the `Date` header of a HEAD request and compensate for half the round-trip time. |
| FR-05 | Celebration at zero, then post-launch state | Unchanged. Post-launch copy: "Ude nu". Sound stays off by default; add a visible sound toggle. |
| FR-06 | .ics for local launch moment | .ics for the configured launch instant. Danish title. |
| FR-07 | One config file | **Expanded:** the config holds the launch instant, pre-load date, review embargo date, GTA V release date (17 Sep 2013), delay history and links. |
| FR-08 | (Could) embed mode | Unchanged (Could, no tests). |
| FR-09 | Share images reflecting remaining time | **Simplified:** one static 1200 × 630 share image for the site, built at build time. The live time-left image becomes a Could (edge function, only if done by day 10). |
| FR-10 | Global launch-wave view | **Demoted to Could and reframed:** "De spiller allerede i …", a teaser that lists a few cities already past midnight before Copenhagen unlocks. Tests are written only if promoted. |
| FR-11, FR-12 | Video hub, click-to-load facade | Unchanged. |
| FR-13 | Spin wheel (hype deck / reviews) | **Removed** (D6). |
| FR-14 | Review list + average score next to the wheel | **Removed** (D6). The IGN article list replaces it, including IGN's own review once it is published. |
| FR-15 | Hide content above chosen spoiler level | **Clarified:** an on/off "Spoilerskjold" toggle. On (default) shows `safe` only. Off shows `safe` + `mild`. `story` items are always blurred, each with its own click-to-reveal. The choice is stored in `localStorage`. Applies to videos **and** IGN articles. |
| FR-16 | – | **New:** All UI copy and the footer disclaimer are in Danish; `<html lang="da">`. IGN headlines are shown as published (English). |
| FR-17 | – | **New (Should):** "Den lange ventetid": a counter showing time since GTA V's release, counting up and driven by config. |
| FR-18 | – | **New:** Video thumbnails are fetched at build time and served from our own domain, so no request reaches YouTube until a visitor clicks play (D8). |
| FR-20 | – | **New (Should):** "Lyd: til" plays "Sexy Magic" (CA7RIEL & Paco Amoroso, PinkPantheress, Fred again.. & Étienne de Crécy, from *GTA VI: The Album*) through the official Atlantic Records YouTube embed, in a small visible player. "Lyd: fra" removes the player. Sound is always off on load and never remembered, so YouTube is contacted only after a click. The audio is never downloaded or rehosted. *Exception to section 9 ("no official music"), approved by the product owner on 2 Nov, on the same terms as the trailers.* Tested by TC-27. |
| FR-19 | – | **New (Must):** "Fra IGN": a list of IGN articles about GTA VI, curated by hand in `articles.json` (title, URL, publish date, spoiler level). The list is sorted newest first, and each item is a link that opens the article on ign.com. Only the headline, date and an "IGN" label are shown: no article text, no IGN images, no IGN scripts. |

## Test changes

| Test | Change |
|------|--------|
| TC-01 | Expected label text in Danish (`1 dag 00 timer 00 minutter 00 sekunder`, or whatever labels the copy decides). Copenhagen already used. |
| TC-03 | **Rewritten (FR-02, E2E):** Given the browser timezone is `America/New_York` and the clock is at 17 Nov 23:00:00Z, when the page loads, then the countdown shows 1 d 00 t 00 m 00 s and the launch date reads "torsdag 19. november 2026 kl. 00.00". |
| TC-04 | **Rewritten (FR-02, Unit):** `formatLaunch(instant)` returns Copenhagen time in Danish format for instants given in any zone, including across the 23:00Z date boundary. |
| TC-05, TC-06 | **Removed** (FR-03 removed). |
| TC-07 | Unchanged (5 minutes fast → corrected). |
| TC-08 | Clarified: off by ≤ 2 s, or the request fails → no correction and no error. |
| TC-09 – TC-11 | Expected text "Ude nu" instead of "Out now". |
| TC-12 | **Rewritten:** the .ics starts at `2026-11-18T23:00:00Z` (the config value) and has a Danish title and a unique ID. |
| TC-13 | Clarified: files under `tests/` are exempt from the "no hard-coded date" scan. |
| TC-14 | The static share image is 1200 × 630 PNG; the tags are present without JS. No per-city variants. |
| TC-15 | **Deferred** (FR-10 is now Could). |
| TC-17 | Unchanged wording, now achievable because of FR-18. |
| TC-18 – TC-21 | **Removed** (FR-13 and FR-14 removed). |
| TC-22 | Updated to the toggle model in FR-15; covers videos and IGN articles. |
| TC-23 | **New (FR-17, E2E):** with the clock at 17 Nov 23:00Z, the long-wait counter shows the correct elapsed time since 17 Sep 2013 (Copenhagen), and it increases each second. |
| TC-24 | **New (FR-04, Unit):** a 3 s offset is corrected; the correction compensates for round-trip time. |
| TC-25 | **New (FR-19, Data):** `articles.json`: every entry has a non-empty title, an `https://www.ign.com/` URL, a valid publish date and a spoiler level from the allowed list; no duplicate URLs. |
| TC-26 | **New (FR-19, E2E):** Given an `articles.json` with known entries, when the page loads, then every `safe` article appears as a link to its URL, newest first, with its date in Danish format, and no request is made to any IGN domain. |
| TC-N2 | Explicit check: no white text on neon pink. Text on `#FF3D8B` uses `#120A1F` (≈ 5.7:1). |
| TC-N4 | Unchanged and strict: no cookies and **no** third-party requests on first visit (no analytics exception, D7). |
| TC-N5 | Disclaimer in Danish, e.g. "Uofficielt fanprojekt. Ikke tilknyttet Rockstar Games, Take-Two Interactive eller IGN." |

## Other spec sections affected

- **Section 1.1 tokens:** text on neon pink must be `#120A1F` (dark), not `#F4ECFF`. White on pink is ≈ 2.9:1 and fails WCAG AA. The wheel's "six accents" and the "Spin the wheel" button are no longer needed; amber stays for links and the long-wait number.
- **Section 3 metrics:** "measurable share rate" can't be measured without analytics (D7). Drop it, or count shares by hand from Discord/Reddit.
- **Section 5:** concept #14 (review roulette) becomes Won't. Section 5.2 is removed.
- **Section 10:** the analytics row is removed.
- **Section 11 plan:** the 17 Nov wheel rehearsal is removed. On 18 Nov, live ops adds IGN's review and other review articles to `articles.json`, plus review videos.

## Still open (product owner)

1. **IGN articles: curated by hand or fetched automatically?** Recommendation: by hand in `articles.json`, like `videos.json`. It's deterministic to test, has no dependency on IGN's feed format, and lets us set the spoiler level per article. The alternative is a scheduled build that reads IGN's RSS feed and filters for GTA VI. It's less work day to day, but an automatically added article has no reviewed spoiler level.
2. Who writes the Danish copy (celebration text, labels, disclaimer)?
3. Who curates on 18 Nov (review day)?
4. Primary goal, hours per day, and an existing domain or audience (from v0.4 section 13).
