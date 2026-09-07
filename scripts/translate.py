"""Template translation (Phase 2, Annex C.2.1): translate i18n/en.json into a target language.

Only the sentence TEMPLATES are translated, once. {slot} placeholders are preserved verbatim.
Every translated key is stamped mt:true by scripts/i18n-diff.js until a native speaker reviews it.
Usage:  .venv/bin/python scripts/translate.py es fr ar zh ru      (any list of language codes)
Reads the API key from ANTHROPIC_API_KEY or from .env (ANTHROPIC_API_KEY=...). Never commits it.
Cost guard: prints a token estimate first; aborts if a single language would exceed MAX_USD.
"""
import json, os, pathlib, subprocess, sys, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
MAX_USD = float(os.environ.get("TRANSLATE_MAX_USD", "2.00"))
MODEL = "claude-opus-5"
LANGS = {"es": ("Spanish", "ltr", "Español"), "fr": ("French", "ltr", "Français"), "ar": ("Arabic (Modern Standard)", "rtl", "العربية"),
         "zh": ("Chinese (Simplified)", "ltr", "中文"), "ru": ("Russian", "ltr", "Русский"), "pt": ("Portuguese (Brazil)", "ltr", "Português"),
         "id": ("Indonesian", "ltr", "Bahasa Indonesia"), "hi": ("Hindi", "ltr", "हिन्दी"), "bn": ("Bengali", "ltr", "বাংলা"), "sw": ("Swahili", "ltr", "Kiswahili"),
         "vi": ("Vietnamese", "ltr", "Tiếng Việt"), "tl": ("Filipino (Tagalog)", "ltr", "Filipino"), "am": ("Amharic", "ltr", "አማርኛ"), "my": ("Burmese", "ltr", "မြန်မာ"),
         "th": ("Thai", "ltr", "ไทย"), "ur": ("Urdu", "rtl", "اردو"), "ne": ("Nepali", "ltr", "नेपाली"), "si": ("Sinhala", "ltr", "සිංහල"), "ta": ("Tamil", "ltr", "தமிழ்"),
         "km": ("Khmer", "ltr", "ខ្មែរ"), "lo": ("Lao", "ltr", "ລາວ"), "ja": ("Japanese", "ltr", "日本語"), "ko": ("Korean", "ltr", "한국어"), "fa": ("Persian", "rtl", "فارسی"),
         "so": ("Somali", "ltr", "Soomaali"), "ti": ("Tigrinya", "ltr", "ትግርኛ"), "mg": ("Malagasy", "ltr", "Malagasy"), "ht": ("Haitian Creole", "ltr", "Kreyòl ayisyen"),
         "tpi": ("Tok Pisin", "ltr", "Tok Pisin"), "ha": ("Hausa", "ltr", "Hausa"), "bm": ("Bambara", "ltr", "Bamanankan"), "wo": ("Wolof", "ltr", "Wolof"),
         "sm": ("Samoan", "ltr", "Gagana Sāmoa"), "to": ("Tongan", "ltr", "Lea faka-Tonga"), "fj": ("Fijian", "ltr", "Na Vosa Vakaviti"), "bi": ("Bislama", "ltr", "Bislama")}

def load_env():
    p = ROOT / ".env"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"'))

SYSTEM = """You translate the user-interface strings and sentence templates of a public-service app that explains El Niño / La Niña seasonal outlooks to ordinary people, including farmers and people with low literacy, on low-end phones.
Rules (non-negotiable):
1. Keep every {placeholder} exactly as written, including braces and the English word inside. Never translate, reorder-delete, or add placeholders. Placeholders stand for numbers, place names, seasons or already-translated phrases.
2. Plain language, about a 12-year-old's reading level. Short sentences. Literal, concrete words. No idioms, no metaphors, no jargon.
3. Calm, respectful tone. Never dramatic. Never all-caps.
4. Keep the meaning exact, including hedges: 'likely', 'leaning that way', 'uncertain' must stay clearly distinct and calibrated in the target language.
5. Keep punctuation style natural for the language. Keep emoji as they are.
6. Month names: standard short forms of the language. Keep 'El Niño' and 'La Niña' as the terms used by meteorologists in that language.
7. Output ONLY a JSON object mapping each input key to its translation. Same keys, no extras, no commentary."""

def flat(o, p=""):
    out = {}
    for k, v in o.items():
        if k.startswith("_"): continue
        if isinstance(v, dict): out.update(flat(v, p + k + "."))
        else: out[p + k] = v
    return out

def needs(lang):
    r = subprocess.run(["node", str(ROOT / "scripts/i18n-diff.js"), lang], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)["needs_translation"]

def chunks(d, n=60):
    items = list(d.items())
    for i in range(0, len(items), n): yield dict(items[i:i + n])

def slots(s): return sorted(re.findall(r"\{(\w+)\}", str(s)))

def translate(client, lang_name, batch):
    import anthropic
    payload = json.dumps(batch, ensure_ascii=False, indent=1)
    with client.messages.stream(model=MODEL, max_tokens=32000, system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
                                messages=[{"role": "user", "content": f"Target language: {lang_name}.\nTranslate the values of this JSON object:\n{payload}"}]) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason == "refusal": raise RuntimeError("model refused")
    text = "".join(b.text for b in msg.content if b.type == "text").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    return json.loads(text), msg.usage

def main(langs):
    load_env()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("No ANTHROPIC_API_KEY. Put ANTHROPIC_API_KEY=sk-ant-... in .env (git-ignored) or export it.", file=sys.stderr); sys.exit(2)
    import anthropic
    client = anthropic.Anthropic()
    en = json.loads((ROOT / "i18n/en.json").read_text())
    for lang in langs:
        if lang not in LANGS: print(f"unknown language {lang}", file=sys.stderr); continue
        name, direction, native = LANGS[lang]
        todo = needs(lang)
        # arrays (months) are translated as a joined string then split back
        arrays = {k: v for k, v in flat(en).items() if isinstance(v, list)}
        lf = ROOT / f"i18n/{lang}.json"
        meta = json.loads(lf.read_text()).get("_meta", {}) if lf.exists() else {}
        for k, v in arrays.items():
            if k not in meta: todo[k] = " | ".join(v)
        todo = {k: v for k, v in todo.items() if isinstance(v, str)}
        if not todo: print(f"{lang}: up to date"); continue
        est_in = len(json.dumps(todo)) / 3.5 + 400; est_out = est_in * 1.3
        est_usd = (est_in * 5 + est_out * 25) / 1e6
        print(f"{lang} ({name}): {len(todo)} keys, ~{int(est_in)} in / ~{int(est_out)} out tokens, est ${est_usd:.2f}")
        if est_usd > MAX_USD: print(f"  exceeds TRANSLATE_MAX_USD={MAX_USD}; aborting this language", file=sys.stderr); continue
        result, spent = {}, [0, 0]
        for batch in chunks(todo):
            out, usage = translate(client, name, batch)
            spent[0] += usage.input_tokens + (usage.cache_read_input_tokens or 0); spent[1] += usage.output_tokens
            missing = [k for k in batch if k not in out]
            bad = [k for k in batch if k in out and slots(out[k]) != slots(batch[k])]
            if missing or bad:
                retry, u2 = translate(client, name, {k: batch[k] for k in missing + bad})
                out.update({k: v for k, v in retry.items() if slots(v) == slots(batch[k])}); spent[1] += u2.output_tokens
            for k in batch:
                if k in out and slots(out[k]) == slots(batch[k]): result[k] = out[k]
                else: print(f"  WARN untranslated {k}", file=sys.stderr)
        for k in arrays:
            if k in result: result[k] = [s.strip() for s in result[k].split("|")]
        tmp = ROOT / f"i18n/.{lang}.translated.json"; tmp.write_text(json.dumps(result, ensure_ascii=False, indent=1))
        subprocess.run(["node", str(ROOT / "scripts/i18n-diff.js"), lang, "apply", str(tmp)], check=True)
        tmp.unlink()
        f = ROOT / f"i18n/{lang}.json"; d = json.loads(f.read_text()); d["_name"] = native; d["_dir"] = direction; d["_status"] = "machine"
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2))
        print(f"  wrote i18n/{lang}.json  ({len(result)} keys; {spent[0]} in / {spent[1]} out tokens, ~${(spent[0]*5+spent[1]*25)/1e6:.2f})")

if __name__ == "__main__":
    main(sys.argv[1:] or ["es", "fr", "ar", "zh", "ru"])
