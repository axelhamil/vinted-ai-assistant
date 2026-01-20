import type { AnalysisResult } from '@vinted-ai/shared/analysis'
import type { VintedSeller } from '@vinted-ai/shared/article'
import { AuthenticityCard } from '../cards/AuthenticityCard'
import { MarginCard } from '../cards/MarginCard'
import { MarketPriceCard } from '../cards/MarketPriceCard'
import { PhotoGalleryCard } from '../cards/PhotoGalleryCard'
import { PhotoQualityCard } from '../cards/PhotoQualityCard'
import { SellerCard } from '../cards/SellerCard'
import { SignalsCard } from '../cards/SignalsCard'

interface InsightTabProps {
	analysis: AnalysisResult
	photos?: string[]
	seller?: VintedSeller
	/** Shipping cost in euros (null = free shipping or not available) */
	shippingCost?: number | null
}

/**
 * Insight tab displaying margin, market price, signals, authenticity, photo quality, and seller info
 */
export function InsightTab({
	analysis,
	photos = [],
	seller,
	shippingCost = null,
}: InsightTabProps) {
	const { opportunity, marketPrice, authenticityCheck, photoQuality, price } = analysis

	return (
		<div className="space-y-4 animate-fade-in">
			{/* Photo Gallery Card - First position */}
			{photos.length > 0 && <PhotoGalleryCard photos={photos} />}

			{/* Margin Card */}
			<MarginCard
				margin={opportunity.margin}
				marginPercent={opportunity.marginPercent}
				buyPrice={price}
				shippingCost={shippingCost}
				sellPrice={marketPrice.average}
			/>

			{/* Market Price Card */}
			<MarketPriceCard
				low={marketPrice.low}
				high={marketPrice.high}
				average={marketPrice.average}
				currentPrice={price}
				confidence={marketPrice.confidence}
				retailPrice={marketPrice.retailPrice}
				reasoning={marketPrice.reasoning}
			/>

			{/* Signals Card */}
			<SignalsCard signals={opportunity.signals} />

			{/* Seller Card */}
			{seller && <SellerCard seller={seller} />}

			{/* Authenticity Card */}
			<AuthenticityCard
				score={authenticityCheck.score}
				flags={authenticityCheck.flags}
				confidence={authenticityCheck.confidence}
			/>

			{/* Photo Quality Card */}
			<PhotoQualityCard photoQuality={photoQuality} />
		</div>
	)
}
