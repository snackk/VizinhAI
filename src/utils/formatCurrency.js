/**
 * Formats a numeric value as a localized EUR currency string.
 *
 * @param {number | null | undefined} value - the amount to format.
 * @param {string} locale - BCP 47 locale tag (e.g. 'pt', 'en', 'fr').
 * @returns {string} the formatted currency string, or '—' for
 *   null/undefined/NaN/non-finite input.
 */
const REGIONAL_LOCALE_TAGS = { pt: 'pt-PT', fr: 'fr-FR', en: 'en-GB' };

export function formatCurrency(value, locale) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—';
  }

  const regionalLocale = REGIONAL_LOCALE_TAGS[locale] ?? locale;

  return new Intl.NumberFormat(regionalLocale, { style: 'currency', currency: 'EUR' }).format(Number(value));
}
