// Background service worker for Vinted AI Assistant
// Handles communication between content scripts and backend API

console.log('Vinted AI Assistant - Background service worker loaded')

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
	console.log('Vinted AI Assistant installed')
})

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === 'ANALYZE_ARTICLE') {
		// Will be implemented in later tasks
		sendResponse({ status: 'pending' })
	}
	return true // Keep the message channel open for async responses
})

export {}
