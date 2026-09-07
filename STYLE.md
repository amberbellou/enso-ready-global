# Editorial standard

This standard covers every string a person can read: briefings, buttons, banners, radio scripts, SMS text, governance pages, GitHub issue templates and error messages. It applies in every language. Source strings live in `i18n/en.json`. Reviewers check this file before merging any change to a string.

## Who we write for

Someone on a slow phone, at night, worried about the coming season. They may have ADHD, dyslexia, low literacy, or no time. Stress makes everyone read worse. Write for that reader.

## Register

- Calm. State the fact, then the action.
- No exclamation marks. Anywhere.
- No marketing. No "powerful", "cutting-edge", "trusted by".
- No legal text longer than the point needs.
- No jokes, no idioms, no metaphors. They break under translation.
- Headings are questions or plain labels: "Where do you live?", "What to do now", "Sources".
- Reading age about 12. Easy Read mode: about 10.

## Sentences

- Target 15 words or fewer. Hard limit 25.
- One idea per sentence.
- Bullets in groups of 3 to 5.
- Active voice. "Store water now", not "Water should be stored".
- Literal words. Say "less rain than usual", not "a dry spell looms".
- Use the same word for the same thing every time. Rain is "rain", not "precipitation" in one place and "rainfall" in another.
- Numbers as digits: "3 events", "40% below normal".
- Verb-labelled buttons: "See my briefing", "Next step".

## Banned words and patterns

The lint fails on any of these in user-facing strings. Add to the list; do not remove from it.

| Banned | Use instead |
|---|---|
| urgent, urgently, immediately, act now, right away, hurry | "now", "this week", or a plain date |
| deadly, catastrophic, devastating, disaster looms, crisis, chaos | name the hazard: "flooding", "crop loss", "less water" |
| warning, alert (as our own claim) | "outlook", "signal"; warnings come only from the national service |
| ALL-CAPS words or phrases | sentence case |
| countdowns, "days left", timers | a date or a season name |
| sirens, red full-screen takeovers, flashing, sound | colour + icon + one calm word |
| "you must", "failure to", "at risk of death" | "we suggest", "this helps because" |
| "AI-powered", "smart", "revolutionary" | say what the thing does |
| exclamation marks, multiple question marks, ellipses | full stops |
| "X million people at risk" | never shown; population data is internal only |

The exception is a quote from an official source. Quote it exactly, name the source, and keep it short.

## Probability wording

Only three confidence words exist. No others may appear in any language.

| Word | When the engine uses it |
|---|---|
| likely | the reviewed regional pattern is high confidence and the local rain record does not contradict it |
| leaning that way | pattern and local record partly agree, or a high-confidence pattern is contradicted locally |
| uncertain | low-confidence pattern, no local record, or past events here disagreed |

The live seasonal forecast moves the word one step up or down. Nothing moves it two steps.

Do not write "very likely", "almost certain", "probably", "may", "could", "expected to". Do not give percentages as a confidence claim. Percentages describe the past record only: "wetter than normal in 4 of 5 events".

[Numeric probability thresholds for each band are not yet defined in the repo. Until they are, the bands follow the engine rules above.]

## Every number has a source

A number appears only if the briefing can name where it came from and when. Every briefing ends with a "Sources" block. The rule per number:

- past rainfall change: CHIRPS or GPCP, with the number of events and the baseline years;
- current global status: NOAA CPC, with the issue date;
- this season's forecast: ECMWF SEAS5 via Open-Meteo, with the fetch date;
- fewer than three past events: no average is shown. Write "not enough past events to give a local average".

Never round a sourced number into a vaguer claim. "40% below normal" stays "40% below normal", not "far below normal".

## Templates that translate

Templates are fixed sentences with `{slot}` placeholders. The engine fills the slots. The rules:

1. Slot names are lowercase English words in curly braces: `{name}`, `{season}`, `{n}`, `{conf}`. Never rename a slot in a translation.
2. A slot holds a noun, a number or a short phrase. Never a whole clause or a verb.
3. One sentence per template key. Do not join two sentences in one string.
4. Do not build sentences from fragments. Write `"{name}: {rain} is {conf} in {season}."`, not `"is" + conf + "in"`. Word order differs by language.
5. Plural forms get separate keys where the language needs them. Do not write "event(s)".
6. Keep punctuation inside the template, not in the slot value.
7. No idioms, no wordplay, no cultural references.
8. Hazards, phases and confidence are codes, and their labels are separate keys. Never put an English label into a data file.
9. Season names may be local ("the short rains", "kiremt"). They come from the country override file, not from the template.
10. When the English source changes, `scripts/i18n-diff.js` lists the keys to re-translate. Do not edit other languages by hand for an English change.

## How machine-translated text is labelled

- Each language file carries `_status`: `source`, `machine` or `reviewed`.
- Each translated key carries `mt: true` until a named reviewer clears it.
- Any page with `mt` keys shows the banner in that language: "Machine-translated. Tap to suggest a fix." The tap opens a GitHub issue.
- A language becomes `reviewed` only when a native speaker has checked every key. [Reviewer sign-off record: location in the repo to be decided.]
- Never remove the banner to make a page look finished.

## Examples

Good:

- "Nairobi: more rain than usual is likely in Oct to Dec."
- "Flood risk is higher than normal. Here are 3 things to do."
- "In the last 5 strong El Niño events, rain here averaged 40% above normal."
- "For warnings, follow the Kenya Meteorological Department."
- "You are offline. Showing your last briefing from 3 Sep 2026."

Bad, and why:

- "URGENT: Devastating floods expected!" Caps, banned words, exclamation mark, not sourced.
- "Rain will almost certainly be well above normal." Confidence word not in the list.
- "Batten down the hatches before the storm hits." Idiom; will not translate.
- "Millions at risk as El Niño tightens its grip." Population claim, metaphor, drama.
- "Precipitation anomalies may exceed seasonal climatological norms." Jargon, 9 syllables in one word, reading age too high.
- "You must act immediately to protect your family." Command, urgency, fear.

## Reviewer checklist

Run this before merging any string change. Every box must be ticked.

- [ ] No exclamation marks, no all-caps, no ellipses.
- [ ] No word from the banned list.
- [ ] Every sentence 15 words or fewer, or a stated reason.
- [ ] One idea per sentence; one sentence per template key.
- [ ] Every number has a named source and a date.
- [ ] Confidence uses only "likely", "leaning that way", "uncertain".
- [ ] Every risk statement is followed by an action.
- [ ] Slot names match `en.json` exactly; no slot added, dropped or renamed.
- [ ] No idiom, metaphor, joke or cultural reference.
- [ ] Headings are a question or a plain label.
- [ ] No claim of official status, endorsement or warning authority.
- [ ] Deferral to the national meteorological service is intact.
- [ ] Changed English keys are listed by `scripts/i18n-diff.js` and marked `mt: true` in other languages.
- [ ] Reading-level check passes on English source. [CI script name to be confirmed.]
- [ ] Read the string aloud once. If it sounds like a news anchor, rewrite it.
