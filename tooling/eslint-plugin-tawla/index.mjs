// @ts-check
import {
  isArbitraryValueClass,
  isPhysicalDirectionClass,
  splitClassTokens,
} from './class-tokens.mjs';

/** Functions whose string arguments are Tailwind class lists. */
const CLASS_FUNCTIONS = new Set(['cn', 'cva', 'clsx', 'twMerge']);
const CLASS_ATTRIBUTES = new Set(['className', 'class']);

/**
 * Whether a string node sits inside a className attribute or a class-helper call.
 * @param {any} node
 */
function isInClassContext(node) {
  let current = node.parent;
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current.type === 'JSXAttribute') {
      return CLASS_ATTRIBUTES.has(current.name?.name);
    }
    if (current.type === 'CallExpression') {
      const callee = current.callee;
      if (callee.type === 'Identifier' && CLASS_FUNCTIONS.has(callee.name)) return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Builds a rule that reports class tokens matching `predicate`.
 * @param {{ description: string; message: string; predicate: (token: string) => boolean }} options
 * @returns {import('eslint').Rule.RuleModule}
 */
function classTokenRule({ description, message, predicate }) {
  return {
    meta: {
      type: 'problem',
      docs: { description },
      messages: { invalid: message },
      schema: [],
    },
    create(context) {
      /** @param {any} node @param {string} text */
      const check = (node, text) => {
        if (!isInClassContext(node)) return;
        for (const token of splitClassTokens(text)) {
          if (predicate(token)) context.report({ node, messageId: 'invalid', data: { token } });
        }
      };
      return {
        Literal(node) {
          if (typeof node.value === 'string') check(node, node.value);
        },
        TemplateElement(node) {
          check(node, node.value.cooked ?? node.value.raw);
        },
      };
    },
  };
}

/** @type {import('eslint').Rule.RuleModule} */
const todoRequiresIssue = {
  meta: {
    type: 'suggestion',
    docs: { description: 'TODO/FIXME comments must reference a tracked issue: TODO(#123): …' },
    messages: { missing: 'Reference a tracked issue: `TODO(#123): …` (CLAUDE.md rule 17).' },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const markers = comment.value.match(/\b(?:TODO|FIXME|XXX|HACK)\b[^\n]*/g) ?? [];
          if (markers.some((marker) => !/^TODO\(#\d+\):/.test(marker))) {
            context.report({ loc: comment.loc ?? { line: 1, column: 0 }, messageId: 'missing' });
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: 'eslint-plugin-tawla', version: '0.0.0' },
  rules: {
    'no-physical-direction-classes': classTokenRule({
      description: 'Use logical Tailwind utilities (ms-, pe-, start-, text-start) for RTL support.',
      message:
        '"{{token}}" is a physical direction utility. Use the logical equivalent (ms-/me-/ps-/pe-/start-/end-/text-start/text-end) or an explicit rtl:/ltr: variant.',
      predicate: isPhysicalDirectionClass,
    }),
    'no-arbitrary-tailwind-values': classTokenRule({
      description: 'Use design tokens instead of arbitrary Tailwind values.',
      message:
        '"{{token}}" uses an arbitrary value. Add a token in src/styles/tokens.css or use the (--token) shorthand.',
      predicate: isArbitraryValueClass,
    }),
    'todo-requires-issue': todoRequiresIssue,
  },
};

export default plugin;
