import * as acorn from 'acorn';
import { simple as walkSimple, ancestor as walkAncestor } from 'acorn-walk';

export class Rule {
  private readonly _opts: Opts;
  constructor(_opts: Opts) {
    this._opts = _opts;
  }

  sizeLimit(fn: acorn.Function): boolean {
    if (fn.body.end - fn.body.start > this._opts.maxSize) {
      console.log(inline_warning.size_exceeded.replace('$0', this._opts.maxSize.toString()));
      return false;
    }
    return true;
  }

  /**
   * Pure function, no outer variable reference
   */
  noOuterIdentifier(fn: acorn.Function): boolean {
    const locals = new Set<string>();

    for (let i = 0; i < fn.params.length; i++) {
      const p = fn.params[i];
      if (p && p.type === 'Identifier') {
        locals.add(p.name);
      }
    }

    if (fn.id?.name) {
      locals.add(fn.id.name);
    }

    walkSimple(
      fn.body,
      {
        VariableDeclaration(node: acorn.VariableDeclaration) {
          for (let i = 0; i < node.declarations.length; i++) {
            const decl = node.declarations[i];
            if (decl.id && decl.id.type === 'Identifier') {
              locals.add(decl.id.name);
            }
          }
        },
        FunctionDeclaration(node: acorn.FunctionDeclaration | acorn.AnonymousFunctionDeclaration) {
          if (node.id && node.id.type === 'Identifier') {
            locals.add(node.id.name);
          }
        },
      },
      undefined
    );

    // Simpler approach: scan for identifier usages and check ancestors to skip declarations/property names.
    let foundOuter: string | null = null;
    walkAncestor(fn.body, {
      Identifier(node: acorn.Identifier, ancestors: any[]) {
        const parent = ancestors[ancestors.length - 2];
        // skip if this identifier is a declaration id
        if (!parent) {
          return;
        }
        const parentType = parent.type;
        if (
          (parentType === 'VariableDeclarator' && parent.id === node) ||
          (parentType === 'FunctionDeclaration' && parent.id === node) ||
          (parentType === 'FunctionExpression' && parent.id === node) ||
          (parentType === 'Property' && parent.key === node && !parent.computed) ||
          (parentType === 'MemberExpression' && parent.property === node && !parent.computed) ||
          (parentType === 'LabeledStatement' && parent.label === node) ||
          parentType === 'BreakStatement' ||
          parentType === 'ContinueStatement'
        ) {
          return;
        }

        // skip parameter identifiers (they appear in params, whose parent is the function node)
        if (
          parentType === 'Function' ||
          parentType === 'ArrowFunctionExpression' ||
          parentType === 'FunctionExpression'
        ) {
          return;
        }
        if (!locals.has(node.name) && node.name !== 'undefined' && node.name !== 'console') {
          foundOuter = node.name;
        }
      },
    });

    if (foundOuter) {
      console.log(inline_warning.outer_identifier.replace('$0', foundOuter));
      return false;
    }

    return true;
  }
  noRecursiveCall(fn: acorn.Function): boolean {
    const name = fn.id && fn.id.name;
    if (!name) {
      return true; // anonymous functions: can't detect simple recursion
    }
    let found = false;
    walkSimple(fn.body, {
      CallExpression(node: any) {
        if (node.callee && node.callee.type === 'Identifier' && node.callee.name === name) {
          found = true;
        }
      },
    });

    if (found) {
      console.log(inline_warning.recursive_call);
      return false;
    }
    return true;
  }
}
