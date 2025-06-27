# Time Logger App - Component Structure

This document describes the refactored component structure of the Time Logger App.

## Overview

The app has been split from a single 1443-line `App.js` file into multiple maintainable components and utilities.

## File Structure

```
components/
├── README.md                 # This file
├── utils.js                  # Utility functions
├── exportUtils.js           # Export/Import utilities
├── hooks/
│   ├── useTimer.js          # Timer functionality hook
│   └── useLocalStorage.js   # Data persistence hook
├── Header.js                # App header with menu
├── InfoDialog.js            # Information dialog
├── DemoBanner.js            # Demo mode banners
├── TabBar.js                # Navigation tabs
├── GroupList.js             # Group management and time tracking
├── ReportTab.js             # Reporting and charts
└── Footer.js                # App footer
```

## Components

### Core Components

- **Header.js** - App header with hamburger menu, title, and info button
- **InfoDialog.js** - Modal dialog with app information and instructions
- **DemoBanner.js** - Banners for demo mode (entry and active state)
- **TabBar.js** - Navigation between Log and Report tabs
- **GroupList.js** - Main time tracking interface with groups, timers, and entries
- **ReportTab.js** - Reporting interface with charts and export options
- **Footer.js** - App footer with credits and links

### Utilities

- **utils.js** - Formatting functions, data processing, and utility helpers
- **exportUtils.js** - Export/import functionality for JSON, CSV, and PDF

### Hooks

- **useTimer.js** - Custom hook for timer functionality with auto-refresh
- **useLocalStorage.js** - Custom hook for data persistence and demo mode

## Benefits of Refactoring

1. **Maintainability** - Each component has a single responsibility
2. **Reusability** - Components can be easily reused or tested independently
3. **Readability** - Smaller, focused files are easier to understand
4. **Debugging** - Issues can be isolated to specific components
5. **Collaboration** - Multiple developers can work on different components

## Usage

The main app file (`App-new.js`) imports and orchestrates all components:

```javascript
import { Header } from './components/Header.js';
import { GroupList } from './components/GroupList.js';
// ... other imports
```

To switch to the new structure:
1. Replace the content of `App.js` with `App-new.js`
2. Ensure all component files are in the `components/` directory
3. Test that all functionality works as expected

## Component Props

Each component receives only the props it needs:

- **Header** - Export/import handlers, info toggle
- **GroupList** - Groups data and management functions
- **ReportTab** - Groups data, selections, and export functions
- **InfoDialog** - Open state and close handler

This clear prop interface makes the app easier to understand and modify. 