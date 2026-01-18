export class DomainError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DomainError'
	}
}

export class InvalidScoreError extends DomainError {
	constructor(value: number) {
		super(`Invalid score value: ${value}. Score must be between 1 and 10.`)
		this.name = 'InvalidScoreError'
	}
}

export class InvalidPriceError extends DomainError {
	constructor(value: number) {
		super(`Invalid price value: ${value}. Price must be positive.`)
		this.name = 'InvalidPriceError'
	}
}

export class InvalidMarginError extends DomainError {
	constructor(message: string) {
		super(message)
		this.name = 'InvalidMarginError'
	}
}

export class AnalysisNotFoundError extends DomainError {
	constructor(identifier: string) {
		super(`Analysis not found: ${identifier}`)
		this.name = 'AnalysisNotFoundError'
	}
}

export class InvalidAnalysisDataError extends DomainError {
	constructor(message: string) {
		super(`Invalid analysis data: ${message}`)
		this.name = 'InvalidAnalysisDataError'
	}
}
