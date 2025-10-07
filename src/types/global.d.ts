import { RollupInlineFunctionOptions } from './common.js';

declare global {
  type Opts = RollupInlineFunctionOptions;

  // Basic directives, act like they are in C++
  const enum Dirv {
    If = '#if',
    Else = '#else',
    Elif = '#elif',
    Endif = '#endif',
  }

  interface IfBlock {
    dirv: Dirv;
    condition: boolean | null;
    ifStart: number;
    ifEnd: number;
    endifStart: number;
    endifEnd: number;
    children: IfBlock[];
  }

  interface DirvBlock {
    dirv: Dirv;

    /**
     * When `dirv` is `#endif`, `condition` is meaningless (always `false`).
     */
    condition: boolean;

    start: number;

    end: number;
  }
}
