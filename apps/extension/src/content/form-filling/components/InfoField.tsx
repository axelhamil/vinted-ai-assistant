/**
 * Read-only info field displaying a label and value
 */

interface InfoFieldProps {
	label: string
	value: string
}

export function InfoField({ label, value }: InfoFieldProps) {
	return (
		<div className="flex items-center justify-between py-3 border-b border-border last:border-0">
			<span className="text-base text-content-secondary">{label}</span>
			<span className="text-base font-medium text-content-primary">{value}</span>
		</div>
	)
}
