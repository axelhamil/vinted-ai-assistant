import sharp from 'sharp'

/**
 * Options for image processing
 */
export interface ImageProcessingOptions {
	/** Output format (default: preserve original or png) */
	format?: 'jpeg' | 'png' | 'webp'
	/** JPEG quality (1-100, default: 90) */
	quality?: number
	/** Maximum width (maintains aspect ratio) */
	maxWidth?: number
	/** Maximum height (maintains aspect ratio) */
	maxHeight?: number
}

/**
 * Result of image processing
 */
export interface ProcessedImage {
	/** Base64 encoded image data (without data URL prefix) */
	data: string
	/** MIME type of the processed image */
	mimeType: string
	/** Width of the processed image */
	width: number
	/** Height of the processed image */
	height: number
}

/**
 * Strip all EXIF metadata from an image
 * This removes GPS location, camera info, timestamps, and other potentially sensitive data
 *
 * @param imageBase64 - Base64 encoded image data (with or without data URL prefix)
 * @param options - Processing options
 * @returns Processed image without metadata
 */
export async function stripImageMetadata(
	imageBase64: string,
	options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
	const { format, quality = 90, maxWidth, maxHeight } = options

	// Extract raw base64 data if it's a data URL
	let rawBase64 = imageBase64
	let detectedMimeType = 'image/png'

	if (imageBase64.startsWith('data:')) {
		const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/)
		if (matches && matches[1] && matches[2]) {
			detectedMimeType = matches[1]
			rawBase64 = matches[2]
		}
	}

	// Convert base64 to buffer
	const inputBuffer = Buffer.from(rawBase64, 'base64')

	// Create sharp instance - this automatically strips EXIF metadata
	let pipeline = sharp(inputBuffer)
		// Rotate based on EXIF orientation then strip all metadata
		.rotate()
		// Remove all metadata (EXIF, IPTC, XMP, ICC profile comments)
		.withMetadata({ orientation: undefined })

	// Apply resizing if specified
	if (maxWidth || maxHeight) {
		pipeline = pipeline.resize(maxWidth, maxHeight, {
			fit: 'inside',
			withoutEnlargement: true,
		})
	}

	// Determine output format
	let outputFormat = format
	if (!outputFormat) {
		// Infer from detected MIME type
		if (detectedMimeType.includes('jpeg') || detectedMimeType.includes('jpg')) {
			outputFormat = 'jpeg'
		} else if (detectedMimeType.includes('webp')) {
			outputFormat = 'webp'
		} else {
			outputFormat = 'png'
		}
	}

	// Apply format conversion
	switch (outputFormat) {
		case 'jpeg':
			pipeline = pipeline.jpeg({ quality, mozjpeg: true })
			break
		case 'webp':
			pipeline = pipeline.webp({ quality })
			break
		case 'png':
			pipeline = pipeline.png({ compressionLevel: 9 })
			break
	}

	// Process the image
	const outputBuffer = await pipeline.toBuffer()
	const metadata = await sharp(outputBuffer).metadata()

	// Get MIME type for output
	const mimeTypes: Record<string, string> = {
		jpeg: 'image/jpeg',
		png: 'image/png',
		webp: 'image/webp',
	}

	return {
		data: outputBuffer.toString('base64'),
		mimeType: mimeTypes[outputFormat] || 'image/png',
		width: metadata.width || 0,
		height: metadata.height || 0,
	}
}

/**
 * Strip metadata from multiple images
 *
 * @param images - Array of base64 encoded images
 * @param options - Processing options to apply to all images
 * @returns Array of processed images
 */
export async function stripImageMetadataBatch(
	images: string[],
	options: ImageProcessingOptions = {}
): Promise<ProcessedImage[]> {
	return Promise.all(images.map((img) => stripImageMetadata(img, options)))
}

/**
 * Create a data URL from base64 data and mime type
 */
export function toDataUrl(base64: string, mimeType: string): string {
	return `data:${mimeType};base64,${base64}`
}
