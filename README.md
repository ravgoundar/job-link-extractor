# Job Link Extractor

![Job Link Extractor Icon](chrome/icons/icon128.png)

A cross-browser extension for Chrome and Firefox that helps you quickly extract and clean job links from popular job board websites.

## Supported Sites

- **Seek** (`seek.co.nz`, `seek.com.au`)
- **LinkedIn** (`linkedin.com/jobs`)

## Features

- **One-Click Extraction**: Scans the active page and extracts all relevant job links with a single click.
- **Automatic URL Cleaning**: Removes tracking parameters and other unnecessary fragments from URLs, giving you clean, shareable links.
- **Deduplication**: Automatically removes any duplicate links found on the page.
- **Copy to Clipboard**: Easily copy all unique links to your clipboard.
- **Cross-Browser Support**: Works on both Google Chrome and Mozilla Firefox.

## Installation

### For Google Chrome

1.  **Install from the Chrome Web Store**: (Link will be here once published)
2.  **Manual Installation**:
    - Download the latest release from the [Releases](https://github.com/rav-goundar/job-link-extractor/releases) page.
    - Unzip the downloaded file.
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable "Developer mode" in the top right corner.
    - Click "Load unpacked" and select the `chrome` directory from the unzipped folder.

### For Mozilla Firefox

1.  **Install from the Firefox Browser Add-ons**: (Link will be here once published)
2.  **Manual Installation**:
    - Download the latest release from the [Releases](https://github.com/rav-goundar/job-link-extractor/releases) page.
    - Unzip the downloaded file.
    - Open Firefox and navigate to `about:debugging`.
    - Click on "This Firefox".
    - Click "Load Temporary Add-on..." and select the `manifest.json` file inside the `firefox` directory.

## Development

Interested in contributing? Here’s how to set up the extension for development.

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/rav-goundar/job-link-extractor.git
    cd job-link-extractor
    ```

2.  **Loading the extension**:
    - **Chrome**: Follow the manual installation steps above, but select the `chrome` directory from your local repository clone.
    - **Firefox**: Follow the manual installation steps above, but select the `manifest.json` file from the `firefox` directory in your local repository clone.

After making changes to the code, you will need to reload the extension from the `chrome://extensions` or `about:debugging` page to see them take effect.

## Project Structure

The repository is organized into two main directories, one for each browser. Most of the code is shared, with only the `manifest.json` file being significantly different.

```
job-link-extractor/
├── chrome/                 # Source code for the Chrome extension
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── ...
├── firefox/                # Source code for the Firefox addon
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── ...
└── README.md               # This file
```

## Contributing

Contributions are welcome! If you have a suggestion for a new feature, find a bug, or want to add support for another job site, please feel free to:

- [Open an issue](https://github.com/rav-goundar/job-link-extractor/issues) to discuss the change.
- [Submit a pull request](https://github.com/rav-goundar/job-link-extractor/pulls) with your improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
