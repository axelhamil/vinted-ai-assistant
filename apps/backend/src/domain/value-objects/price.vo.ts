import { InvalidMarginError, InvalidPriceError } from '../errors/domain.error'

/**
 * Value Object representing a price in euros
 */
export class Price {
	private readonly _value: number

	private constructor(value: number) {
		this._value = value
	}

	static create(value: number): Price {
		if (value < 0) {
			throw new InvalidPriceError(value)
		}
		return new Price(Math.round(value * 100) / 100)
	}

	static zero(): Price {
		return new Price(0)
	}

	get value(): number {
		return this._value
	}

	add(other: Price): Price {
		return new Price(this._value + other._value)
	}

	subtract(other: Price): Price {
		return new Price(this._value - other._value)
	}

	multiply(factor: number): Price {
		return Price.create(this._value * factor)
	}

	equals(other: Price): boolean {
		return this._value === other._value
	}

	isGreaterThan(other: Price): boolean {
		return this._value > other._value
	}

	isLessThan(other: Price): boolean {
		return this._value < other._value
	}

	toString(): string {
		return `${this._value.toFixed(2)}€`
	}
}

/**
 * Value Object representing a margin calculation (difference between market price and asking price)
 */
export class Margin {
	private readonly _amount: Price
	private readonly _percent: number

	private constructor(amount: Price, percent: number) {
		this._amount = amount
		this._percent = percent
	}

	static calculate(marketPrice: Price, askingPrice: Price): Margin {
		if (askingPrice.value === 0) {
			throw new InvalidMarginError('Cannot calculate margin with zero asking price')
		}

		const amount = marketPrice.subtract(askingPrice)
		const percent = ((marketPrice.value - askingPrice.value) / askingPrice.value) * 100

		return new Margin(amount, Math.round(percent * 100) / 100)
	}

	static create(amount: number, percent: number): Margin {
		return new Margin(Price.create(amount), Math.round(percent * 100) / 100)
	}

	get amount(): Price {
		return this._amount
	}

	get percent(): number {
		return this._percent
	}

	isProfitable(): boolean {
		return this._amount.value > 0
	}

	isHighMargin(): boolean {
		return this._percent >= 30
	}

	isMediumMargin(): boolean {
		return this._percent >= 15 && this._percent < 30
	}

	isLowMargin(): boolean {
		return this._percent < 15
	}

	getLevel(): 'high' | 'medium' | 'low' {
		if (this.isHighMargin()) return 'high'
		if (this.isMediumMargin()) return 'medium'
		return 'low'
	}

	toString(): string {
		const sign = this._amount.value >= 0 ? '+' : ''
		return `${sign}${this._amount.value.toFixed(2)}€ (${sign}${this._percent.toFixed(1)}%)`
	}
}

/**
 * Value Object representing a price range (market price estimation)
 */
export class PriceRange {
	private readonly _low: Price
	private readonly _high: Price
	private readonly _average: Price

	private constructor(low: Price, high: Price, average: Price) {
		this._low = low
		this._high = high
		this._average = average
	}

	static create(low: number, high: number, average?: number): PriceRange {
		const lowPrice = Price.create(low)
		const highPrice = Price.create(high)
		const avgPrice = average !== undefined ? Price.create(average) : Price.create((low + high) / 2)

		return new PriceRange(lowPrice, highPrice, avgPrice)
	}

	get low(): Price {
		return this._low
	}

	get high(): Price {
		return this._high
	}

	get average(): Price {
		return this._average
	}

	contains(price: Price): boolean {
		return price.value >= this._low.value && price.value <= this._high.value
	}

	isBelowRange(price: Price): boolean {
		return price.value < this._low.value
	}

	isAboveRange(price: Price): boolean {
		return price.value > this._high.value
	}

	toString(): string {
		return `${this._low.toString()} - ${this._high.toString()} (avg: ${this._average.toString()})`
	}
}
