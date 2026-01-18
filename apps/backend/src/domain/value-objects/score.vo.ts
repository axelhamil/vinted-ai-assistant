import { InvalidScoreError } from '../errors/domain.error'

/**
 * Value Object representing a score between 1 and 10
 * Used for opportunity scores, photo quality scores, authenticity scores, etc.
 */
export class Score {
	private readonly _value: number

	private constructor(value: number) {
		this._value = value
	}

	static create(value: number): Score {
		if (value < 1 || value > 10 || !Number.isInteger(value)) {
			throw new InvalidScoreError(value)
		}
		return new Score(value)
	}

	static createFromFloat(value: number): Score {
		const rounded = Math.round(value)
		const clamped = Math.max(1, Math.min(10, rounded))
		return new Score(clamped)
	}

	get value(): number {
		return this._value
	}

	isHighOpportunity(): boolean {
		return this._value >= 7
	}

	isMediumOpportunity(): boolean {
		return this._value >= 4 && this._value < 7
	}

	isLowOpportunity(): boolean {
		return this._value < 4
	}

	getLevel(): 'high' | 'medium' | 'low' {
		if (this.isHighOpportunity()) return 'high'
		if (this.isMediumOpportunity()) return 'medium'
		return 'low'
	}

	equals(other: Score): boolean {
		return this._value === other._value
	}

	toString(): string {
		return `${this._value}/10`
	}
}
