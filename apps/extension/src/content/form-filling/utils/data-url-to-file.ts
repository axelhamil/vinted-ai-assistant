/**
 * Convert a data URL to a File object
 * Useful for creating File objects from canvas data or base64 images
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
	const arr = dataUrl.split(',')
	const mimeMatch = arr[0]?.match(/:(.*?);/)
	const mime = mimeMatch?.[1] || 'image/png'
	const bstr = atob(arr[1] || '')
	let n = bstr.length
	const u8arr = new Uint8Array(n)

	while (n--) {
		u8arr[n] = bstr.charCodeAt(n)
	}

	return new File([u8arr], filename, { type: mime })
}

/**
 * Convert a File or Blob to a data URL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}
