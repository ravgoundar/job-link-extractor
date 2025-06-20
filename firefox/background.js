/**
 * Job Link Extractor - Background Service Worker
 * Manages extension lifecycle, storage, and cross-tab communication
 */

// Logger utility for background script
const logger = {
  info: (message, ...args) => console.log(`[Background] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[Background] ${message}`, ...args),
  error: (message, ...args) => console.error(`[Background] ${message}`, ...args),
}

// Default settings
const DEFAULT_SETTINGS = {
  enabledSites: {
    seek: true,
    linkedin: false,
    indeed: false,
    trademe: false,
  },
  uiSettings: {
    showNotifications: true,
    autoClose: false,
    theme: 'light',
  },
}

class BackgroundController {
  constructor() {
    this.initializeExtension()
    this.setupEventListeners()
  }

  async initializeExtension() {
    logger.info('Extension initializing...')

    try {
      // Initialize settings if not exists
      await this.initializeSettings()

      // Set up context menus
      await this.setupContextMenus()

      logger.info('Extension initialized successfully')
    } catch (error) {
      logger.error('Error initializing extension:', error)
    }
  }

  async initializeSettings() {
    try {
      const result = await chrome.storage.sync.get('settings')
      if (!result.settings) {
        await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS })
        logger.info('Default settings initialized')
      }
    } catch (error) {
      logger.error('Error initializing settings:', error)
      // Fallback to local storage if sync fails
      try {
        const localResult = await chrome.storage.local.get('settings')
        if (!localResult.settings) {
          await chrome.storage.local.set({ settings: DEFAULT_SETTINGS })
          logger.info('Default settings initialized in local storage')
        }
      } catch (localError) {
        logger.error('Error with local storage fallback:', localError)
      }
    }
  }

  async setupContextMenus() {
    try {
      // Remove existing context menus
      await chrome.contextMenus.removeAll()

      // Create context menu for extracting links
      chrome.contextMenus.create({
        id: 'extract-job-links',
        title: 'Extract Job Links',
        contexts: ['page'],
        documentUrlPatterns: [
          '*://*.seek.co.nz/*',
          '*://*.seek.com.au/*',
          '*://*.linkedin.com/*',
          '*://*.indeed.com/*',
          '*://*.trademe.co.nz/*',
        ],
      })

      logger.info('Context menus created')
    } catch (error) {
      logger.error('Error setting up context menus:', error)
    }
  }

  setupEventListeners() {
    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details)
    })

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab)
    })

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
      return true // Keep message channel open for async response
    })

    // Handle tab updates to manage badge
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab)
    })

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      logger.info('Extension started')
    })
  }

  handleInstalled(details) {
    logger.info('Extension installed/updated:', details.reason)

    switch (details.reason) {
      case 'install':
        this.handleFirstInstall()
        break
      case 'update':
        this.handleUpdate(details.previousVersion)
        break
    }
  }

  async handleFirstInstall() {
    logger.info('First install detected, showing welcome')

    try {
      // Open options page on first install
      await chrome.tabs.create({
        url: chrome.runtime.getURL('options.html'),
      })

      // Show welcome notification
      await this.showNotification('welcome', {
        title: 'Job Link Extractor Installed!',
        message: 'Click the extension icon on job sites to extract links.',
        iconUrl: 'icons/icon48.png',
      })
    } catch (error) {
      logger.error('Error handling first install:', error)
    }
  }

  async handleUpdate(previousVersion) {
    logger.info(
      `Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`,
    )

    try {
      // Check if settings need migration
      await this.migrateSettings(previousVersion)

      // Show update notification if enabled
      const settings = await this.getSettings()
      if (settings.uiSettings.showNotifications) {
        await this.showNotification('update', {
          title: 'Job Link Extractor Updated',
          message: 'New features and improvements available!',
          iconUrl: 'icons/icon48.png',
        })
      }
    } catch (error) {
      logger.error('Error handling update:', error)
    }
  }

  async migrateSettings(previousVersion) {
    try {
      const result = await chrome.storage.sync.get('settings')
      let settings = result.settings || {}

      // Add any missing default settings
      settings = { ...DEFAULT_SETTINGS, ...settings }

      // Version-specific migrations can be added here
      // if (previousVersion === '1.0') {
      //     // Migrate from version 1.0
      // }

      await chrome.storage.sync.set({ settings })
      logger.info('Settings migrated successfully')
    } catch (error) {
      logger.error('Error migrating settings:', error)
    }
  }

  async handleContextMenuClick(info, tab) {
    logger.info('Context menu clicked:', info.menuItemId)

    try {
      switch (info.menuItemId) {
        case 'extract-job-links':
          await this.extractLinksFromTab(tab)
          break
      }
    } catch (error) {
      logger.error('Error handling context menu click:', error)
    }
  }

  async extractLinksFromTab(tab) {
    try {
      // Determine which site we're on and extract accordingly
      const siteDetection = this.detectSite(tab.url)
      if (!siteDetection) {
        throw new Error('Unsupported site')
      }

      // Show notification that extraction is starting
      await this.showNotification('extracting', {
        title: 'Extracting Job Links',
        message: `Scanning ${siteDetection.name} for job links...`,
        iconUrl: 'icons/icon48.png',
      })

      // This would trigger the same extraction logic as the popup
      // For now, we'll just open the popup
      chrome.action.openPopup()
    } catch (error) {
      logger.error('Error extracting links from tab:', error)
      await this.showNotification('error', {
        title: 'Extraction Failed',
        message: error.message,
        iconUrl: 'icons/icon48.png',
      })
    }
  }

  detectSite(url) {
    const sitePatterns = {
      seek: {
        name: 'Seek',
        pattern: /^https:\/\/(www\.)?seek\.(co\.nz|com\.au)\//,
      },
      linkedin: {
        name: 'LinkedIn',
        pattern: /^https:\/\/(www\.)?linkedin\.com\//,
      },
      indeed: {
        name: 'Indeed',
        pattern: /^https:\/\/(www\.)?indeed\.com\//,
      },
      trademe: {
        name: 'Trade Me Jobs',
        pattern: /^https:\/\/(www\.)?trademe\.co\.nz\/a\/jobs\//,
      },
    }

    for (const [key, config] of Object.entries(sitePatterns)) {
      if (config.pattern.test(url)) {
        return { key, ...config }
      }
    }

    return null
  }

  async handleMessage(message, sender, sendResponse) {
    logger.info('Message received:', message.type)

    try {
      switch (message.type) {
        case 'getSettings':
          const settings = await this.getSettings()
          sendResponse({ success: true, data: settings })
          break

        case 'updateSettings':
          await this.updateSettings(message.data)
          sendResponse({ success: true })
          break

        case 'extractionComplete':
          await this.handleExtractionComplete(message.data)
          sendResponse({ success: true })
          break

        case 'showNotification':
          await this.showNotification(message.id, message.options)
          sendResponse({ success: true })
          break

        default:
          logger.warn('Unknown message type:', message.type)
          sendResponse({ success: false, error: 'Unknown message type' })
      }
    } catch (error) {
      logger.error('Error handling message:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    // Update badge when navigating to supported sites
    if (changeInfo.status === 'complete' && tab.url) {
      const siteDetection = this.detectSite(tab.url)
      if (siteDetection) {
        await this.updateBadge(tabId, 'active')
      } else {
        await this.updateBadge(tabId, 'inactive')
      }
    }
  }

  async updateBadge(tabId, status) {
    try {
      switch (status) {
        case 'active':
          await chrome.action.setBadgeText({ text: '●', tabId })
          await chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId })
          break
        case 'inactive':
          await chrome.action.setBadgeText({ text: '', tabId })
          break
        case 'extracting':
          await chrome.action.setBadgeText({ text: '...', tabId })
          await chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId })
          break
      }
    } catch (error) {
      logger.error('Error updating badge:', error)
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get('settings')
      return result.settings || DEFAULT_SETTINGS
    } catch (error) {
      logger.error('Error getting settings from sync storage:', error)
      // Fallback to local storage
      try {
        const localResult = await chrome.storage.local.get('settings')
        return localResult.settings || DEFAULT_SETTINGS
      } catch (localError) {
        logger.error('Error getting settings from local storage:', localError)
        return DEFAULT_SETTINGS
      }
    }
  }

  async updateSettings(newSettings) {
    try {
      await chrome.storage.sync.set({ settings: newSettings })
      logger.info('Settings updated in sync storage')
    } catch (error) {
      logger.error('Error updating settings in sync storage:', error)
      // Fallback to local storage
      try {
        await chrome.storage.local.set({ settings: newSettings })
        logger.info('Settings updated in local storage')
      } catch (localError) {
        logger.error('Error updating settings in local storage:', localError)
        throw localError
      }
    }
  }

  async handleExtractionComplete(data) {
    try {
      const settings = await this.getSettings()

      if (settings.uiSettings.showNotifications && data.linkCount > 0) {
        await this.showNotification('complete', {
          title: 'Links Extracted',
          message: `Found ${data.linkCount} job links from ${data.siteName}`,
          iconUrl: 'icons/icon48.png',
        })
      }

      // Update badge
      if (data.tabId) {
        await this.updateBadge(data.tabId, 'active')
      }
    } catch (error) {
      logger.error('Error handling extraction complete:', error)
    }
  }

  async showNotification(id, options) {
    try {
      const settings = await this.getSettings()
      if (!settings.uiSettings.showNotifications) {
        return
      }

      await chrome.notifications.create(id, {
        type: 'basic',
        ...options,
      })
    } catch (error) {
      logger.error('Error showing notification:', error)
    }
  }
}

// Initialize background controller
const backgroundController = new BackgroundController()

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason)
})
