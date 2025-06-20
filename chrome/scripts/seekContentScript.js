/**
 * Job Link Extractor - Seek Content Script
 * This entire file is a single function that is injected and executed.
 * It must return the extracted links.
 */
;(() => {
  // Ensure utility functions are available before proceeding
  if (
    typeof createLogger === 'undefined' ||
    typeof cleanJobUrl === 'undefined' ||
    typeof isValidJobUrl === 'undefined'
  ) {
    console.error('Job Link Extractor: Utility functions not available. Halting execution.')
    return [] // Return empty array if utils aren't loaded
  }

  const logger = createLogger('seek_content_script')
  logger.info('Extraction script injected and running...')

  const siteType = 'seek'
  const jobLinks = new Set()

  // Comprehensive selectors to find job links in various page layouts
  const selectors = [
    // Main job listing links
    'a[href*="/job/"]',
    // Job card links
    '[data-automation="jobTitle"] a',
    '[data-automation="jobCard"] a[href*="/job/"]',
    // Search result links
    '[data-cy="jobTitle"] a',
    '[data-testid="job-title"] a',
    // Legacy selectors
    '.job-tile a[href*="/job/"]',
    '.jobAdTile a[href*="/job/"]',
    // Modern job card selectors
    '[data-job-id] a[href*="/job/"]',
    // Job detail page related jobs
    '.related-jobs a[href*="/job/"]',
    // Sponsored job links
    '[data-automation="sponsoredJob"] a[href*="/job/"]',
  ]

  logger.debug('Using selectors:', selectors)

  const combinedSelector = selectors.join(', ')
  const anchorElements = document.querySelectorAll(combinedSelector)

  logger.info(`Found ${anchorElements.length} potential job link elements.`)

  anchorElements.forEach((anchor, index) => {
    try {
      const href = anchor.href
      if (!href) {
        logger.debug(`Skipping element ${index}: no href attribute.`)
        return
      }

      // Use the validation and cleaning functions from utils.js
      if (isValidJobUrl(href, siteType)) {
        const cleanedUrl = cleanJobUrl(href, {
          removeTracking: true,
          removeHash: true,
          preserveQueryParams: [], // Don't preserve any query params for Seek
        })
        if (cleanedUrl && cleanedUrl.trim()) {
          jobLinks.add(cleanedUrl)
          logger.debug(`Added job link: ${cleanedUrl}`)
        }
      } else {
        logger.debug(`Skipping invalid or non-job URL: ${href}`)
      }
    } catch (error) {
      logger.error(`Error processing element ${index}:`, error)
    }
  })

  // Additional extraction for dynamically loaded content
  try {
    // Look for JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
    jsonLdScripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent)
        if (data && data.url && data.url.includes('/job/')) {
          const cleanedUrl = cleanJobUrl(data.url)
          if (cleanedUrl) {
            jobLinks.add(cleanedUrl)
            logger.debug('Found job link in JSON-LD:', cleanedUrl)
          }
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    })
  } catch (error) {
    logger.error('Error extracting dynamic links from JSON-LD:', error)
  }

  const uniqueLinks = Array.from(jobLinks).sort()
  logger.info(`Extraction complete. Found ${uniqueLinks.length} unique job links.`)

  // This return value is what chrome.scripting.executeScript receives
  return uniqueLinks
})()
