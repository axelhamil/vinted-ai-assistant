// Content script entry point for Vinted AI Assistant
// Injects UI components into Vinted article pages

console.log('Vinted AI Assistant - Content script loaded')

// Check if we're on a Vinted article page
const isVintedArticlePage = window.location.pathname.startsWith('/items/')

if (isVintedArticlePage) {
	console.log('Vinted article page detected')
	// UI injection will be implemented in later tasks
}

export {}
