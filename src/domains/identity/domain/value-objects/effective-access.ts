import { AccessDecision } from './index';

export interface EffectiveAccessProps {
  decision: AccessDecision;
  matchedRules: string[];
  denyReasons: string[];
  allowReasons: string[];
}

/**
 * EffectiveAccess - Value Object representing the result of access evaluation
 * Immutable and provides traceability for audit
 */
export class EffectiveAccess {
  private readonly _decision: AccessDecision;
  private readonly _matchedRules: readonly string[];
  private readonly _denyReasons: readonly string[];
  private readonly _allowReasons: readonly string[];

  private constructor(props: EffectiveAccessProps) {
    this._decision = props.decision;
    this._matchedRules = Object.freeze([...props.matchedRules]);
    this._denyReasons = Object.freeze([...props.denyReasons]);
    this._allowReasons = Object.freeze([...props.allowReasons]);
  }

  static permit(
    matchedRules: string[],
    allowReasons: string[],
  ): EffectiveAccess {
    return new EffectiveAccess({
      decision: AccessDecision.PERMIT,
      matchedRules,
      denyReasons: [],
      allowReasons,
    });
  }

  static deny(matchedRules: string[], denyReasons: string[]): EffectiveAccess {
    return new EffectiveAccess({
      decision: AccessDecision.DENY,
      matchedRules,
      denyReasons,
      allowReasons: [],
    });
  }

  static defaultDeny(reason: string): EffectiveAccess {
    return new EffectiveAccess({
      decision: AccessDecision.DENY,
      matchedRules: [],
      denyReasons: [reason],
      allowReasons: [],
    });
  }

  get decision(): AccessDecision {
    return this._decision;
  }

  get matchedRules(): readonly string[] {
    return this._matchedRules;
  }

  get denyReasons(): readonly string[] {
    return this._denyReasons;
  }

  get allowReasons(): readonly string[] {
    return this._allowReasons;
  }

  isPermitted(): boolean {
    return this._decision === AccessDecision.PERMIT;
  }

  isDenied(): boolean {
    return this._decision === AccessDecision.DENY;
  }

  toJSON(): EffectiveAccessProps {
    return {
      decision: this._decision,
      matchedRules: [...this._matchedRules],
      denyReasons: [...this._denyReasons],
      allowReasons: [...this._allowReasons],
    };
  }
}
