# APE Extension UI Modernization Plan

## Overview
This document outlines the plan for modernizing the APE Extension UI with minimal, luxury-style SVG icons to replace the current emoji-based interface elements.

## Goals
- Create a boutique/luxury brand aesthetic throughout the interface
- Replace all emoji icons with modern, minimal SVG icons
- Maintain consistency in design language across all UI elements
- Improve visual hierarchy and user experience

## Implementation Plan

### Phase 1: Core Chat Interface Icons ✅
- Create and implement SVG icons for primary chat functions:
  - Send message (send.svg)
  - Formatting options (format.svg)
  - Clear chat (clear.svg)
  - File attachment (attach.svg)
  - Smart prompting toggle (brain.svg)

### Phase 2: Action Button Icons ⏳
- Implement SVG icons for action buttons:
  - Copy (copy.svg)
  - Check/confirmation (check.svg)
  - Stop generation (stop.svg)
  - Search functionality (search.svg)
  - New file creation (new-file.svg)
  - File editing (edit-file.svg)

### Phase 3: Code Block UI Elements 🔜
- Replace icons in code block interface:
  - Copy code button
  - Language indicator
  - Insert code button
  - Execution controls

### Phase 4: Tree View and Navigation Icons 🔜
- Update navigation and structural UI elements:
  - Folder/file icons in tree view
  - Tab indicators
  - Status indicators
  - Command palette icons

### Phase 5: Notification and System Icons 🔜
- Implement icons for system functions:
  - Notifications
  - Settings
  - Help/information
  - Warning/error indicators
  - Success indicators

## Technical Implementation Details

### SVG Asset Management
- Store all SVG icons in `/media/icons/` directory
- Use consistent viewBox dimensions (24x24)
- Maintain consistent stroke width (1.5-2px)
- Ensure all icons have proper namespacing

### CSS Updates
- Modify `chat-ape-buttons.css` for SVG-specific styling
- Implement consistent hover/active states
- Ensure proper sizing and alignment
- Add transitions for smooth state changes

### HTML/JS Integration
- Update `_getHtmlForWebview.ts` to reference SVG icons
- Modify dynamic content generation in `chatViewService.ts`
- Ensure proper URI handling for VSCode webviews

## Testing Checklist
- Verify icons display correctly in light/dark themes
- Test responsiveness at different window sizes
- Ensure accessibility is maintained
- Verify all interactive states function correctly

## Status
- Phase 1: Complete
- Phase 2: In Progress
- Phases 3-5: Pending