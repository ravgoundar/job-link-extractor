/**
 * Job Link Extractor - LinkedIn Content Script
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

  const logger = createLogger('linkedin_content_script')
  logger.info('Extraction script injected and running...')

  const siteType = 'linkedin'
  const jobLinks = new Set()

  // Comprehensive selectors to find job links in various page layouts
  const selectors = [
    // Primary job search results list
    '.jobs-search-results-list a[href*="/jobs/view/"]',
    'a.job-card-list__title',
    // Job cards in different containers
    '.job-card-container__link',
    '.job-card-job-posting-card-wrapper a',
    '.job-card-container a',
    // Links within the main job description panel
    '.jobs-description__container a[href*="/jobs/view/"]',
    // General container for job lists
    '.scaffold-layout__list-container a[href*="/jobs/view/"]',
    // Specific list item links
    'li.jobs-search-results__list-item a',
    // Job recommendation carousels and sections
    '.jobs-home-recent-searches__list-item a',
    '.job-recommendations-carousel__list-item a',
    '.jobs-similar-jobs__list-item a',
    // "People also viewed" and discovery sections
    '.jobs-job-discovery-card__job-title a',
    'a[data-tracking-control-name="public_jobs_jserp-result_search-card"]',
    'a[data-tracking-control-name="public_jobs_job-result-card_result-card_full-click"]',
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
        const cleanedUrl = cleanJobUrl(href)
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

  const uniqueLinks = Array.from(jobLinks).sort()
  logger.info(`Extraction complete. Found ${uniqueLinks.length} unique job links.`)

  // This return value is what chrome.scripting.executeScript receives
  return uniqueLinks
})()
