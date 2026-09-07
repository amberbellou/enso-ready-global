# Translation review log

Automated second-pass reviews of machine-translated language files (two independent verifiers per fix). Every key stays flagged machine-translated until a native speaker reviews it.

## es — 2026-09-07

Overall the Spanish is good: natural, plain, calm, mostly neutral Latin American usage, with correct hazard and disease terms (cólera, fiebre del Valle del Rift, deslizamientos de tierra, tifones/huracanes/ciclones by region) and correct lowercase month abbreviations. Placeholders are all intact. The systematic problems are: (1) the product name "ENSO Ready" was translated, breaking the proper-noun rule; (2) register drift, with four UI strings in tú (tienes, toca, prueba, elige) while everything else is usted; (3) region names that begin with a capitalised article ("El sur de China") are dropped into the "en {region}" slot mid-sentence, and the "expect" template's "en {region}" also fails for names without an article; (4) the shared confidence word "incierto" breaks agreement in "esta perspectiva es {conf}" (feminine noun). A handful of literal or slightly off word choices remain (pozo tapado for covered pit, lluvias de las ciruelas, mezclados for mixed, "las tiendas y la luz pueden faltar").

Proposed 31, applied 29.
- `ui.app_name` (high): Product name is a proper noun and must stay as in English (rule 7).
- `agreement_agree` (high): conf_uncertain is "incierto" (masculine) but "perspectiva" is feminine, so the filled sentence reads "esta perspectiva es incierto", a visible grammar error. The other templates use masculine "esto", so align this one.
- `regions.southern-china.name` (medium): Leading capitalised article breaks when the name is inserted mid-sentence; other region names have no article.
- `regions.northern-china-korea-japan.name` (medium): Leading capitalised article breaks when inserted mid-sentence; inconsistent with other names.
- `regions.eastern-australia.name` (medium): Leading capitalised article breaks when inserted mid-sentence; inconsistent with other names.
- `regions.southwest-australia.name` (medium): Leading capitalised article breaks when inserted mid-sentence; inconsistent with other names.
- `regions.southern-africa.name` (medium): Leading capitalised article breaks mid-sentence, and "sur de África" can be confused with Sudáfrica. "África austral" is the everyday term already used in the Tanzania note.
- `regions.northeast-brazil.name` (medium): Redundant: the Portuguese name is repeated as the Spanish word. Spanish is "Noreste"; keep "Nordeste" in parentheses as the proper name.
- `defer` (medium): "siga a {service}" reads like following a person; "avisos de alerta" is redundant and shifts between aviso and alerta. Should match always-official ("aviso").
- `agreement_weak` (medium): "mezclados" is a literal mistranslation (physically mixed); the meaning is that results varied.
- `ui.offline_note` (medium): Uses tú while the rest of the app uses usted (Vuelva, siga, Escriba, Toque, Guarde). Register must be consistent.
- `ui.mt_banner` (medium): Uses tú ("Toca") while the rest of the app uses usted.
- `ui.no_results` (medium): Uses tú ("Prueba") while the rest of the app uses usted.
- `ui.no_js` (medium): Uses tú ("elige tu") while the rest of the app uses usted.
- `steps.drought-store.text` (medium): "pozo" means a well; "pozo tapado" suggests sealing a well, the opposite of adding storage. A covered pit or cistern is "aljibe" or "hoyo tapado".
- `rain_mixed` (low): Word order makes it read as "mixed rain", and "señal mixta" is jargon. Needs to read naturally in the headline and in "suele tener {rain}".
- `steps.flood-raise.text` (low): "Suba del suelo" is unnatural; "levante del suelo" or "ponga en alto" is the everyday phrasing.
- `steps.hurr-kit.why` (low): "Las tiendas pueden faltar" is unnatural (shops do not "be missing"); the idea is shops closed and power cut.
- `steps.typh-kit.why` (low): Same unnatural phrasing as hurr-kit.why.
- `steps.cyc-kit.why` (low): Same unnatural phrasing as hurr-kit.why.
- `steps.seas-move.text` (low): "aleje ... los lugares donde duermen" is awkward (you cannot move a place) and switches from usted to an unclear "duermen".
- `steps.mild-pests.text` (low): "mata menos de ellos" is a calque; unclear referent for a low-literacy reader.
- `local_seasons.the plum rains and summer flood season` (low): "lluvias de las ciruelas" reads as rain of the plums (fruit). The established Spanish name for the East Asian meiyu is "lluvias de ciruela" (or "lluvias meiyu").
- `ui.forecast_unavailable` (low): "outlook" is rendered "perspectiva" everywhere else (defer, agreement_agree, always-official) but "panorama" here; keep one term so users learn the outlook/warning distinction.
- `hazards.CD` (low): The everyday and meteorological term is "olas de frío"; "días muy fríos" is vaguer and does not convey a spell.
- `hazards.HS` (low): In the Pacific-atoll context this means unusually high sea and swell reaching land; the everyday term is "marejadas". "olas altas en el mar" sounds like a condition only for boats.
- `regions.northern-china-korea-japan.el_nino_note` (low): "mezclada" is the wrong word for a mixed (unclear) signal; the rest of the file uses "mixta".
- `ui.dyslexia` (low): "fácil para la dislexia" is a calque and reads oddly; the usual UI label is "Espaciado apto para dislexia".
- `steps.water-reuse.text` (low): "en el baño" could be read as bathing; the source means flushing toilets.

## fr — 2026-09-07

The French is generally good: register is calm and plain, placeholders are all intact, months use standard CLDR short forms, El Niño / La Niña and disease terms (choléra, fièvre de la vallée du Rift) are correct, and most step texts read naturally for a general audience. The translator sensibly restructured the headline as "{name} : en {season}, {rain} — {conf}." to dodge French gender agreement between {rain} and {conf}; that is acceptable and I did not change it. The systematic problems are: (1) the four agreement_* sentences turn the confidence word into a label ("Niveau de confiance : probable"), which reads oddly because "probable" is not a level; (2) conf_leaning "plutôt probable" is not clearly distinct from "probable" for a low-literacy reader; (3) a handful of wrong-meaning slips (livelihood_urban says "village", "Nord-ouest du Pacifique" names the ocean rather than the US region, "mer agitée" for high sea levels, "courtes pluies" instead of the established "petites pluies"); (4) a few English calques ("récoltes ont échoué", "un feu contrôlé qui a échappé", "brume de fumée") and small terminology inconsistencies (épisode/événement, bulletin/document, clinique/centre de santé).

Proposed 27, applied 24.
- `ui.livelihood_urban` (high): "village" means a rural village in French, so a farmer in a village would pick the urban option; this changes which advice steps are shown.
- `hazards.HS` (medium): In this app "high seas" means unusually high sea level / king tides on atolls (see steps.seas-move), not rough seas. "mer agitée" = rough sea, a different hazard.
- `conf_leaning` (medium): "plutôt probable" is not clearly weaker than "probable" for an ordinary reader; the three confidence words must be clearly distinct and ordered. "possible" sits cleanly between "probable" and "incertain" and is the word French forecasters use.
- `agreement_agree` (medium): "Niveau de confiance : probable" is unnatural: a level is high or low, not "probable". The confidence word needs a masculine subject so "incertain" agrees.
- `agreement_disagree` (medium): Same issue: "Niveau de confiance : probable / incertain" reads as a mislabeled level rather than a sentence.
- `agreement_weak` (medium): Same "Niveau de confiance : probable" problem.
- `agreement_none` (medium): Same "Niveau de confiance : probable" problem.
- `local_seasons.the short rains` (medium): The established French term for the East African October-December rains is "les petites pluies" (the region note east-africa-short-rains already uses it). "courtes pluies" is a literal calque and is inconsistent with the rest of the file.
- `rain_mixed` (medium): "mélangé" means physically mixed; a mixed/unclear signal is "mitigé" (already used in the region notes: "Signal mitigé").
- `regions.southern-africa.el_nino_note` (medium): "les récoltes ont échoué" is an English calque; harvests are "perdues" or "très mauvaises" in French.
- `steps.fire-noburn.why` (medium): "qui a échappé" is incomplete in French (échapper needs "à" + object); the sentence reads as broken.
- `local_seasons.the second rains` (low): "les deuxièmes pluies" is a calque; French speakers say "la deuxième saison des pluies".
- `steps.flood-medical.text` (low): "médicaments de chaque jour" is unnatural; French says the medicines you take every day.
- `steps.droughtne-store.why` (low): "Là-bas" (over there) reads as if the writer is far away from the reader; the reader is in that area.
- `steps.mild-pests.text` (low): The detached ", plus nombreux" makes the sentence hard to parse for a plain-language reader.
- `steps.always-official.text` (low): "Ce document" is inconsistent with "bulletin" used for the briefing everywhere else (defer, ui.see_briefing, ui.share).
- `history_few` (low): Word-for-word structure is awkward, and "événements" clashes with "épisodes" used for ENSO events elsewhere (history, history_recent, timing_passed).
- `ui.forecast_unavailable` (low): "événements passés" is inconsistent with "épisodes" used for past El Niño / La Niña events elsewhere.
- `hazards.HZ` (low): "brume de fumée" is a literal calque nobody says; the everyday term is simply the smoke from fires.
- `regions.north-africa-mediterranean.el_nino_note` (low): French uses the article ("l'ENSO"), and "régulier" suggests frequency rather than consistency.
- `ui.no_results` (low): "une plus grande ville proche" is stilted; natural French puts the comparison and the location differently.
- `steps.bush-plan.text` (low): "service d'incendie" is administrative; ordinary readers say "les pompiers".
- `steps.cholera-ors.text` (low): In francophone Africa "clinique" usually means a private clinic; "centre de santé" is the everyday term and matches steps.flood-medical.why.
- `regions.northern-us-southern-canada.la_nina_note` (low): "la bande nord" is a calque of "northern tier" that French readers will not understand.

## ar — 2026-09-07

The Arabic is generally competent Modern Standard Arabic in a calm, plain register; most step texts and region notes read naturally and the hazard/disease terms are mostly correct (cholera, Rift Valley fever, flash floods as "سيول"). Four systematic problems need fixing. (1) "El Niño"/"La Niña" are left in Latin script in el_nino, la_nina, headline_neutral and ui.tagline, while the rest of the file already uses the established Arabic forms "النينيو"/"النينيا"; the Latin forms are inconsistent and create bidi breaks when dropped into {phase} slots. (2) The confidence system was restructured as "مستوى الثقة: {conf}" (confidence level: ...) but the conf words are still adjectives ("likely"), so "مستوى الثقة: مُرجَّح" and "مستوى الثقة: ميل إلى ذلك" read as category mismatches; I propose the frame "هذا التوقع {conf}" with مُرجَّح > مُرجَّح إلى حد ما > غير مؤكد, which is clearly ordered and survives slot filling in headline and all four agreement_* strings. (3) The word "إشارة" (signal) is used as jargon across rain_mixed and about a dozen region notes ("الإشارة ضعيفة", "لا توجد إشارة موثوقة"); farmers will not read it as "effect"; the plain word is "تأثير". I list the main ones below; apply the same replacement to any I did not reach. (4) Two geography errors would actively mislead Arab readers: "ساحل الخليج" (Gulf coast) will be read as the Arabian/Persian Gulf, and "شمال غرب المحيط الهادئ" means the northwest of the Pacific Ocean rather than the US Pacific Northwest. Minor: tanween is written inconsistently (مطرًا vs مطراً); "Southern Africa" is rendered in a way that reads as the country South Africa. Months, list separators, RTL punctuation and placeholders are otherwise intact, with one exception: "لـ{season}" in forecast uses a tatweel that produces "لـالشتاء" once the slot is filled.

Proposed 40, applied 10.
- `forecast_weak` (low): "الحالة الطبيعية" breaks the consistent term "المعتاد" used for "normal" everywhere else.
- `rain_mixed` (low): "إشارة" (signal) is jargon for low-literacy readers and reads oddly in the headline slot ("إشارة أمطار متباينة في الشتاء").
- `regions.altiplano.la_nina_note` (low): Jargon: "signal" rendered literally as إشارة; the plain meaning is "effect".
- `regions.gulf-of-guinea.el_nino_note` (low): Jargon (إشارة موثوقة); plain readers will not understand a "reliable signal".
- `regions.gulf-of-guinea.la_nina_note` (low): Jargon; same fix applies to central-africa.la_nina_note, north-africa-mediterranean.la_nina_note and both russia-siberia notes, which use the identical string.
- `regions.central-africa.el_nino_note` (low): Jargon (إشارة المطر).
- `regions.southwest-australia.el_nino_note` (low): Jargon (الإشارة); also southwest-australia.la_nina_note and sri-lanka-south-india.la_nina_note ("إشارة ضعيفة") should become "التأثير ضعيف."
- `regions.southeast-brazil.el_nino_note` (low): Jargon (إشارة المطر); the matching "إشارة مختلطة" in southeast-brazil.la_nina_note and tanzania-south-mozambique-north.la_nina_note should become "التأثير مختلط."
- `regions.northern-china-korea-japan.el_nino_note` (low): Jargon (إشارة الصيف).
- `regions.southern-china.la_nina_note` (low): Jargon (الإشارة).

## zh — 2026-09-07

Overall this is a good machine translation: the register is calm, plain and respectful, sentences are short, hazard and disease terms (洪水、山洪、滑坡、霍乱、裂谷热、干旱、台风、飓风) are the correct everyday words, month forms are standard, all placeholders are preserved, and there is no leftover English outside proper nouns. The one systematic defect is slot grammar around the confidence words: the headline and the four agreement_* sentences wrap {conf} in "把握是{conf}" / "按{conf}来看待", which yields unnatural output like "把握是可能性较大" or "请按略有偏向来看待". The fix below moves {conf} to the end of the sentence as a short predicate, with confidence words re-chosen so the three levels stay distinct and ordered (可能性较大 > 有一定倾向 > 还不确定). Two other templates ("expect", "history") also glue a clause-shaped placeholder into a noun slot. Secondary systematic points: "气旋" on its own is meteorological jargon in Chinese (ordinary people say 热带气旋), and "太平洋西北地区" is a calque that Chinese readers will read as the northwest Pacific Ocean near Japan rather than the US Pacific Northwest. A few small consistency issues (亚马逊/亚马孙, 正常/常年, 山洪/突发洪水) are listed as low.

Proposed 31, applied 0.

## ru — 2026-09-07

The Russian is generally good: calm, plain, natural word order, correct hazard and disease terms (холера, лихорадка Рифт-Валли, оползни, внезапные паводки), correct meteorological forms Эль-Ниньо / Ла-Нинья, and placeholders are intact throughout. The most serious problems are in the confidence scale: "неточно" means "inaccurate" (wrong meaning) and "склоняется к этому" cannot follow "Оценка:", so the three levels are neither natural nor clearly ordered. A stray Latin letter "y" in "ямy" is a real typo. Several slot strings break Russian number/case agreement ("через 2 месяцев", "рядом с Москва"). A few regional notes use MT calques ("зимы склоняются к мягким", "сезон дождей склонен быть слабее", "склонность к"), the Kenyan "short rains" is rendered literally instead of the Russian geographic term "малый сезон дождей", "canícula" is left untranslated, and "струйное течение" is jargon for the target readership. Minor inconsistencies remain between "обзор"/"сообщение", "закономерность"/"картина", and the month abbreviations.

Proposed 34, applied 11.
- `conf_uncertain` (high): Wrong meaning: "неточно" means "inaccurate/imprecise", not "uncertain". Also reads oddly after "Оценка:".
- `conf_leaning` (high): Does not fit the template "Оценка: {conf}" ("Оценка: склоняется к этому" is ungrammatical) and is not clearly weaker than "вероятно". Standard Russian ordering is вероятно > возможно > неясно.
- `steps.drought-store.text` (high): The last word contains a Latin letter "y" instead of Cyrillic "у" ("ямy"). It renders wrongly in some fonts, breaks search and screen readers.
- `local_seasons.the rainy season and canícula` (medium): Leftover untranslated Latin-script word; a Russian reader does not know "canícula". The region note already explains it as the mid-summer dry spell.
- `timing_coming` (medium): Number agreement breaks: "через 2 месяцев", "через 3 месяцев", "через 4 месяцев" are ungrammatical (need "месяца"). The abbreviation avoids the problem for every number.
- `history` (medium): Number agreement breaks for n = 2, 3, 4 ("за последние 3 сильных событий" is ungrammatical). Restructuring so the number stands after a colon works for any n.
- `ui.near` (medium): "рядом с" requires the instrumental case, but the place name is inserted in nominative ("рядом с Москва", "рядом с Астана"). A construction that keeps the name in nominative is needed.
- `status_line` (medium): "Обстановка в мире" reads like world news or the political situation, not the global ENSO state.
- `regions.us-pacific-northwest.name` (medium): Drops the country: a reader cannot tell which Pacific coast is meant. Russian has an established form "Тихоокеанский северо-запад США".
- `local_seasons.the short rains` (medium): Literal calque. In Russian geography the East African October–December season is called "малый сезон дождей" (and March–May "большой"). "Короткие дожди" sounds like brief showers.
- `regions.east-africa-short-rains.la_nina_note` (medium): Same calque "короткие дожди".

## pt — 2026-09-07

The Brazilian Portuguese is generally good: plain, calm, short sentences, correct hazard and disease terms (enchentes, enxurradas, deslizamentos, cólera, febre do Vale do Rift, tufão/furacão/ciclone by region), placeholders intact, month short forms correct, El Niño/La Niña as used by INMET/CPTEC. The systematic problems are in the slot-filled sentences: the confidence word "tendência nesse sentido" is a phrase, not a label, so it breaks both the headline and the four "trate esta previsão como {conf}" templates, and "incerto" does not agree in gender with "previsão" in those same templates. There are also a few meaning slips (poço for "pit", "leve os lugares de dormir"), some agronomy/meteorology jargon (extensão rural, vazão, cultura/cultivo, planalto alto), a "misturado/misto" inconsistency for "mixed signal", and the word for the briefing itself switches between "boletim" and "informativo".

Proposed 31, applied 0.

## id — 2026-09-07

Overall the Indonesian is good: plain, calm, consistent "Anda" register, correct everyday hazard terms (banjir bandang, tanah longsor, kolera, kabut asap, topan/siklon), correct month short forms, placeholders intact everywhere. The one systematic problem is the confidence slot: the headline was rewritten to put {conf} in parentheses, and conf_leaning ("condong ke arah itu") is a literal calque that reads as "leaning toward that" with no referent; the four agreement_* strings were then bent into "tingkat keyakinannya: {conf}" to make the words fit. The fix below changes the three conf words to verb phrases that can sit after {rain} in the headline and after "perkiraan ini" in the agreement lines, so these eight keys must be changed together. Other defects: one leftover English word ("hurricane"), a few sentences whose grammar or meaning slipped (flash-avoid.why, slide-move "tempat tidur" = bed, "buang air" reads as a toilet phrase), and minor inconsistencies ("monsun" in regions vs "muson" in local_seasons; "Cile" vs the standard "Chili"; "perkiraan"/"prakiraan" and "ringkasan"/"penjelasan" for the same thing).

Proposed 32, applied 27.
- `steps.hurr-kit.text` (high): Leftover English word "hurricane"; Indonesian just says "badai" (typhoon = topan, cyclone = siklon are already used in the sibling keys).
- `conf_leaning` (high): Literal calque: "leaning toward that" has no referent in Indonesian and cannot fill the headline slot; must be a phrase that follows {rain} naturally and is clearly weaker than conf_likely but stronger than conf_uncertain. Change together with headline, conf_likely, conf_uncertain and the four agreement_* keys.
- `headline` (high): Confidence was pushed into parentheses because the conf words did not fit; a native writer would not do this. With the new conf phrases the sentence reads naturally: "Jakarta: hujan lebih sedikit dari biasanya kemungkinan besar terjadi pada musim kemarau."
- `conf_uncertain` (medium): Same slot-grammar fix as the other two confidence words so the three stay parallel and ordered: kemungkinan besar terjadi > cenderung terjadi > belum pasti terjadi.
- `agreement_agree` (medium): Bureaucratic "tingkat keyakinan ...: {conf}" construction; with the new conf phrases the plain form works.
- `agreement_disagree` (medium): "tidak jelas cocok" is unnatural and the colon construction is bureaucratic.
- `agreement_weak` (medium): Colon construction; "bercampur" for mixed results is odd (tidak seragam is the everyday word).
- `rain_mixed` (medium): Meaningless to an ordinary reader ("mixed rain signs") and clumsy inside the headline and expect templates.
- `steps.flash-avoid.why` (medium): Broken grammar: "korban meninggal ... terjadi" has no valid subject-verb structure.
- `steps.slide-move.text` (medium): "tempat tidur" means a bed; the reader may think they should buy a safer bed rather than sleep somewhere else.
- `steps.disease-mosquito.text` (medium): "Buang air" is the everyday phrase for going to the toilet; the sentence reads badly at first glance.
- `steps.heat-hours.text` (medium): Loses "early" and "late"; "pagi hari" can mean 9-10 am, which is already hot.
- `regions.central-chile.name` (low): Standard Indonesian form of the country name is "Chili" (KBBI, Kemlu, media).
- `regions.india-monsoon.name` (low): Inconsistent term: local_seasons uses "muson" (KBBI form) while regions use "monsun".
- `regions.india-monsoon.el_nino_note` (low): "monsun" vs "muson" inconsistency.
- `regions.india-monsoon.la_nina_note` (low): "monsun" vs "muson" inconsistency.
- `regions.sri-lanka-south-india.name` (low): "monsun" vs "muson" inconsistency (local_seasons has "muson timur laut").
- `regions.mainland-southeast-asia.el_nino_note` (low): "monsun" vs "muson" inconsistency.
- `regions.mainland-southeast-asia.la_nina_note` (low): "monsun" vs "muson" inconsistency.
- `steps.drought-plant.why` (low): Abstract "risiko terbagi" is hard for a low-literacy reader; say concretely what is spared.
- `steps.water-schedule.why` (low): "Dengan tahu harinya" is colloquial-ungrammatical, and the second clause is circular (you run out of water when the tap is empty). Everyday term for rationing is "menggilir".
- `steps.cold-heat.why` (low): "Serangan" (attack) is slightly dramatic for the calm register.
- `steps.always-official.text` (low): Inconsistent with "defer": the briefing is "ringkasan" elsewhere, and "perkiraan"/"prakiraan" alternate; "lembaga" is the usual word for a service/agency.
- `defer` (low): Use "prakiraan musiman" (the BMKG term, and the one used in ui.forecast_unavailable and forecast) consistently.
- `local_seasons.the plum rains and summer flood season` (low): "hujan plum" is a word-for-word rendering that means nothing to an Indonesian reader.
- `hazards.WF` (low): Bare "kebakaran" suggests house fires; the everyday term for El Niño-season fires in Indonesia is "kebakaran hutan dan lahan".
- `ui.read_aloud` (low): Redundant ("bacakan" already means read aloud); unnatural as a button label.

## hi — 2026-09-07

The Hindi is generally good: register is calm and mostly colloquial (ज़्यादा/कम/बारिश rather than Sanskritic vocabulary), placeholders are all preserved, and the steps read like advice a neighbour would give. Systematic problems: (1) slot grammar — region names ending in "इलाका" break when "{region} में" is filled ("तटीय इलाका में"), and "this_area" is in the direct case where the only slot it fills needs the oblique; (2) a few meteorological terms are either academic ("उष्णकटिबंधीय तूफ़ान", "अग्निशमन सेवा", "शरण-स्थल") or calqued ("फ़सल पर दबाव", "छोटी बारिश", "बिल्ड-अप", "प्लम रेन्स"); (3) one outright wrong meaning ("सिलाई-बंदी" for insulation); (4) inconsistent spellings ("एल नीनो" vs "अल नीनो", "टेक्सस", "नोर्देस्ते/नॉर्देस्ते", "अक्तू" vs "अक्टूबर"); (5) the month abbreviations are cryptic without the ॰ sign and Hindi month names are short enough to spell out. The confidence phrases are distinct and correctly ordered, and the two-sentence headline rewrite is a sensible Hindi solution. One further note not filed as a finding: local season names of the form "X का मौसम" would need "X के मौसम में" if ever placed directly before "में"; because they appear inside the "{season} ({local})" parenthesis this is tolerable, but "बरसाती मौसम" would be safer if the templates change.

Proposed 40, applied 18.
- `steps.cold-heat.text` (high): "सिलाई-बंदी" is not a Hindi word for insulation; it reads as "sewing-closing" and is meaningless. Wrong meaning.
- `this_area` (high): This value fills the {region} slot in "expect" ("{region} में"), producing "यह इलाका में", which is ungrammatical. Hindi needs the oblique before में.
- `regions.peru-ecuador-coast.name` (high): Name ends in "इलाका"; when dropped into "{region} में" it gives "तटीय इलाका में", which is ungrammatical. Use a noun that does not inflect.
- `regions.southern-china.name` (high): Same slot problem: "यांग्त्ज़ी नदी का इलाका में" is ungrammatical after "{region} में".
- `steps.droughtne-store.why` (high): "एल नीनो" contradicts the app-wide spelling "अल नीनो" (the form used by IMD and Hindi media). Inconsistent term for the phenomenon.
- `hazards.TC` (high): "उष्णकटिबंधीय" is textbook vocabulary that low-literacy readers will not know. Everyday Hindi (and IMD bulletins for the public) say "चक्रवाती तूफ़ान".
- `hazards.TCE` (high): Same jargon as TC, and the relative clause with subjunctive "पहुँचें" is awkward in a list.
- `regions.central-america-dry-corridor.el_nino_note` (high): Leftover Latin-script English/Spanish inside a Hindi sentence ("canícula", "Dry Corridor").
- `regions.northern-china-korea-japan.el_nino_note` (medium): "सर्दियों का झुकाव हल्की गर्मी की ओर" (winters lean toward mild heat) is confusing and reads like a contradiction.
- `regions.northern-china-korea-japan.la_nina_note` (medium): Same abstract "झुकाव ... की ओर" construction; unnatural for a plain reader.
- `ui.step_of` (medium): Word order is unnatural once numbers are filled ("कदम 2, कुल 5 में से"). Hindi puts the whole before the part.
- `ui.see_briefing` (medium): "मेरी जानकारी" reads as "my personal information", not the outlook for my place.
- `defer` (medium): "मौसम का अनुमान" means a weather forecast, which blurs the exact distinction the sentence is making (seasonal outlook vs warning). "always-official" uses "मौसमी अनुमान"; keep them consistent. "{service} को देखें" (look at the agency) is also odd with an agency name.
- `hazards.CS` (medium): Calque; farmers do not say "दबाव" for stressed crops. Everyday term is crops being harmed/weakened.
- `regions.southeast-south-america.la_nina_note` (medium): Same calque "फ़सल पर दबाव".
- `hazards.CF` (medium): "नष्ट" is Sanskritic register; the steps already use "फ़सल खराब होना". Everyday word is बर्बाद/खराब.
- `regions.east-africa-short-rains.el_nino_note` (medium): "छोटी बारिश ... भारी रहती है" (small rain is heavy) reads as a contradiction.
- `regions.east-africa-short-rains.la_nina_note` (medium): Same "छोटी बारिश" term; "नाकाम रहती है" is also an unusual verb for rain.

## bn — 2026-09-07

The Bengali is generally good: plain, calm, Bangladesh-standard vocabulary (পানি, খাবার স্যালাইন, আবহাওয়া অধিদপ্তর), and almost every placeholder is intact. The real problems are a handful of meaning/term errors (South Africa the country instead of Southern Africa the region; "হারিকেন" which to most Bengali readers means a kerosene lantern; বরফ/ice for snow), one confidence word ("ঝোঁক এই দিকে") that does not read as a clear middle step between "সম্ভাবনা বেশি" and "অনিশ্চিত", a couple of slot strings that are clunky when numbers are dropped in (step_of, forecast_partial, updated), and leftover Latin-script terms (canícula, Dry Corridor, ENSO). There are also three systematic consistency slips a native editor would tidy: "মরসুম" (West Bengal form) is used in local_seasons while everything else uses "মৌসুম", so slotting produces things like "শুকনো মরসুম মৌসুমের"; "signal" is rendered variously as লক্ষণ / সংকেত / ইঙ্গিত / প্রভাব; and well is কুয়া in most places but কূপ in salt-store. Month abbreviations are acceptable apart from "ফেব" (standard short form is "ফেব্রু").

Proposed 40, applied 0.

## sw — 2026-09-07

The Swahili is generally understandable, calm and mostly in the right everyday register; placeholders and month short forms are all intact, and hazard/disease terms (kipindupindu, Homa ya Bonde la Ufa, ukame, maporomoko ya ardhi, vimbunga) are largely correct. The biggest problem is the confidence system: the three conf values are adjectival "yenye/isiyo" phrases that do not read naturally after a rain phrase in the headline or after "ni/kuwa" in the agreement sentences, and "yenye mwelekeo huo tu" ("only that direction") is unclear and not obviously weaker than "likely". A second systematic issue is terminology drift: "pattern" is rendered "mtindo" (style/fashion) throughout the agreement and forecast strings, "outlook" is "mtazamo" in one place and "mwelekeo" in another, "warning" alternates between "onyo" and "tahadhari", "flash floods" alternates between "mafuriko ya kasi" and "mafuriko ya ghafla", "briefing" alternates between "taarifa" and "muhtasari", and "spring" between "kuchipua" and "machipuko". One outright meaning error: "Afrika ya Kusini" (the country South Africa) used for "Southern Africa". Several Bantu noun-class agreement slips (mahali ... linalofanana, mifugo wagonjwa, boti ... wakiwa) and some literal calques ("mvua za plum", "ukingo wa joto" for insulation, "vitu vilivyo huru" for loose items) should be fixed. If the conf fixes below are adopted, agreement_agree must drop the "ni" and the other agreement strings must move "kuwa" before "taarifa hii", as shown.

Proposed 40, applied 29.
- `conf_leaning` (high): "tu" means "only", and "mwelekeo huo" has no referent in the headline; a reader cannot tell this is weaker than "likely". Not clearly ordered or distinct.
- `agreement_none` (high): "kuwa {conf}" breaks with the corrected verb-phrase conf values.
- `regions.tanzania-south-mozambique-north.el_nino_note` (high): "Afrika ya Kusini" is the country South Africa. The region is Southern Africa, which the region name itself renders as "Kusini mwa Afrika". Wrong meaning.
- `forecast` (medium): "wa majira" (of seasons) is wrong here; and "unasema 20% juu ya kawaida" is unnatural. "unaonyesha mvua ya {pct}" reads well with all pct values ("karibu na kawaida", "20% juu ya kawaida").
- `local_seasons.the plum rains and summer flood season` (medium): Leftover English "plum"; meaningless to a Swahili reader. Use the local name (Meiyu) with a plain gloss.
- `hazards.FF` (medium): "mafuriko ya ghafla" is the everyday and media term for flash floods (and is already used in regions.southwest-asia). "ya kasi" (fast) is a calque.
- `steps.flash-avoid.why` (medium): Same term inconsistency as hazards.FF.
- `regions.east-africa-short-rains.el_nino_note` (medium): "Mvua fupi" (short rain) is a literal calque; Kenyans and Tanzanians call the Oct–Dec season "mvua za vuli", which the file itself uses in local_seasons.
- `regions.east-africa-short-rains.la_nina_note` (medium): Same "mvua fupi" calque; "hukosa kunyesha" is the natural way to say rains fail.
- `steps.cold-heat.text` (medium): "ukingo wa joto" (edge/bank of heat) does not mean insulation; "kupasha moto" is for heating food, "kupasha joto" for heating a room.
- `steps.mild-pests.text` (medium): "Tazama wadudu wengi zaidi" (look at more insects) is not the intended "expect/watch out for"; second clause is clumsy.
- `steps.flood-route.why` (medium): Ungrammatical structure ("deciding ... is when people get hurt" calqued word for word). Plain restatement needed.
- `steps.storm-trees.text` (medium): "vitu vilivyo huru" means "free/liberated things"; "loose" in this sense is "vilivyolegea" or things that can be blown away.
- `ui.no_results` (medium): Noun-class error: "mahali" (class 16) cannot take "linalofanana". Simpler to say no town matched.
- `ui.forecast_unavailable` (medium): "Utabiri wa mfumo wa msimu" (forecast of the season's system) misparses the English; "mtazamo" means viewpoint, "mtindo" means style.
- `defer` (medium): "mtazamo" = viewpoint, not outlook; "onyo/maonyo" here but "tahadhari" everywhere else in the steps. Unify on "tahadhari" and use "matarajio" for outlook.
- `steps.always-official.text` (medium): "outlook" rendered "mwelekeo" here and "mtazamo" in defer; should match. Word order "kwa tahadhari" also reads as "carefully".
- `hazards.TC` (medium): Calque; East African media and met services say "vimbunga" for tropical storms/cyclones, and the steps and region notes already use "vimbunga". A farmer will not connect "dhoruba za tropiki" with the "vifaa vya kimbunga" steps.
- `hazards.TCE` (medium): Same term issue as hazards.TC.
- `history` (medium): "makali" (sharp/severe) is dramatic for "strong"; "ilikuwa wastani wa karibu na kawaida" is awkward when pct = "karibu na kawaida"; "juu ya kawaida" for "wetter" loses the rain reference.
- `steps.typh-boats.why` (low): "wakiwa" is class 2 (people) but the subject is "boti"; "majini" also means "spirits" in some readings. Repetitive.
- `steps.hurr-shelter.text` (low): "kilicho" (class 7) does not agree with "mahali" (class 16); should be "palipo".
- `steps.fire-noburn.why` (low): "moto uliopangwa ambao ulitoroka" (a planned fire that ran away) is a calque; "escaped" for fire is "ulisambaa/ulitoka nje ya udhibiti".
- `steps.disease-water.text` (low): "tibu" (treat a patient) is odd for water; the everyday phrase is "weka dawa" (add treatment chemicals).
- `hazards.HS` (low): Context (seas-move step) is high sea level / king tides on atolls, not big waves. "Big waves" changes the meaning.
- `regions.central-pacific-islands.el_nino_note` (low): "kina cha bahari" is sea depth, not sea level; the seas-move step correctly uses "usawa wa bahari".
- `steps.drought-seed.why` (low): "kabla ... zisimame" is not standard; the natural form is "kabla mvua hazijaisha".
- `ui.share` (low): "briefing" is "taarifa" everywhere else (see_briefing, defer, agreement_*); "muhtasari" (summary) here and in offline_note is inconsistent.
- `regions.hawaii.el_nino_note` (low): "mwishoni wa" should be "mwishoni mwa" (same slip in regions.philippines.el_nino_note: "mwishoni wa mwaka").
