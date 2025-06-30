# 🕐 Date Spoofer Chrome Extension

A production-ready Chrome extension that spoofs JavaScript Date objects to simulate different dates on web pages. Perfect for testing time-sensitive applications, development scenarios, and demonstrating date-dependent functionality with advanced domain whitelisting and intelligent spoofing controls.

## ✨ Key Features

### 🎯 **Dual Spoofing Modes**
- **Standard Date Spoofing**: Select any specific date with full control
- **Quick Tomorrow Spoof**: Instantly jump to tomorrow's date with one click
- **Mutually Exclusive**: Only one mode can be active at a time for safety

### 🌐 **Smart Domain Control**
- **Domain Whitelisting**: Control exactly which websites are affected
- **Intelligent Subdomain Matching**: Adding `example.com` automatically includes all subdomains
- **Local Development Support**: Special handling for `localhost`, `127.0.0.1`, and `file://` protocols
- **Global vs Targeted**: Choose between affecting all sites or only whitelisted domains

### 🧠 **Intelligent Date Spoofing**
- **Context-Aware**: Only spoofs `new Date()` calls and timestamps close to current time
- **Preserves Existing Dates**: Historical dates and specific timestamps remain unchanged
- **Smart Detection**: Distinguishes between current time requests and date calculations
- **Memory Leak Prevention**: Comprehensive cleanup when disabled

### 🎨 **Modern User Interface**
- **Intuitive Calendar Picker**: Easy date selection with visual feedback
- **Real-time Status Indicators**: Clear visual confirmation of active modes
- **Smooth Animations**: Professional transitions and loading states
- **Error Handling**: User-friendly error messages and recovery

### 🔧 **Production-Ready Architecture**
- **Service Worker Background**: Efficient Chrome Manifest V3 implementation
- **Content Script Injection**: Precise script injection based on domain rules
- **Settings Synchronization**: Chrome sync storage across devices
- **Performance Optimized**: Caching, debouncing, and memory management
- **Comprehensive Cleanup**: Complete restoration of original Date objects

## 🚀 Installation

### From Source
1. **Download or Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** using the toggle in the top-right corner
4. **Click "Load Unpacked"** and select the extension directory
5. **Pin Extension** to your toolbar by clicking the puzzle piece icon and pinning "Date Spoofer"

### Verification
- Extension icon should appear in your toolbar
- Click the icon to open the popup interface
- Verify the calendar shows tomorrow's date by default

## 📖 How to Use

### Basic Date Spoofing

#### Standard Mode
1. **Click the extension icon** to open the popup
2. **Select your target date** using the calendar picker
3. **Toggle "Enable Time Spoofing"** to activate
4. **Refresh affected pages** to apply the spoofed date

#### Quick Tomorrow Mode
1. **Click the extension icon** to open the popup
2. **Toggle "Quick Tomorrow Spoof"** for instant tomorrow spoofing
3. **Refresh affected pages** to see the effect

> **Note**: Only one spoofing mode can be active at a time. Enabling one automatically disables the other.

### Domain Whitelisting Setup

#### Global Spoofing (All Sites)
- **Leave "Enable Whitelist" unchecked** to affect all websites
- Extension will spoof dates on every site you visit

#### Targeted Spoofing (Specific Sites)
1. **Check "Enable Whitelist"** in the popup
2. **Add domains** to the text area, one per line:
   ```
   example.com
   testsite.com
   myapp.com
   ```
3. **Automatic Subdomain Matching**: Adding `example.com` includes:
   - `www.example.com`
   - `api.example.com`
   - `app.example.com`
   - Any other `*.example.com` subdomain

#### Local Development
For testing local applications, add these domains:
```
localhost
127.0.0.1
file
```

## 🎯 Real-World Use Cases

### **E-commerce & Delivery Services Testing**
Test how time-sensitive web applications behave with different dates:
1. Add relevant domains to whitelist
2. Set date to tomorrow or future date
3. Navigate to the application
4. Observe how the system handles future dates

### **Web Application Development**
Test time-sensitive features in your applications:
- **Expiration Testing**: See how your app handles expired sessions/tokens
- **Scheduling Systems**: Test calendar and booking applications
- **Time-based UI**: Verify date-dependent interface changes
- **Deadline Management**: Test reminder systems and due date handling

### **Quality Assurance & Testing**
- **Automated Testing**: Include in QA workflows for date-sensitive features
- **Edge Case Testing**: Test boundary conditions around date transitions
- **User Acceptance Testing**: Demonstrate functionality to stakeholders
- **Regression Testing**: Ensure date handling remains stable across updates

### **Educational & Demonstration**
- **Feature Demos**: Show how applications behave on different dates
- **Training Sessions**: Demonstrate date-dependent functionality
- **Bug Reproduction**: Recreate date-specific issues for debugging

## 🔧 Technical Details

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │  Background     │    │  Content Script │
│   popup.html/js │◄──►│  Service Worker │◄──►│   inject.js     │
│                 │    │  background.js  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                         ┌─────────────────┐    ┌─────────────────┐
                         │ Chrome Storage  │    │  Spoof Script   │
                         │ Settings Sync   │    │   spoof.js      │
                         └─────────────────┘    └─────────────────┘
```

### Core Components

#### **Background Service Worker** (`background.js`)
- Manages extension state and settings
- Handles message passing between components
- Orchestrates tab reloading and cleanup operations
- Implements retry logic and error recovery
- Prevents memory leaks with periodic cache clearing

#### **Content Script** (`inject.js`)
- Evaluates domain whitelisting rules
- Conditionally injects spoofing scripts
- Handles domain-specific logic and edge cases
- Manages script loading and error handling

#### **Date Spoofing Engine** (`spoof.js`)
- Overrides JavaScript `Date` constructor and `Date.now()`
- Implements intelligent spoofing logic:
  - Spoofs `new Date()` calls (current time requests)
  - Spoofs timestamps within 1 hour of current time
  - Preserves historical dates and specific date constructions
- Maintains complete compatibility with existing code
- Provides comprehensive cleanup and restoration

#### **Popup Interface** (`popup.html/js`)
- Modern, responsive user interface
- Real-time status updates and visual feedback
- Form validation and error handling
- Settings persistence and synchronization
- Debounced input handling for performance

#### **Shared Utilities** (`utils.js`)
- Common functions and constants
- Storage abstraction with error handling
- Domain parsing and matching logic
- Performance optimization utilities
- Cross-component type definitions

### How Date Spoofing Works

1. **Domain Check**: Content script evaluates current domain against whitelist
2. **Script Injection**: If domain is allowed, injects spoofing script into page
3. **Date Override**: Spoofing script replaces `window.Date` with custom implementation
4. **Smart Spoofing**: Only affects new Date() calls and recent timestamps
5. **Preservation**: Historical dates and specific date constructions remain unchanged
6. **Cleanup**: Complete restoration when disabled or on page unload

### Security & Privacy

#### **Privacy Focused**
- **No External Communication**: All processing happens locally
- **No Data Collection**: No analytics, tracking, or user data harvesting
- **Local Storage Only**: Settings stored in Chrome's encrypted sync storage
- **Minimal Permissions**: Only requests necessary Chrome APIs

#### **Security Measures**
- **Input Validation**: Comprehensive sanitization of user inputs
- **XSS Prevention**: Protection against script injection attacks
- **Domain Validation**: Strict domain parsing and validation rules
- **Error Boundaries**: Graceful failure handling without exposing internals

## 🛠️ Development

### Project Structure
```
📦 Date-Spoofer-Extension/
├── 📄 manifest.json          # Extension configuration
├── 🎨 popup.html             # User interface
├── ⚙️ popup.js               # UI logic and event handling
├── 🔄 background.js          # Service worker & state management
├── 🎯 inject.js              # Content script & domain filtering
├── 🕰️ spoof.js               # Core date spoofing engine
├── 🧹 cleanup.js             # Date restoration script
├── 🔧 utils.js               # Shared utilities & constants
├── 🖼️ icon.png               # Extension icon
├── 🧪 test.html              # Testing interface
├── 🧪 whitelist-test.html    # Whitelist testing tools
└── 📖 README.md              # Documentation
```

### Testing

#### **Manual Testing**
1. **Load extension** in developer mode
2. **Open test.html** in your browser
3. **Follow test instructions** to verify functionality
4. **Test different domains** with various whitelist configurations

#### **Whitelist Testing**
1. **Open whitelist-test.html** for domain testing
2. **Test subdomain matching** with various configurations
3. **Verify local development** domain handling

#### **Production Testing**
- Test on various websites to ensure compatibility
- Verify cleanup works correctly when disabling
- Check memory usage during extended use
- Validate settings synchronization across Chrome instances

### Development Setup

#### **No Build Process Required**
This extension uses vanilla JavaScript and requires no compilation or build tools.

#### **Development Workflow**
1. **Make changes** to source files
2. **Reload extension** on `chrome://extensions/`
3. **Test changes** on target websites
4. **Use Chrome DevTools** for debugging

#### **Debugging Tips**
- **Background Script**: Check `chrome://extensions/` → Extension Details → Service Worker
- **Content Scripts**: Use regular DevTools on affected pages
- **Popup Scripts**: Right-click popup → Inspect
- **Storage Inspection**: Chrome DevTools → Application → Storage

## 📊 Performance Considerations

### **Optimizations Implemented**
- **Caching**: Domain parsing and whitelist checking results cached
- **Debouncing**: User input handling debounced to prevent excessive processing
- **Memory Management**: Automatic cleanup of caches and references
- **Lazy Loading**: Scripts only injected when needed
- **Minimal DOM Manipulation**: Efficient script injection and cleanup

### **Resource Usage**
- **Memory**: ~2-5MB typical usage
- **CPU**: Minimal impact during normal operation
- **Storage**: <1KB for typical settings
- **Network**: No external requests made

## 🤝 Contributing

We welcome contributions! Here's how to help:

### **Bug Reports**
- Use the GitHub issue tracker
- Include browser version and extension version
- Provide steps to reproduce the issue
- Include any console errors or unusual behavior

### **Feature Requests**
- Describe the use case and expected behavior
- Consider backward compatibility implications
- Discuss security and privacy implications

### **Pull Requests**
- Follow existing code style and patterns
- Include tests for new functionality
- Update documentation as needed
- Ensure no breaking changes without version bump

## 📜 License

This project is open source and available under the **MIT License**.

## ⚠️ Important Disclaimers

### **Responsible Use**
- This extension is designed for **development, testing, and educational purposes**
- Always respect website terms of service and applicable laws
- Use responsibly and ethically in professional environments

### **Limitations**
- Only affects **client-side JavaScript** Date objects
- Does not modify **server-side** timestamps or responses
- May not work on sites with **Content Security Policy** restrictions
- **Some single-page applications** may require page refresh to see changes

### **Compatibility**
- **Chrome/Chromium**: Fully supported (Manifest V3)
- **Edge**: Should work with Chrome extension support
- **Firefox**: Not currently supported (different extension format)
- **Safari**: Not supported

## 🆘 Troubleshooting

### **Common Issues**

#### **Spoofing Not Working**
1. Check if domain is in whitelist (if whitelist is enabled)
2. Refresh the page after enabling spoofing
3. Verify extension is enabled in Chrome extensions page
4. Check for console errors in browser DevTools

#### **Popup Not Opening**
1. Reload the extension on `chrome://extensions/`
2. Check for Chrome extension permissions
3. Try disabling and re-enabling the extension

#### **Settings Not Saving**
1. Ensure Chrome sync is enabled
2. Check Chrome storage permissions
3. Try clearing extension data and reconfiguring

### **Advanced Troubleshooting**
- **Service Worker Issues**: Check background script logs
- **Content Script Problems**: Use DevTools on affected pages
- **Storage Issues**: Inspect Chrome storage in DevTools
- **Permission Problems**: Review manifest.json permissions

---

**Need help?** Open an issue on GitHub or check the troubleshooting section above. 
