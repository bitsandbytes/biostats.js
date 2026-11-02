/**
 * Email domain completions for email inputs.
 *
 * Phone keyboards for `type="email"` show `@` and `.`, but most don't offer
 * domain shortcuts, so the login form fills a <datalist> with these. Once the
 * user has typed "name@", they can tap "name@gmail.com" instead of typing it.
 */

/** Most common domains first, since the datalist shows them in this order. */
export const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'icloud.com',
  'yahoo.com',
  'hotmail.com',
];

/**
 * Returns full-address completions for a partly typed email, or [] when there's
 * nothing useful to suggest: no "@" yet, nothing before it, more than one "@",
 * the domain is already complete, or no common domain matches what was typed.
 *
 * @param {string} value - the input's current value
 * @returns {string[]} e.g. emailSuggestions('jane@g') → ['jane@gmail.com']
 */
export function emailSuggestions(value) {
  const parts = value.trim().split('@');
  if (parts.length !== 2) return [];
  const [local, typedDomain] = parts;
  if (!local) return [];
  const prefix = typedDomain.toLowerCase();
  return COMMON_EMAIL_DOMAINS
    .filter((d) => d.startsWith(prefix) && d !== prefix)
    .map((d) => `${local}@${d}`);
}
