# QuickProList homeowner contact list

Read 2026-10-04. This is the one design. Build it. Do not invent a second home screen.

## Decision

QuickProList for a homeowner is one inset contact list: choose a town, choose a trade, then call one of three people.

## What this refuses

The current home screen in `app/page.tsx` is a marketing page. Remove it. The owner’s brief wins when a trend disagrees.

- Amber (`#f59e0b` and the amber utilities on the homeowner path), the amber underline on the headline, the amber logo dot, and amber focus rings. One accent remains, `#007AFF`, and it is only for Call, the back control, and text links.
- The hero “The right hand for every home project.”, the centered slogan, `hero-bg`, and `grid-dots`.
- Emoji category tiles (`lib/categories.ts` `icon` values stay in data; the homeowner UI does not render them).
- The three feature cards “Find local pros”, “Quick search”, and “Local results”.
- Photo banners, gradient placeholders, “Featured” ribbons, “This is your listing” pills, and “Top pick” treatment on a result.
- Star icons as the body of a row. A rating may sit on the secondary line as text.
- “Verified”, “vetted”, or any trust claim. That language was removed because it is not true. Do not put it back. A manual business is still just a name and a trade.
- A sticky marketing navbar on the homeowner path. The large title is the chrome.
- Liquid Glass, translucent bars, and a second display typeface. Apple’s current HIG pushes a glass control layer; this product stays on opaque grouped lists. Geist is already loaded in `app/layout.tsx`. Do not add a font.
- A sticky “Call” bar and a “Get a quote” hero. Trade-site articles recommend those for a business with one phone number. This screen is a list of different people. A bar glued to the bottom would cover rows and would have nobody to dial.
- Carousels, photo-first cards, and a different desktop layout.

Admin, enroll, and dashboard stay as they are. They may stay dense. If a later change touches them, reuse these colors and Geist. Do not give them a second brand, and do not restyle them in this pass.

## Sources

Lines below are the sentences used. Read 2026-10-04.

Apple Human Interface Guidelines:

- Lists and tables, <https://developer.apple.com/design/human-interface-guidelines/lists-and-tables>. The official page did not return body text; the same article was read at <https://apple-docs.everest.mt/docs/design/human-interface-guidelines/lists-and-tables/>. “Prefer displaying text in a list or table… the row-based format is especially well suited to making text easy to scan and read.” “Keep item text succinct so row content is comfortable to read.” “In iOS and iPadOS, for example, the grouped style uses headers, footers, and additional space to separate groups of data.” “you might need to display a small image in the leading end of a row, followed by a brief explanatory label.” “If you need to let people drill into a list or table row’s subviews, use a disclosure indicator.”
- Layout, <https://developer.apple.com/design/human-interface-guidelines/layout>. “Place items to convey their relative importance… place the most important items near the top and leading side.” “Align components with one another to make them easier to scan.” “Make essential information easy to find by giving it sufficient space… don’t obscure it by crowding it with nonessential details.” “Avoid full-width buttons. Buttons feel at home in iOS when they respect system-defined margins and are inset from the edges of the screen.” “Be prepared for text-size changes.”
- Typography, <https://developer.apple.com/design/human-interface-guidelines/typography>, read via the DocC mirror <https://github.com/Prisma-Labs-Dev/apple-skills/blob/HEAD/skills/hig/typography.md> (source URL above). “Minimize the number of typefaces you use.” Default iOS text size 17 pt, minimum 11 pt. At the default Large size, Large Title is 34 pt, leading 41, emphasized weight Bold. Headline is 17 pt Semibold, leading 22. Subhead is 15 pt Regular, leading 20. The same default sizes are listed at <https://www.iosfontsizes.com/>.
- Color, <https://developer.apple.com/design/human-interface-guidelines/color>. “Use the grouped background colors (systemGroupedBackground, secondarySystemGroupedBackground, and tertiarySystemGroupedBackground) when you have a grouped table view.” Label is primary text. Secondary label is lesser text. Separator divides rows. Link is link text. “Avoid relying solely on color to differentiate between objects.” “Apply color sparingly… reserve it for… primary actions.” “Refrain from adding color to the background of multiple controls.”
- `systemGroupedBackground`, <https://developer.apple.com/documentation/uikit/uicolor/systemgroupedbackground>. “Use this color for grouped content, including table views and platter-based designs.”
- Light-mode reference values, <https://swiftuicolors.com/ios-colors>. System grouped background `#F2F2F7`. Secondary system grouped background `#FFFFFF`. System blue `#007AFF`. Label `#000000`. Secondary label `#3C3C43` at 60% opacity. The HIG says these values are design references; production UI should use the semantic colors, and this spec prints the hex so the web build matches the mocks.
- Buttons, <https://developer.apple.com/design/human-interface-guidelines/buttons>, read at <https://apple-docs.everest.mt/docs/design/human-interface-guidelines/buttons/> (official page returned no body; changelog on the mirror: 16 December 2025). “A button needs a hit region of at least 44x44 pt.” “Use a button that has a prominent visual style for the most likely action in a view.” “Keep the number of prominent buttons to one or two per view.” “Using title-style capitalization, consider starting the label with a verb.” “A primary button uses an app’s accent color.”

What people hate in local-service UI, and the trends that lost:

- Baymard, “Ecommerce Mobile App UX Trends 2026”, <https://baymard.com/research-articles/mobile-app-ux-trends>. “Avoid Displaying Overly Prominent Ads on the Homepage.” A participant: “I feel my first reaction to this homepage is that it is a bit overwhelming.” Homepage ads in the upper viewport “prevent users from gleaning an overview” and overwhelm them. The current hero is that problem. It goes.
- Service Scalers, <https://www.servicescalers.com/resources/5-website-changes-that-book-more-emergency-service-calls>. “The phone number is the conversion event.” “A phone number buried below the fold costs the call before it starts.” Used: the number is on the row, in a `tel:` link, with a 44 pt target. Their “one business, one number in the header” layout does not fit a list of three pros.
- Suff Digital, “Tap-to-Call Links 2026”, <https://www.suffdigital.com/resources/data-studies/local-business-tap-to-call-links>. “42.1% of US local business homepages have no tap-to-call link.” “A number that cannot be tapped adds friction at the exact moment a customer is ready to call.”
- Hook Agency, <https://hookagency.com/blog/home-services-mobile-ux-mistakes/>. “Tiny call buttons… Overloaded pages.” “sites that list 10 to 12 services above the fold. Multiple banners. Paragraphs of copy. Sliders.” Used as the reason the emoji grid and the feature cards go. The trade list stays, as text rows, because choosing a trade is the task.
- SoDutch, <https://sodutch.com.au/click-to-call-mobile-ux-for-trades/>. “A sticky bar earns its place: call + quote following the scroll.” This trend lost. A sticky bar fits a single contractor site. Here each row already has Call.

## What the app is today

Verified in the repo on 2026-10-04.

- Home is `app/page.tsx`. It renders a hero, an emoji category grid, `BusinessCard` results, three feature cards, and `ListBusinessSection`.
- Search results are capped at 3. `lib/search.ts` sets `MAX_RESULTS = 3`. `app/page.tsx` also does `data.businesses.slice(0, 3)`. Keep both caps. No “see more”, no fourth row.
- Paying businesses are already pinned first inside `getMergedResults`. The pin is sort order only. The row does not announce it.
- Open towns are `lib/open-towns.ts`: Acworth, Kennesaw, Marietta, Woodstock, all GA. Anywhere else uses `NOT_OPEN_MESSAGE`.
- Categories are the ten entries in `lib/categories.ts`, in that order.
- A phone number is `Business.phone` (Yelp `display_phone`). Existing links use `` `tel:${business.phone}` ``. Keep that string. Curated rows (manual, or a Yelp id on a curated record) go through `components/TrackedContactLink.tsx` with `clickType="phone"`. Plain Yelp rows are a normal `<a>` and must not POST a click. `components/BusinessCard.test.tsx` covers this.
- `/pro/[id]` renders only when `proSiteEnabled` is true. It is currently a dark photo hero. Replace that page with the same list system. Keep the `proSiteEnabled` gate and `notFound()`.
- Homeowners are not charged. Do not add a price, a plan, or a lock on search.

The names in the mocks (Marcus Hale, Rosa Nguyen, James Tiller) are drawings of the row. Do not seed them.

## Visual system

Scope every value below to the homeowner path (`/`, `/pro/*`, and the list-your-business form when it is open). Do not change `:root` `--accent` in `app/globals.css`. Admin, enroll, and dashboard use their own amber utilities and must keep them.

| Token | Value | Use |
| --- | --- | --- |
| Page | `#F2F2F7` | Viewport background, edge to edge |
| Group | `#FFFFFF` | The single inset list |
| Label | `#000000` | Large title, row name, trade-list label |
| Secondary | `rgba(60, 60, 67, 0.6)` | Trade, town subtitle, footer, placeholder |
| Separator | `rgba(60, 60, 67, 0.29)` | Hairline between rows, 0.5px |
| Accent | `#007AFF` | Call fill, back control, text links |
| On accent | `#FFFFFF` | “Call” label and monogram initials |
| Monogram fill | Hashed from the name | 36px circle when there is no photo. One of `#007AFF`, `#34C759`, `#FF9500`, `#AF52DE`, `#FF2D55`, `#30B0C7`, `#5856D6`. The same name always maps to the same color. `#E5E5EA` is the loading skeleton only. |
| Search fill | `rgba(118, 118, 128, 0.12)` | City field |
| Pressed row | `rgba(118, 118, 128, 0.12)` | Active/hover on a row |
| Error | `#FF3B30` | The one error line, plus the words |
| Chevron | `#C7C7CC` | Disclosure only |

Group corner radius 10px. No shadow, no ring, no border around the group. The hairlines are inside it. Screen inset is 16px. On a 390-wide phone the column is the screen. From 640px upward the same column is `max-width: 640px`, `margin-inline: auto`, and the `#F2F2F7` page continues to the viewport edges. There is no second breakpoint and no grid.

Type, Geist, already on `body`:

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Large title | 34px | 700 | 41px | -0.4px |
| Back and row label | 17px | 400 | 22px | 0 |
| Person name | 17px | 600 | 22px | 0 |
| Secondary line | 15px | 400 | 20px | 0 |
| Footer | 13px | 400 | 18px | 0 |
| Call label | 17px | 600 | 22px | 0 |

Left aligned. No centered slogan. Minimum size on this path is 13px.

## Files to change

- `app/layout.tsx` — homeowner routes paint edge to edge. Other routes keep the current `main` (`max-w-6xl`, padding) and the current footer.
- `components/Navbar.tsx` — return `null` when the path is `/` or starts with `/pro`. Every other path keeps the current navbar, amber included. Do not redraw it.
- `app/page.tsx` — replace the hero, the emoji grid, the feature cards, and the card results with the screens below.
- `components/OpenTownInput.tsx` — same behavior, search-field visuals. Suggestion highlight uses the pressed-row fill, not `bg-amber-50`.
- `components/BusinessCard.tsx` — the contact row. Update `components/BusinessCard.test.tsx` in the same change.
- `components/ListBusinessSection.tsx` — off the first screen. When opened, use this visual system.
- `app/pro/[id]/page.tsx` — the contact detail below.
- `app/globals.css` — add these tokens under a `.homeowner` scope. Delete `.hero-bg` and `.grid-dots` once `app/page.tsx` no longer uses them. Leave `:root` colors alone.

`components/CategoryGrid.tsx` is unused. Leave it.

Do not edit `lib/search.ts` except to keep the cap at 3 if someone is tempted to raise it. Do not edit `lib/categories.ts` or `lib/open-towns.ts`.

## Screen 1 — home

Mocks: `design/mocks/home-contact-list-mobile.png` (390-class phone, drawn at 720×1280). Desktop is this same column centered; it does not get its own mock because it is not a new layout.

Top to bottom, inside the 640px column, 16px side padding:

1. Large title `QuickProList`. No logo mark.
2. City field. One line, height 44px, radius 10px, search fill, no border. A magnifying-glass icon at 17px in the secondary color, then the placeholder `City` at 17px. The input text is 17px `#000000`. This is `OpenTownInput`. Keep autocomplete, keyboard behavior, and the four towns. The suggestion list is the same white group, 8px under the field, each town a 44px row: Acworth, Kennesaw, Marietta, Woodstock.
3. One white group of the ten trades, labels exactly: Plumbers, Electricians, HVAC, Roofers, Painters, Landscapers, Pest Control, Cleaners, Contractors, Locksmiths. Each row is a `<button>`, min-height 44px, padding 11px 16px, label 17px regular, chevron on the trailing edge. Hairline under every row except the last, inset 16px from the group’s left edge.

Nothing else is on the first screen. No status bar in the web UI (the mock includes one only as phone chrome).

Behavior, unchanged in substance:

- A saved town in `localStorage` key `quickprolist:lastLocation` still prefills the field. It does not run a search by itself.
- A URL that already has both `location` and `category` still auto-runs, as the effect in `app/page.tsx` does today.
- Tapping a trade with an empty or unresolved town focuses the field and shows one line under it, the existing sentence: `Choose your town first — we’ll auto-search once you pick one.` Color `#FF3B30`. The words carry the meaning; the color does not.
- A town outside the four shows `NOT_OPEN_MESSAGE` as that same one line. Do not rewrite the sentence.
- A resolved town is saved, and the search runs.

## Screen 2 — results

Mocks: `design/mocks/results-contact-list-mobile.png`, `design/mocks/results-contact-list-desktop.png`.

The trade group is gone. The city field is gone. Same column.

1. Back control, 44px hit target, 17px `#007AFF`, label `‹ QuickProList`. It clears the category and the results and returns to screen 1 with the town still in the field. `history.replaceState` drops `category` and keeps `location`.
2. Large title is the category `label` (`Plumbers`).
3. Subtitle is the resolved town name only (`Acworth`), 17px secondary, 4px under the title. The Yelp query may still use `formatTown` (`Acworth, GA`). The subtitle does not.
4. One white group of at most three contact rows.

While loading, the group contains three skeleton rows, 64px, fill `#E5E5EA`, no card-shaped gray blocks.

When the array is empty, there is no group. One secondary line under the subtitle: `No plumbers in Acworth yet.` Use the category label lowercased and the town name. That is the only empty state. Do not render feature tiles.

### The row

Min-height 64px. Horizontal padding 16px. Vertical alignment center. White. Hairline separator starts at the text (64px from the row’s left: 16px padding + 36px circle + 12px gap) and is omitted on the last row.

Leading: a 36px circle.

- If `imageUrl` is non-empty, the photo is cropped into that circle (`object-fit: cover`). It is not a banner.
- Otherwise two initials, 15px semibold, white, on the hashed monogram color. Initials are the first letter of the first word and the first letter of the second word. One word uses its first two letters. Uppercase. The pro page uses the same color for that name.

Middle, `min-width: 0`, truncates with ellipsis:

- Name, 17px semibold, `#000000`. `business.name`.
- Secondary line, 15px, secondary color: the searched trade in sentence case from `CATEGORIES[].term` (`plumber` → `Plumber`, `HVAC` stays `HVAC`, `pest control` → `Pest control`). Ignore `business.categories` on this line; Yelp tags are too long for the row.
- If `source !== 'manual'` and `rating != null`, append ` · 4.6`. If `reviewCount != null`, append ` (128)` using the real count. Example: `Plumber · 4.6 (128)`. No star icons.
- If the row is the `highlight` match (`id` or `yelpId`, the helper already in `app/page.tsx`), append ` · Your listing` in `#007AFF`. No ribbon, no amber ring.

Trailing: one Call control.

- Visible pill: height 44px, padding 0 16px, radius 10px, fill `#007AFF`, label `Call`, 17px semibold white. The hit region is the pill itself, so it is already 44×44 or wider.
- `href` is `` `tel:${business.phone}` ``. Curated (`source === 'manual'` or `yelpId` set): `TrackedContactLink` with `clickType="phone"`. Plain Yelp: `<a>` with no click POST.
- `aria-label={`Call ${business.phone}`}` so the number is in the accessible name. The visible word stays `Call`.
- If `phone` is empty, omit the control. Do not show a disabled button.
- The test file currently does `getByText('555-0100')`. Point it at the link named `Call 555-0100`. Keep both assertions: a curated click POSTs `/api/pro/:id/click` with `{ type: 'phone' }`; a plain Yelp click does not.

The row body does not dial. Call is the only dial control, so the row matches the Phone app’s “one obvious action” without making the name and the button do the same thing.

If `proSiteEnabled` is true, the name is a same-tab link to `/pro/${business.id}` and a `#C7C7CC` chevron sits in a 44px target just before Call. If it is false, the name is text and there is no chevron. Do not open Yelp from the row. Do not use `target="_blank"`.

Do not put the address, the website, the ProSite pill, or the globe button on the row. Those move to the pro page or disappear.

## Pro page

`app/pro/[id]/page.tsx`. Same column, same page color, no navbar, no dark hero.

1. Back control `‹ QuickProList` to `/`, 17px `#007AFF`, 44px target.
2. Large title: `business.name`.
3. Secondary line: the same trade string as the row. Rating text, when present, uses the same `· 4.6 (128)` pattern. No star artwork in the header.
4. A 64px circle, monogram or cropped `imageUrl`, left aligned. Not a full-bleed photo.
5. One accent button, inset 16px from the column edges (so it is not full-bleed), min-height 44px, radius 10px, fill `#007AFF`, white label `Call` plus a space plus `business.phone` (`Call (770) 555-0142`). Same `tel:` and tracking rules as the row. This is the primary action on the page, so the number is visible here. If there is no phone, omit the button and show one secondary line: `No phone number listed.`
6. One white group under the button, only the rows that have data. Each row min-height 44px, label 15px secondary, value 17px `#000000`.
   - Address, when present, links to the existing Google Maps URL. Curated rows track `directions`.
   - Website, when present, links out and tracks `website` for curated rows. Show the host, not a globe button.
   - Hours, when `hours` has entries, are one row per weekday using the existing `formatTime` helper. The current day is the same type as the others; append the word `Today` in the secondary color. No amber wash.
   - When `url` is present, one row reads `Reviews` / `On Yelp` and links to `url`. No red Yelp lockup.

Remove from this page: the gradient hero, the wave SVG, the “ProSite” wordmark, the stats card, the “What we offer” grid, the photo gallery, the “Areas we serve” chips, the “Ready to get started?” block, and the dark footer. Service-area data can stay in the API response. It is not a section on this page.

## List your business

The gradient “For pros” block is not on screen 1 or screen 2.

The homeowner footer, inside the column, is one 13px secondary line: `List your business`, then `Privacy`, then `Terms`, then `Powered by Yelp Fusion`. Gaps 16px. `List your business` reveals `ListBusinessSection` below the footer on `/` only.

Restyle that form to this system: white group, 44px fields, 10px radius, labels 13px secondary, submit button the accent button with the label `Submit`. No gradient, no amber, no emoji side cards, no “Featured placement” bullets. Keep the existing POST to `/api/list-business` and the existing fields. Success is one line: `Application received.`

## Navbar and footer

Homeowner paths (`/`, `/pro/*`): no sticky bar, no “Search / Admin”, no amber wordmark. Admin stays reachable by URL for people who already use it. Do not add an Admin link on the homeowner screen.

Other paths: the current `Navbar` and the current footer stay, including amber. Privacy and terms pages are not part of this redesign.

`viewport.themeColor` in `app/layout.tsx` becomes `#F2F2F7`.

## Desktop

One column, 640px, centered, same DOM as the phone. `design/mocks/results-contact-list-desktop.png` is the check: title left-aligned inside the column, three rows, Call on the trailing edge, gray page on both sides. Do not introduce a sidebar, a multi-column trade grid, or a wider card at `sm`, `md`, or `lg`. Delete the `sm:` / `lg:` layout switches in `app/page.tsx` and `BusinessCard` that build those layouts.

## Copy that must not appear on the homeowner path

Verified, vetted, top pick, featured, ProSite, “the right hand for every home project”, and the three feature-card titles.
