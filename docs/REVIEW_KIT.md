# Native-speaker review kit

Every language except English is machine-translated and shows a banner until a native speaker has reviewed it. Reviewing a language is one spreadsheet.

## For the reviewer (no GitHub needed)
1. Open `i18n/review/<language>.csv` in Excel, Numbers or Google Sheets (the file is UTF-8 with a byte-order mark, so scripts display correctly).
2. Read each row. If the translation is right, leave it. If not, edit the **translation** column only.
3. Keep every `{placeholder}` exactly as written. They are filled with numbers and names.
4. Keep the register calm and plain: short sentences, everyday words, no exclamation marks. The three confidence words must stay distinct and ordered: `conf_likely` strongest, `conf_leaning` middle, `conf_uncertain` weakest.
5. Save the file with the same name and send it back.

## For the maintainer
```bash
node scripts/i18n-review-kit.js import <lang> <path-to-returned.csv>
```
Rows the reviewer changed or confirmed are marked reviewed; when no machine-translated keys remain the language's banner disappears. Regenerate sheets after any English change with `node scripts/i18n-review-kit.js`.

Priority order for finding reviewers (people affected first): Swahili, Amharic, Bahasa Indonesia, Filipino, Hindi, Bengali, Spanish, Portuguese, Vietnamese, Thai, Burmese, French, Arabic, Chinese, Russian.
