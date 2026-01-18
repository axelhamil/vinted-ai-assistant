import type { Context } from 'hono'
import type { ZodError, infer as ZodInfer, ZodSchema } from 'zod'

/**
 * Validation error response format
 */
export interface ValidationErrorResponse {
	error: 'Validation Error'
	message: string
	details: Array<{
		field: string
		message: string
	}>
}

/**
 * Format Zod validation errors into a consistent API response
 */
export function formatZodError(error: ZodError): ValidationErrorResponse {
	const details = error.issues.map((issue) => ({
		field: issue.path.join('.') || 'unknown',
		message: issue.message,
	}))

	return {
		error: 'Validation Error',
		message: 'Request validation failed',
		details,
	}
}

/**
 * Validate request body against a Zod schema
 * Returns validated data or throws a 400 error with formatted details
 */
export async function validateBody<T extends ZodSchema>(
	c: Context,
	schema: T
): Promise<ZodInfer<T>> {
	try {
		const body = await c.req.json()
		const result = schema.safeParse(body)

		if (!result.success) {
			const errorResponse = formatZodError(result.error)
			throw new ValidationError(errorResponse)
		}

		return result.data
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error
		}
		// JSON parsing error
		throw new ValidationError({
			error: 'Validation Error',
			message: 'Invalid JSON body',
			details: [{ field: 'body', message: 'Request body must be valid JSON' }],
		})
	}
}

/**
 * Validate query parameters against a Zod schema
 * Returns validated data or throws a 400 error with formatted details
 */
export function validateQuery<T extends ZodSchema>(c: Context, schema: T): ZodInfer<T> {
	const query = c.req.query()
	const result = schema.safeParse(query)

	if (!result.success) {
		const errorResponse = formatZodError(result.error)
		throw new ValidationError(errorResponse)
	}

	return result.data
}

/**
 * Validate path parameters against a Zod schema
 * Returns validated data or throws a 400 error with formatted details
 */
export function validateParams<T extends ZodSchema>(c: Context, schema: T): ZodInfer<T> {
	const params = c.req.param()
	const result = schema.safeParse(params)

	if (!result.success) {
		const errorResponse = formatZodError(result.error)
		throw new ValidationError(errorResponse)
	}

	return result.data
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
	public readonly response: ValidationErrorResponse

	constructor(response: ValidationErrorResponse) {
		super(response.message)
		this.name = 'ValidationError'
		this.response = response
	}
}

/**
 * Check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError
}
