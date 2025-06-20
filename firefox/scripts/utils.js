/**
 * Job Link Extractor - Utility Functions
 * Shared utilities for content scripts and link processing
 */

;(function () {
  // Logger utility for content scripts
  const createLogger = (name) => ({
    info: (message, ...args) => console.log(`[${name}] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[${name}] ${message}`, ...args),
    error: (message, ...args) => console.error(`[${name}] ${message}`, ...args),
    debug: (message, ...args) => console.debug(`[${name}] ${message}`, ...args),
  })

  /**
   * Clean a job URL by removing tracking parameters and hash fragments
   * @param {string} url - The original job URL
   * @param {Object} options - Cleaning options
   * @returns {string} The cleaned URL
   */
  function cleanJobUrl(url, options = {}) {
    const {
      removeTracking = true,
      removeHash = true,
      removeQueryParams = [],
      preserveQueryParams = [],
    } = options

    if (!url || typeof url !== 'string') {
      return ''
    }

    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()

      if (hostname.includes('linkedin.com')) {
        const searchParams = new URLSearchParams(urlObj.search)
        const pathJobId = urlObj.pathname.match(/\/jobs\/view\/(\d+)/)?.[1]
        const queryJobId = searchParams.get('currentJobId')
        const jobId = pathJobId || queryJobId

        if (jobId) {
          // Construct the canonical job URL
          return `https://www.linkedin.com/jobs/view/${jobId}`
        }
        // If it's a LinkedIn URL but we can't parse a valid job ID, return an
        // empty string so it gets filtered out.
        return ''
      }

      // Fallback to original cleaning logic for other sites
      urlObj.hash = ''
      if (removeTracking) {
        urlObj.search = ''
      }

      return urlObj.toString()
    } catch (error) {
      console.warn('Error cleaning URL:', url, error)
      // Fallback: simple string manipulation
      return cleanUrlFallback(url, { removeHash, removeTracking })
    }
  }

  /**
   * Fallback URL cleaning using string manipulation
   * @param {string} url - The original URL
   * @param {Object} options - Cleaning options
   * @returns {string} The cleaned URL
   */
  function cleanUrlFallback(url, options = {}) {
    const { removeHash = true, removeTracking = true } = options

    let cleaned = url

    // Remove hash
    if (removeHash) {
      const hashIndex = cleaned.indexOf('#')
      if (hashIndex !== -1) {
        cleaned = cleaned.substring(0, hashIndex)
      }
    }

    // Remove query parameters if needed
    if (removeTracking) {
      const queryIndex = cleaned.indexOf('?')
      if (queryIndex !== -1) {
        cleaned = cleaned.substring(0, queryIndex)
      }
    }

    return cleaned
  }

  /**
   * Validate if a URL is a job listing URL
   * @param {string} url - The URL to validate
   * @param {string} site - The site type (seek, linkedin, indeed, etc.)
   * @returns {boolean} Whether the URL is a valid job listing
   */
  function isValidJobUrl(url, site) {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      const pathname = urlObj.pathname.toLowerCase()

      switch (site) {
        case 'seek':
          return (
            (hostname.includes('seek.co.nz') || hostname.includes('seek.com.au')) &&
            pathname.includes('/job/')
          )

        case 'linkedin':
          return hostname.includes('linkedin.com') && pathname.includes('/jobs/')

        case 'indeed':
          return (
            hostname.includes('indeed.com') &&
            (pathname.includes('/viewjob') || pathname.includes('/jobs'))
          )

        case 'trademe':
          return (
            hostname.includes('trademe.co.nz') &&
            pathname.includes('/jobs/') &&
            !pathname.includes('/browse/')
          )

        default:
          return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Extract job information from a URL
   * @param {string} url - The job URL
   * @param {string} site - The site type
   * @returns {Object} Job information object
   */
  function extractJobInfo(url, site) {
    const info = {
      url: url,
      site: site,
      id: null,
      title: null,
      company: null,
    }

    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      switch (site) {
        case 'seek':
          // Extract job ID from Seek URL
          const seekMatch = pathname.match(/\/job\/(\d+)/)
          if (seekMatch) {
            info.id = seekMatch[1]
          }
          break

        case 'linkedin':
          // Extract job ID from LinkedIn URL
          const linkedinMatch = pathname.match(/\/jobs\/view\/(\d+)/)
          if (linkedinMatch) {
            info.id = linkedinMatch[1]
          }
          break

        case 'indeed':
          // Extract job key from Indeed URL
          const jobkey = urlObj.searchParams.get('jk')
          if (jobkey) {
            info.id = jobkey
          }
          break

        case 'trademe':
          // Extract listing ID from Trade Me URL
          const trademeMatch = pathname.match(/\/(\d+)$/)
          if (trademeMatch) {
            info.id = trademeMatch[1]
          }
          break
      }
    } catch (error) {
      console.warn('Error extracting job info from URL:', url, error)
    }

    return info
  }

  /**
   * Deduplicate an array of URLs
   * @param {string[]} urls - Array of URLs
   * @param {Object} options - Deduplication options
   * @returns {string[]} Deduplicated array
   */
  function deduplicateUrls(urls, options = {}) {
    const { cleanFirst = true, sortResult = true } = options

    if (!Array.isArray(urls)) {
      return []
    }

    // Clean URLs first if requested
    const processedUrls = cleanFirst ? urls.map((url) => cleanJobUrl(url)) : urls

    // Remove duplicates using Set
    const uniqueUrls = [...new Set(processedUrls.filter((url) => url && url.trim()))]

    // Sort if requested
    if (sortResult) {
      uniqueUrls.sort()
    }

    return uniqueUrls
  }

  /**
   * Format URLs for display
   * @param {string[]} urls - Array of URLs
   * @param {Object} options - Formatting options
   * @returns {string} Formatted string
   */
  function formatUrls(urls, options = {}) {
    const { separator = '\n', includeIndex = false, includeCount = false } = options

    if (!Array.isArray(urls) || urls.length === 0) {
      return ''
    }

    let formatted = urls

    if (includeIndex) {
      formatted = urls.map((url, index) => `${index + 1}. ${url}`)
    }

    let result = formatted.join(separator)

    if (includeCount) {
      result = `Total: ${urls.length} links\n${result}`
    }

    return result
  }

  /**
   * Debounce function to limit function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  /**
   * Throttle function to limit function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  function throttle(func, limit) {
    let inThrottle
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  // Export functions for use in other scripts
  const jobLinkExtractorUtils = {
    createLogger,
    cleanJobUrl,
    isValidJobUrl,
    extractJobInfo,
    deduplicateUrls,
    formatUrls,
    debounce,
    throttle,
  }

  // Export for browser environment (content scripts)
  if (typeof window !== 'undefined') {
    window.createLogger = createLogger
    window.cleanJobUrl = cleanJobUrl
    window.isValidJobUrl = isValidJobUrl
    window.extractJobInfo = extractJobInfo
    window.deduplicateUrls = deduplicateUrls
    window.formatUrls = formatUrls
    window.debounce = debounce
    window.throttle = throttle
  }

  // Export for Node.js environment (if used for testing)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = jobLinkExtractorUtils
  }
})()
