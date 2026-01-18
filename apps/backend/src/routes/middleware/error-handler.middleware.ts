import type { Context, Next } from 'hono'
import { AnalysisNotFoundError, DomainError } from '../../domain/errors/domain.error'
import { ValidationError } from './validation.middleware'

/**
 * Standard error response format
 */
export interface ErrorResponse {
	error: string
	message: string
	details?: Array<{
		field: string
		message: string
	}>
}

/**
 * Log error with timestamp and details
 */
function logError(error: unknown, context: string): void {
	const timestamp = new Date().toISOString()
	const errorName = error instanceof Error ? error.name : 'UnknownError'
	const errorMessage = error instanceof Error ? error.message : String(error)
	const stack = error instanceof Error ? error.stack : undefined

	console.error(`[${timestamp}] [ERROR] ${context}`)
	console.error(`  Name: ${errorName}`)
	console.error(`  Message: ${errorMessage}`)
	if (stack) {
		console.error(`  Stack: ${stack}`)
	}
}

/**
 * Create a formatted error response
 */
function createErrorResponse(
	error: string,
	message: string,
	details?: Array<{ field: string; message: string }>
): ErrorResponse {
	const response: ErrorResponse = {
		error,
		message,
	}
	if (details) {
		response.details = details
	}
	return response
}

/**
 * Global error handler middleware
 * Catches all errors and returns formatted JSON responses
 */
export async function errorHandler(c: Context, next: Next): Promise<Response> {
	try {
		await next()
	} catch (error) {
		const requestInfo = `${c.req.method} ${c.req.path}`

		// Handle ValidationError (400 Bad Request)
		if (error instanceof ValidationError) {
			logError(error, `Validation error on ${requestInfo}`)
			return c.json(error.response, 400)
		}

		// Handle AnalysisNotFoundError (404 Not Found)
		if (error instanceof AnalysisNotFoundError) {
			logError(error, `Not found error on ${requestInfo}`)
			return c.json(createErrorResponse('Not Found', error.message), 404)
		}

		// Handle other DomainErrors (400 Bad Request)
		if (error instanceof DomainError) {
			logError(error, `Domain error on ${requestInfo}`)
			return c.json(createErrorResponse('Domain Error', error.message), 400)
		}

		// Handle unknown errors (500 Internal Server Error)
		logError(error, `Internal error on ${requestInfo}`)
		const message = error instanceof Error ? error.message : 'An unexpected error occurred'
		return c.json(createErrorResponse('Internal Server Error', message), 500)
	}

	return c.res
}
