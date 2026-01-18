import type {
	AnalysisStatus,
	AuthenticityCheck,
	MarketPrice,
	Negotiation,
	Opportunity,
	OpportunitySignal,
	PhotoQuality,
	Resale,
} from '@vinted-ai/shared/analysis'
import { InvalidAnalysisDataError } from '../errors/domain.error'
import { Margin, Price, PriceRange } from '../value-objects/price.vo'
import { Score } from '../value-objects/score.vo'

export interface AnalysisProps {
	id: string
	vintedId: string
	url: string
	title: string
	description: string | null
	price: number
	brand: string | null
	size: string | null
	condition: string | null
	/** Model detected by AI (e.g., "Air Max 90", "Speedy 30") */
	detectedModel: string | null

	sellerUsername: string
	sellerRating: number | null
	sellerSalesCount: number | null

	photos: string[]

	photoQuality: PhotoQuality
	authenticityCheck: AuthenticityCheck
	marketPrice: MarketPrice
	opportunity: Opportunity
	negotiation: Negotiation
	resale: Resale

	status: AnalysisStatus
	analyzedAt: Date
	updatedAt: Date
}

export class AnalysisEntity {
	private readonly props: AnalysisProps

	private readonly _opportunityScore: Score
	private readonly _photoQualityScore: Score
	private readonly _authenticityScore: Score
	private readonly _askingPrice: Price
	private readonly _marketPriceRange: PriceRange
	private readonly _margin: Margin

	private constructor(props: AnalysisProps) {
		this.props = props

		this._opportunityScore = Score.create(props.opportunity.score)
		this._photoQualityScore = Score.create(props.photoQuality.score)
		this._authenticityScore = Score.create(props.authenticityCheck.score)
		this._askingPrice = Price.create(props.price)
		this._marketPriceRange = PriceRange.create(
			props.marketPrice.low,
			props.marketPrice.high,
			props.marketPrice.average
		)
		this._margin = Margin.create(props.opportunity.margin, props.opportunity.marginPercent)
	}

	static create(props: AnalysisProps): AnalysisEntity {
		AnalysisEntity.validate(props)
		return new AnalysisEntity(props)
	}

	private static validate(props: AnalysisProps): void {
		if (!props.id) {
			throw new InvalidAnalysisDataError('id is required')
		}
		if (!props.vintedId) {
			throw new InvalidAnalysisDataError('vintedId is required')
		}
		if (!props.url) {
			throw new InvalidAnalysisDataError('url is required')
		}
		if (!props.title) {
			throw new InvalidAnalysisDataError('title is required')
		}
		if (props.price < 0) {
			throw new InvalidAnalysisDataError('price must be positive')
		}
		if (!props.photos || props.photos.length === 0) {
			throw new InvalidAnalysisDataError('at least one photo is required')
		}
		if (!props.sellerUsername) {
			throw new InvalidAnalysisDataError('sellerUsername is required')
		}
	}

	// Getters for basic properties
	get id(): string {
		return this.props.id
	}

	get vintedId(): string {
		return this.props.vintedId
	}

	get url(): string {
		return this.props.url
	}

	get title(): string {
		return this.props.title
	}

	get description(): string | null {
		return this.props.description
	}

	get brand(): string | null {
		return this.props.brand
	}

	get size(): string | null {
		return this.props.size
	}

	get condition(): string | null {
		return this.props.condition
	}

	get detectedModel(): string | null {
		return this.props.detectedModel
	}

	get sellerUsername(): string {
		return this.props.sellerUsername
	}

	get sellerRating(): number | null {
		return this.props.sellerRating
	}

	get sellerSalesCount(): number | null {
		return this.props.sellerSalesCount
	}

	get photos(): string[] {
		return [...this.props.photos]
	}

	get status(): AnalysisStatus {
		return this.props.status
	}

	get analyzedAt(): Date {
		return this.props.analyzedAt
	}

	get updatedAt(): Date {
		return this.props.updatedAt
	}

	// Value Object getters
	get opportunityScore(): Score {
		return this._opportunityScore
	}

	get photoQualityScore(): Score {
		return this._photoQualityScore
	}

	get authenticityScore(): Score {
		return this._authenticityScore
	}

	get askingPrice(): Price {
		return this._askingPrice
	}

	get marketPriceRange(): PriceRange {
		return this._marketPriceRange
	}

	get margin(): Margin {
		return this._margin
	}

	// Complex object getters (return copies for immutability)
	get photoQuality(): PhotoQuality {
		return { ...this.props.photoQuality }
	}

	get authenticityCheck(): AuthenticityCheck {
		return { ...this.props.authenticityCheck }
	}

	get marketPrice(): MarketPrice {
		return {
			...this.props.marketPrice,
			sources: [...this.props.marketPrice.sources],
		}
	}

	get opportunity(): Opportunity {
		return {
			...this.props.opportunity,
			signals: [...this.props.opportunity.signals],
		}
	}

	get negotiation(): Negotiation {
		return {
			...this.props.negotiation,
			arguments: [...this.props.negotiation.arguments],
		}
	}

	get resale(): Resale {
		return {
			...this.props.resale,
			tips: [...this.props.resale.tips],
			platforms: [...this.props.resale.platforms],
		}
	}

	// Business logic methods
	isHighOpportunity(): boolean {
		return this._opportunityScore.isHighOpportunity()
	}

	isProfitable(): boolean {
		return this._margin.isProfitable()
	}

	isPriceUnderMarket(): boolean {
		return this._marketPriceRange.isBelowRange(this._askingPrice)
	}

	getOpportunityLevel(): 'high' | 'medium' | 'low' {
		return this._opportunityScore.getLevel()
	}

	getMarginLevel(): 'high' | 'medium' | 'low' {
		return this._margin.getLevel()
	}

	hasAuthenticityFlags(): boolean {
		return this.props.authenticityCheck.flags.length > 0
	}

	getPositiveSignals(): OpportunitySignal[] {
		return this.props.opportunity.signals.filter((s) => s.type === 'positive')
	}

	getNegativeSignals(): OpportunitySignal[] {
		return this.props.opportunity.signals.filter((s) => s.type === 'negative')
	}

	// Status management
	canTransitionTo(newStatus: AnalysisStatus): boolean {
		const currentStatus = this.props.status

		const validTransitions: Record<AnalysisStatus, AnalysisStatus[]> = {
			ANALYZED: ['WATCHING', 'BOUGHT', 'ARCHIVED'],
			WATCHING: ['BOUGHT', 'ARCHIVED'],
			BOUGHT: ['SOLD', 'ARCHIVED'],
			SOLD: ['ARCHIVED'],
			ARCHIVED: [],
		}

		return validTransitions[currentStatus].includes(newStatus)
	}

	updateStatus(newStatus: AnalysisStatus): AnalysisEntity {
		if (!this.canTransitionTo(newStatus)) {
			throw new InvalidAnalysisDataError(
				`Cannot transition from ${this.props.status} to ${newStatus}`
			)
		}

		return new AnalysisEntity({
			...this.props,
			status: newStatus,
			updatedAt: new Date(),
		})
	}

	// Cache management
	getCachedUntil(): Date {
		const cacheTime = new Date(this.props.analyzedAt)
		cacheTime.setHours(cacheTime.getHours() + 1)
		return cacheTime
	}

	isCacheExpired(): boolean {
		return new Date() > this.getCachedUntil()
	}

	// Serialization
	toProps(): AnalysisProps {
		return { ...this.props }
	}
}
