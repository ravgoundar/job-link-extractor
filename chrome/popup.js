/**
 * Job Link Extractor - Popup Script
 * Handles UI interactions and coordinates with content scripts
 */

// Logger utility for popup
const logger = {
  info: (message, ...args) => console.log(`[Popup] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[Popup] ${message}`, ...args),
  error: (message, ...args) => console.error(`[Popup] ${message}`, ...args),
}

// Site detection patterns
const SUPPORTED_SITES = {
  seek: {
    name: 'Seek',
    pattern: /^https:\/\/(www\.)?seek\.(co\.nz|com\.au)\//,
    contentScript: 'scripts/seekContentScript.js',
    utils: 'scripts/utils.js',
  },
  linkedin: {
    name: 'LinkedIn',
    pattern: /^https:\/\/(www\.)?linkedin\.com\//,
    contentScript: 'scripts/linkedinContentScript.js',
    utils: 'scripts/utils.js',
  },
}

class PopupController {
  constructor() {
    this.currentTab = null
    this.currentSite = null
    this.extractedLinks = []
    this.initializeElements()
    this.attachEventListeners()
    this.detectCurrentSite()
  }

  initializeElements() {
    // Buttons
    this.extractButton = document.getElementById('extractButton')
    this.copyToClipboardButton = document.getElementById('copyToClipboardButton')
    this.clearButton = document.getElementById('clearButton')
    this.actionButtons = document.querySelector('.action-buttons')

    // UI elements
    this.linksOutput = document.getElementById('linksOutput')
    this.outputSection = document.querySelector('.output-section')
    this.statusMessage = document.getElementById('statusMessage')
    this.linkCount = document.getElementById('linkCount')
    this.currentSiteElement = document.getElementById('currentSite')
    this.siteIndicator = this.currentSiteElement.querySelector('.site-indicator')
    this.siteText = this.currentSiteElement.querySelector('.site-text')
    this.siteButtons = document.querySelector('.site-buttons')
  }

  attachEventListeners() {
    this.extractButton.addEventListener('click', () => this.extractLinksFromCurrentSite())

    this.copyToClipboardButton.addEventListener('click', () => this.copyToClipboard())
    this.clearButton.addEventListener('click', () => this.clearOutput())
  }

  async detectCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      this.currentTab = tab

      if (!tab || !tab.url) {
        this.updateSiteInfo('No active tab', false)
        return
      }

      // Check which site we're on
      for (const [siteKey, siteConfig] of Object.entries(SUPPORTED_SITES)) {
        if (siteConfig.pattern.test(tab.url)) {
          this.currentSite = siteKey
          this.updateSiteInfo(`${siteConfig.name} detected`, true)
          this.enableExtractButton()
          return
        }
      }

      this.updateSiteInfo('Site not supported', false)
      this.disableExtractButton()
    } catch (error) {
      logger.error('Error detecting current site:', error)
      this.updateSiteInfo('Error detecting site', false)
    }
  }

  updateSiteInfo(text, isSupported) {
    this.siteText.textContent = text
    this.siteIndicator.className = `site-indicator ${isSupported ? 'supported' : 'unsupported'}`
  }

  enableExtractButton() {
    this.extractButton.disabled = false
    this.extractButton.style.display = 'block'
  }

  disableExtractButton() {
    this.extractButton.disabled = true
  }

  hideExtractButton() {
    this.siteButtons.style.display = 'none'
  }

  showExtractButton() {
    this.siteButtons.style.display = 'flex'
  }

  async extractLinksFromCurrentSite() {
    if (!this.currentSite) {
      this.displayStatus('No supported site detected', 'error')
      return
    }

    await this.extractLinks(this.currentSite)
  }

  async extractLinks(siteKey) {
    const siteConfig = SUPPORTED_SITES[siteKey]
    if (!siteConfig) {
      this.displayStatus('Invalid site configuration', 'error')
      return
    }

    // Clear previous results
    this.clearOutput()
    this.setButtonLoading(this.extractButton, true)

    try {
      // Validate current tab
      if (!this.currentTab || !this.currentTab.url) {
        throw new Error('No active tab found')
      }

      // Check if we're on the correct site
      if (!siteConfig.pattern.test(this.currentTab.url)) {
        throw new Error(`This is not a ${siteConfig.name} page`)
      }

      // Execute content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: [siteConfig.utils, siteConfig.contentScript],
      })

      // Process results
      if (results && results[0] && results[0].result !== undefined) {
        const cleanedLinks = results[0].result
        this.handleExtractionResults(cleanedLinks, siteConfig.name)
      } else {
        logger.error('Script execution results:', results)
        throw new Error('Failed to retrieve links from the page. Check console for details.')
      }
    } catch (error) {
      logger.error('Error during link extraction:', error)
      this.displayStatus(`Error: ${error.message}`, 'error')
    } finally {
      this.setButtonLoading(this.extractButton, false)
    }
  }

  handleExtractionResults(links, siteName) {
    this.extractedLinks = links || []

    if (this.extractedLinks.length > 0) {
      this.linksOutput.value = this.extractedLinks.join('\n')
      this.linksOutput.style.display = 'block'
      this.updateLinkCount(this.extractedLinks.length)
      this.outputSection.style.display = 'flex'
      this.showActionButtons()
      this.clearButton.style.display = 'block'
      this.hideExtractButton()
      this.hideStatus()
    } else {
      this.updateLinkCount(0)
      this.linksOutput.style.display = 'none'
      this.outputSection.style.display = 'flex'
      this.hideActionButtons()
      this.clearButton.style.display = 'none'
      this.hideStatus()
    }
  }

  setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('loading')
      button.disabled = true
    } else {
      button.classList.remove('loading')
      button.disabled = false
    }
  }

  async copyToClipboard() {
    if (!this.extractedLinks.length) {
      this.displayStatus('No links to copy', 'error')
      return
    }

    try {
      await navigator.clipboard.writeText(this.linksOutput.value)
      this.showCheckmark()
    } catch (error) {
      logger.warn('Clipboard API failed, falling back to legacy method:', error)
      this.fallbackCopyToClipboard(this.linksOutput.value)
    }
  }

  fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()

    try {
      const successful = document.execCommand('copy')
      if (successful) {
        this.showCheckmark()
      } else {
        this.displayStatus('Failed to copy links. Please copy manually.', 'error')
      }
    } catch (err) {
      logger.error('Fallback copy failed:', err)
      this.displayStatus('Failed to copy links. Please copy manually.', 'error')
    } finally {
      document.body.removeChild(textarea)
    }
  }

  clearOutput() {
    this.linksOutput.value = ''
    this.extractedLinks = []
    this.updateLinkCount(0)
    this.outputSection.style.display = 'none'
    this.hideActionButtons()
    this.showExtractButton()
    this.hideStatus()
  }

  updateLinkCount(count) {
    this.linkCount.textContent = `${count} links found`

    if (count === 0) {
      this.linkCount.classList.add('empty-state')
    } else {
      this.linkCount.classList.remove('empty-state')
    }
  }

  showActionButtons() {
    this.actionButtons.style.display = 'flex'
  }

  hideActionButtons() {
    this.actionButtons.style.display = 'none'
  }

  displayStatus(message, type = 'info') {
    if (type === 'error') {
      this.statusMessage.textContent = message
      this.statusMessage.className = `status-message ${type}`
      this.statusMessage.style.display = 'flex'
    }
  }

  hideStatus() {
    this.statusMessage.style.display = 'none'
    this.statusMessage.textContent = ''
  }

  showCheckmark() {
    const buttonContent = this.copyToClipboardButton.querySelector('.button-content')
    const copyButtonText = buttonContent.querySelector('.copy-button-text')
    const checkIcon = buttonContent.querySelector('.check-icon')

    copyButtonText.textContent = 'Copied'
    checkIcon.style.display = 'inline-block'

    setTimeout(() => {
      copyButtonText.textContent = 'Copy to Clipboard'
      checkIcon.style.display = 'none'
    }, 2000)
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  logger.info('Popup loaded, initializing controller')
  new PopupController()
})
