// @ts-check
import {
  isArbitraryColorClass,
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
 * Builds a rule that reports class tokens matching `predicate`. `options` is the rule's first
 * configuration object (e.g. { allowGeometry: true }).
 * @param {{
 *   description: string;
 *   message: string;
 *   predicate: (token: string, options: Record<string, unknown>) => boolean;
 *   schema?: import('json-schema').JSONSchema4[];
 * }} definition
 * @returns {import('eslint').Rule.RuleModule}
 */
function classTokenRule({ description, message, predicate, schema = [] }) {
  return {
    meta: {
      type: 'problem',
      docs: { description },
      messages: { invalid: message },
      schema,
    },
    create(context) {
      /** @type {Record<string, unknown>} */
      const options = context.options[0] ?? {};
      /** @param {any} node @param {string} text */
      const check = (node, text) => {
        if (!isInClassContext(node)) return;
        for (const token of splitClassTokens(text)) {
          if (predicate(token, options)) {
            context.report({ node, messageId: 'invalid', data: { token } });
          }
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

/**
 * Invisible or direction-changing characters must be written as escapes (e.g. NBSP as an escape
 * sequence) so reviewers can see them. Listed by code point to keep this file ASCII-only.
 */
const INVISIBLE_CODE_POINTS = new Map([
  [0x00a0, 'NO-BREAK SPACE'],
  [0x202f, 'NARROW NO-BREAK SPACE'],
  [0x200b, 'ZERO WIDTH SPACE'],
  [0x200c, 'ZERO WIDTH NON-JOINER'],
  [0x200d, 'ZERO WIDTH JOINER'],
  [0x200e, 'LEFT-TO-RIGHT MARK'],
  [0x200f, 'RIGHT-TO-LEFT MARK'],
  [0x202a, 'LEFT-TO-RIGHT EMBEDDING'],
  [0x202b, 'RIGHT-TO-LEFT EMBEDDING'],
  [0x202c, 'POP DIRECTIONAL FORMATTING'],
  [0x202d, 'LEFT-TO-RIGHT OVERRIDE'],
  [0x202e, 'RIGHT-TO-LEFT OVERRIDE'],
  [0x2066, 'LEFT-TO-RIGHT ISOLATE'],
  [0x2067, 'RIGHT-TO-LEFT ISOLATE'],
  [0x2068, 'FIRST STRONG ISOLATE'],
  [0x2069, 'POP DIRECTIONAL ISOLATE'],
  [0x061c, 'ARABIC LETTER MARK'],
  [0xfeff, 'ZERO WIDTH NO-BREAK SPACE'],
]);

/** @type {import('eslint').Rule.RuleModule} */
const noInvisibleCharacters = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow invisible and bidi control characters in source code.' },
    messages: {
      invisible: 'Invisible character U+{{code}} ({{name}}). Write it as a \\u{{code}} escape.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const text = context.sourceCode.getText();
        for (let index = 0; index < text.length; index += 1) {
          const name = INVISIBLE_CODE_POINTS.get(text.charCodeAt(index));
          if (!name) continue;
          const code = text.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0');
          context.report({
            loc: context.sourceCode.getLocFromIndex(index),
            messageId: 'invisible',
            data: { code, name },
          });
        }
      },
    };
  },
};

/**
 * A `'use client'` module imported by a Server Component turns every export into a client
 * reference: calling a helper or reading a constant from it crashes at render time. Such modules
 * may only export components (PascalCase), hooks, types, and a default export.
 * @type {import('eslint').Rule.RuleModule}
 */
const clientModuleExports = {
  meta: {
    type: 'problem',
    docs: { description: 'Only components may be exported from a "use client" module.' },
    messages: {
      exported:
        '"{{name}}" is exported from a "use client" module. Server code importing it gets a client reference, not the value. Move it to a shared module.',
    },
    schema: [],
  },
  create(context) {
    const body = context.sourceCode.ast.body;
    const first = body[0];
    const isClient =
      first?.type === 'ExpressionStatement' &&
      first.expression.type === 'Literal' &&
      first.expression.value === 'use client';
    if (!isClient) return {};
    /** @param {any} node @param {string} name */
    const check = (node, name) => {
      // Components (PascalCase, not SCREAMING_CASE constants) and hooks are fine.
      if (!/^([A-Z][a-z]|use[A-Z])/.test(name)) {
        context.report({ node, messageId: 'exported', data: { name } });
      }
    };
    return {
      /** @param {any} node */
      ExportNamedDeclaration(node) {
        if (node.exportKind === 'type') return;
        const declaration = node.declaration;
        if (!declaration) {
          for (const specifier of node.specifiers ?? []) {
            if (specifier.exportKind !== 'type') check(specifier, specifier.exported.name);
          }
          return;
        }
        if (declaration.type === 'FunctionDeclaration' && declaration.id) {
          check(declaration, declaration.id.name);
        } else if (declaration.type === 'VariableDeclaration') {
          for (const item of declaration.declarations) {
            if (item.id.type === 'Identifier') check(item, item.id.name);
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
        '"{{token}}" uses an arbitrary value. Add a token in src/styles/tokens.ts or use the (--token) shorthand.',
      // { allowGeometry: true } (vendored primitives): calc()/min() geometry is tolerated, but a
      // hard-coded colour is still an error.
      predicate: (token, options) =>
        options.allowGeometry === true
          ? isArbitraryColorClass(token)
          : isArbitraryValueClass(token),
      schema: [
        {
          type: 'object',
          properties: { allowGeometry: { type: 'boolean' } },
          additionalProperties: false,
        },
      ],
    }),
    'todo-requires-issue': todoRequiresIssue,
    'no-invisible-characters': noInvisibleCharacters,
    'client-module-exports': clientModuleExports,
  },
};

export default plugin;
