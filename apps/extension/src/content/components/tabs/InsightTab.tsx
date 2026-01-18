import type { AnalysisResult, VintedSeller } from '@vinted-ai/shared'
import { MarginCard, MarketPriceCard, SignalsCard, AuthenticityCard, PhotoQualityCard, PhotoGalleryCard, SellerCard } from '../cards'

interface InsightTabProps {
	analysis: AnalysisResult
	photos?: string[]
	seller?: VintedSeller
}

/**
 * Insight tab displaying margin, market price, signals, authenticity, photo quality, and seller info
 */
export function InsightTab({ analysis, photos = [], seller }: InsightTabProps) {
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
