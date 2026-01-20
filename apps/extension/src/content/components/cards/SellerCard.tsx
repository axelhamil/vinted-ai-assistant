import type { SellerReliability, VintedSeller } from '@vinted-ai/shared/article'
import { Card, CardRow } from '../primitives/Card'
import { Pill } from '../primitives/Pill'

interface SellerCardProps {
	seller: VintedSeller
}

/**
 * Get reliability badge variant and label
 */
function getReliabilityConfig(reliability: SellerReliability): {
	variant: 'success' | 'warning' | 'negative' | 'default'
	label: string
	icon: string
} {
	switch (reliability) {
		case 'high':
			return { variant: 'success', label: 'Haute', icon: '🟢' }
		case 'medium':
			return { variant: 'warning', label: 'Moyenne', icon: '🟡' }
		case 'low':
			return { variant: 'negative', label: 'Faible', icon: '🔴' }
		default:
			return { variant: 'default', label: 'Inconnue', icon: '⚪' }
	}
}

/**
 * Card displaying seller information and reliability
 */
export function SellerCard({ seller }: SellerCardProps) {
	const reliabilityConfig = getReliabilityConfig(seller.reliability)
	const showWarning = seller.reliability === 'low' || seller.reliability === 'unknown'

	return (
		<Card
			title="Vendeur"
			iconColor="blue"
			icon={
				<svg
					aria-hidden="true"
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					/>
				</svg>
			}
		>
			{/* Username */}
			<div className="flex items-center gap-2 mb-3">
				<span className="text-2xl font-semibold text-content-primary">@{seller.username}</span>
				{seller.verifiedProfile && (
					<svg
						aria-hidden="true"
						className="w-5 h-5 text-profit"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clipRule="evenodd"
						/>
					</svg>
				)}
			</div>

			{/* Seller stats */}
			<div className="space-y-2">
				{/* Rating */}
				{seller.rating !== null && (
					<CardRow
						label="Note"
						value={
							<span className="flex items-center gap-1">
								<svg
									aria-hidden="true"
									className="w-4 h-4 text-caution"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
								{seller.rating.toFixed(1)}
								{seller.ratingCount !== null && (
									<span className="text-content-secondary">({seller.ratingCount} avis)</span>
								)}
							</span>
						}
					/>
				)}

				{/* Sales count */}
				{seller.salesCount > 0 && (
					<CardRow
						label="Ventes"
						value={
							<span className="flex items-center gap-1">
								<svg
									aria-hidden="true"
									className="w-4 h-4 text-content-muted"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
									/>
								</svg>
								{seller.salesCount}
							</span>
						}
					/>
				)}

				{/* Active listings */}
				{seller.activeListings !== null && (
					<CardRow
						label="Articles en vente"
						value={
							<span className="flex items-center gap-1">
								<svg
									aria-hidden="true"
									className="w-4 h-4 text-content-muted"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
								{seller.activeListings}
							</span>
						}
					/>
				)}

				{/* Member since */}
				{seller.memberSince && (
					<CardRow
						label="Membre depuis"
						value={
							<span className="flex items-center gap-1">
								<svg
									aria-hidden="true"
									className="w-4 h-4 text-content-muted"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								{seller.memberSince}
							</span>
						}
					/>
				)}

				{/* Followers */}
				{seller.followers !== null && (
					<CardRow
						label="Abonnés"
						value={
							<span className="flex items-center gap-1">
								<svg
									aria-hidden="true"
									className="w-4 h-4 text-content-muted"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
								{seller.followers}
							</span>
						}
					/>
				)}

				{/* Response time */}
				{seller.responseTime && (
					<CardRow
						label="Temps de réponse"
						value={
							<span className="flex items-center gap-1">
								<svg
									aria-hidden="true"
									className="w-4 h-4 text-content-muted"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
								{seller.responseTime}
							</span>
						}
					/>
				)}
			</div>

			{/* Reliability indicator */}
			<div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
				<span className="text-xl text-content-muted">Fiabilité vendeur</span>
				<Pill variant={reliabilityConfig.variant}>
					{reliabilityConfig.icon} {reliabilityConfig.label}
				</Pill>
			</div>

			{/* Warning message for low/unknown reliability */}
			{showWarning && (
				<div className="mt-3 p-2 rounded-lg bg-caution/10 border border-caution/20">
					<div className="flex items-start gap-2">
						<svg
							aria-hidden="true"
							className="w-5 h-5 text-caution flex-shrink-0 mt-0.5"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
						<p className="text-lg text-caution">
							Vérifiez le profil du vendeur avant d'acheter. Les données disponibles sont
							insuffisantes pour garantir sa fiabilité.
						</p>
					</div>
				</div>
			)}
		</Card>
	)
}
