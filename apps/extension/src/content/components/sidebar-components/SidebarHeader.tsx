import { IconButton } from '../primitives'

interface SidebarHeaderProps {
	onClose: () => void
	onCollapse?: () => void
}

/**
 * Sidebar header with logo and controls - light theme with orange accent
 */
export function SidebarHeader({ onClose, onCollapse }: SidebarHeaderProps) {
	return (
		<header className="flex-shrink-0 h-[80px] px-6 flex items-center justify-between bg-white border-b border-border">
			{/* Left side: collapse button and logo */}
			<div className="flex items-center gap-3">
				{onCollapse && (
					<IconButton
						icon={
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
						}
						variant="ghost"
						size="sm"
						onClick={onCollapse}
						ariaLabel="Réduire le panneau"
					/>
				)}

				{/* Logo */}
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shadow-soft">
						<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<span className="text-base font-semibold text-content-primary">Vinted</span>
						<span className="text-base font-semibold text-brand">AI</span>
					</div>
				</div>
			</div>

			{/* Right side: close button */}
			<IconButton
				icon={
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				}
				variant="ghost"
				size="sm"
				onClick={onClose}
				ariaLabel="Fermer le panneau"
			/>
		</header>
	)
}
