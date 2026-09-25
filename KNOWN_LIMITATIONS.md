# LangFlow Platform Compatibility & Known Limitations

## Platform Matrix

| Feature | Android | iOS | Windows (TSF) | macOS (IMK) |
|---|---|---|---|---|
| Local Normal Typing | Supported | Supported | Supported | Supported |
| AI Translation Toolbar | Supported | Supported (Full Access) | Supported | Supported |
| Context-Aware AI Reply | Supported | Supported | Supported | Supported |
| Tone Rewriter & Grammar | Supported | Supported | Supported | Supported |
| Selection Replacement | Full via InputConnection | Supported via Proxy | Supported via TSF Range | Supported via IMK Range |
| Password Isolation | Enforced (EditorInfo) | Enforced (SecureText) | Enforced | Enforced |
| Automatic Message Send | **Strictly Prohibited** | **Strictly Prohibited** | **Strictly Prohibited** | **Strictly Prohibited** |

## Platform Specific Limitations
- **iOS Memory Cap**: Custom Keyboard Extensions on iOS are constrained by Apple to ~30MB-48MB of RAM. Heavy background parsing or image processing is prohibited.
- **iOS Full Access**: Third-party keyboards cannot access network sockets unless the user explicitly grants "Allow Full Access" in Settings.
- **Android Samsung OneUI/MIUI aggressive battery savers**: Users must disable aggressive battery optimization for the IME service to ensure rapid wake-up.
