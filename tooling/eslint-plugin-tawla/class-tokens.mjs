// @ts-check
/**
 * Helpers to analyse Tailwind class strings without a full parser.
 * A token is split into its variants (`md:`, `rtl:`, `data-[state=open]:`) and its utility.
 */

/**
 * Index of the last `:` that is not inside square brackets or parentheses.
 * @param {string} token
 * @returns {number}
 */
function lastTopLevelColon(token) {
  let depth = 0;
  let index = -1;
  for (let i = 0; i < token.length; i += 1) {
    const char = token[i];
    if (char === '[' || char === '(') depth += 1;
    else if (char === ']' || char === ')') depth = Math.max(0, depth - 1);
    else if (char === ':' && depth === 0) index = i;
  }
  return index;
}

/**
 * @param {string} value
 * @returns {string[]}
 */
export function splitClassTokens(value) {
  return value.split(/\s+/).filter(Boolean);
}

/**
 * @param {string} token
 * @returns {{ variants: string[]; utility: string }}
 */
export function parseClassToken(token) {
  const colon = lastTopLevelColon(token);
  const variantPart = colon === -1 ? '' : token.slice(0, colon);
  const utility = (colon === -1 ? token : token.slice(colon + 1)).replace(/^[!-]+/, '');
  return { variants: variantPart ? variantPart.split(':') : [], utility };
}

const PHYSICAL_UTILITY =
  /^(?:m[lr]|p[lr]|left|right|border-[lr]|rounded-(?:[lr]|tl|tr|bl|br)|scroll-[mp][lr]|text-(?:left|right)|float-(?:left|right)|clear-(?:left|right))(?:-|$)/;

/**
 * True when the token uses a physical (LTR-only) direction utility outside an explicit
 * `rtl:` / `ltr:` variant.
 * @param {string} token
 */
export function isPhysicalDirectionClass(token) {
  const { variants, utility } = parseClassToken(token);
  // rtl:/ltr: and Base UI's physical placement variants ([side=left]) are explicitly physical.
  if (
    variants.some(
      (variant) => variant === 'rtl' || variant === 'ltr' || /side=(left|right)/.test(variant),
    )
  ) {
    return false;
  }
  return PHYSICAL_UTILITY.test(utility);
}

/**
 * True when the utility part uses an arbitrary value (`w-[13px]`, `[mask:none]`).
 * Arbitrary variants (`data-[state=open]:`) and CSS-variable shorthand (`w-(--sheet-w)`) are allowed.
 * @param {string} token
 */
export function isArbitraryValueClass(token) {
  return parseClassToken(token).utility.includes('[');
}

// No backslashes on purpose ([(] is a literal parenthesis): keeps the pattern copy-paste safe.
const COLOR_LITERAL = /#[0-9a-f]{3,8}|(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)[(]/i;

/**
 * True when the utility part hard-codes a colour (bg-[#fff], text-[rgb(0_0_0)]).
 * Used for vendored primitives, where geometry calc() values are tolerated but colours must
 * always come from tokens.
 * @param {string} token
 */
export function isArbitraryColorClass(token) {
  const { utility } = parseClassToken(token);
  return utility.includes('[') && COLOR_LITERAL.test(utility);
}
