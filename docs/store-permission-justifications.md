# Chrome Web Store — Permission Justifications

Copy/paste these into the Chrome Web Store developer dashboard when resubmitting Candidex.

## host_permissions

### `https://api.groq.com/*`
Candidex sends job-posting text from the user's selected page region to the user's chosen AI provider for structured extraction (role, company, location). This host is used only when the user configures Groq as their provider and initiates AI capture.

### `https://openrouter.ai/*`
Same as above for users who configure OpenRouter as their AI provider. Requests include only the text the user selected and the user's own API key; no data is sent to Candidex servers.

### `https://generativelanguage.googleapis.com/*`
Same as above for users who configure Google Gemini as their AI provider.

### `https://api.deepseek.com/*`
Same as above for users who configure DeepSeek as their AI provider.

### `https://api.anthropic.com/*`
Same as above for users who configure Anthropic as their AI provider.

### `https://api.openai.com/*`
Same as above for users who configure OpenAI as their AI provider.

## permissions

### `scripting`
Injects the Candidex content script on the active tab when the user opens the extension or starts AI capture. Required because the extension has no static `content_scripts` — injection is user-initiated only.

### `tabs`
Reads the active tab URL to attach job links to captured applications and to open the side panel on the correct page.

### `activeTab`
Grants temporary access to the current tab when the user clicks the extension icon or starts capture, without requesting broad `<all_urls>` access.

### `identity`
Used for Google OAuth sign-in so the user can connect their own Google account and store job applications in their own Google Sheet (`drive.file` scope only).

### `storage`
Stores the user's spreadsheet ID, cached application rows, AI provider settings, and API keys locally in `chrome.storage` on the user's device. No cloud backend.

## OAuth scope

### `https://www.googleapis.com/auth/drive.file`
Creates and updates a spreadsheet named "Candidex - Job Applications" in the user's Google Drive. Access is limited to files the app creates or opens; Candidex cannot read the user's other Drive files.

## Privacy policy URL

Use: `https://sebai-dhia.github.io/candidex/docs/privacy-policy.html`
