# LangFlow Troubleshooting & Diagnostics

## Common Scenarios & Resolutions

### 1. AI Toolbar is Inactive or Grayed Out
- **Cause**: Active field is detected as a secure password or PIN input.
- **Resolution**: This is a core security feature protecting user credentials. The keyboard remains fully operational for normal typing.

### 2. "You're offline. Normal keyboard features are still available"
- **Cause**: Network connection is unavailable or backend gateway is unreachable.
- **Resolution**: Normal typing continues locally without issue. When connectivity is restored, cloud translation and reply features resume automatically.

### 3. "AI service is temporarily unavailable"
- **Cause**: Upstream AI provider rate limit or temporary server spike.
- **Resolution**: LangFlow's deterministic offline fallback engine handles common high-frequency phrases automatically, preserving continuous typing flow.

### 4. iOS Globe Key Does Not Switch
- **Cause**: iOS system requires multiple keyboards to be enabled under Settings > General > Keyboard > Keyboards.
- **Resolution**: Enable at least one additional keyboard in iOS settings.
