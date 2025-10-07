import type { Plugin } from 'rollup';
import { RollupInlineFunctionOptions } from '@/types/common.js';
import { Inline } from './parser.js';

/**
 * @param options options of the plugin
 *
 * __PKG_INFO__
 */
export function conditionalCompilation(options: Partial<RollupInlineFunctionOptions> = {}): Plugin {
  const opts = normalize(options);
  const parser = new Inline(opts);

  return {
    name: '__KEBAB_NAME__',
    transform(code: string, id: string) {
      try {
        return parser.proceed(code);
      } catch (error) {
        console.error('parsing error occured:', error);
        this.error(`error in ${id} - ${error instanceof Error ? error.message : error}`);
      }
    },
  };
}

function normalize(options: Partial<Opts>): Opts {
  if (typeof options !== 'object' || options === null) {
    throw new Error(`Invalid options: '${options}', must be an object`);
  }

  if (typeof options.variables !== 'object' || options.variables === null) {
    throw new Error(`Invalid variables: '${options.variables}', must be an object`);
  }

  return { variables: options.variables };
}
