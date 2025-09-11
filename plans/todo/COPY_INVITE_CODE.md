# Copy Invite Code Feature Plan

**Date**: January 2025  
**Status**: Planned  
**Priority**: High  
**Effort**: Small (1-2 hours)

## Overview

Add one-click copy functionality for group invite codes with visual feedback to improve user experience when sharing groups with friends.

## Current State Analysis

### Existing UI
- **GroupSelector.tsx**: Shows invite code in dropdown (line 48: `{currentGroup.inviteCode}`)
- **GroupSelector.tsx**: Shows invite code for each group in list (line 91: `Code: {group.inviteCode}`)
- Currently read-only display with no copy functionality

### User Pain Points
- Users must manually select and copy invite codes
- No visual confirmation of successful copy
- Cumbersome on mobile devices
- Risk of copying partial/incorrect codes

## Proposed Solution

### 1. UI/UX Design

#### Copy Button Integration
```tsx
// In GroupSelector dropdown
<div className="flex items-center justify-between">
  <span className="text-xs text-gray-400">Code: {group.inviteCode}</span>
  <button className="copy-button">
    <Copy size={12} />
  </button>
</div>
```

#### Visual States
- **Default**: Copy icon with subtle styling
- **Hover**: Highlighted with tooltip "Copy invite code"
- **Clicked**: Brief animation + checkmark icon
- **Success**: Toast notification "Invite code copied!"

### 2. Component Modifications

#### GroupSelector.tsx Updates
```tsx
import { Copy, Check } from 'lucide-react'

// Add state for copy feedback
const [copiedCode, setCopiedCode] = useState<string | null>(null)

// Copy handler with modern Clipboard API
const handleCopyCode = async (inviteCode: string) => {
  try {
    await navigator.clipboard.writeText(inviteCode)
    setCopiedCode(inviteCode)
    // Show success toast
    setTimeout(() => setCopiedCode(null), 2000)
  } catch (err) {
    // Fallback for older browsers
    fallbackCopyTextToClipboard(inviteCode)
  }
}
```

#### New Toast Component (Optional)
- Simple toast notification system
- Auto-dismiss after 2 seconds
- Positioned at top-right of screen

### 3. Technical Implementation

#### Browser Compatibility
```tsx
// Modern Clipboard API with fallback
const copyToClipboard = async (text: string): Promise<boolean> => {
  // Modern approach
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      return false
    }
  }
  
  // Fallback for older browsers
  return fallbackCopyTextToClipboard(text)
}

const fallbackCopyTextToClipboard = (text: string): boolean => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  
  try {
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  } catch (err) {
    document.body.removeChild(textArea)
    return false
  }
}
```

### 4. Integration Points

#### Current Group Display
- Add copy button next to invite code in header area
- Main group selector button could show copy icon on hover

#### Group List
- Each group in dropdown gets individual copy button
- Prevent dropdown close when copy button is clicked

### 5. Mock Mode Implementation

```tsx
// In mock mode, same functionality applies
// No special handling needed - invite codes work identically
if (isMockMode) {
  // Same copy functionality, demo invite codes
}
```

## Implementation Steps

### Phase 1: Core Functionality (30 minutes)
1. Add copy button to GroupSelector dropdown
2. Implement clipboard copy with fallback
3. Add visual feedback (icon change)

### Phase 2: Enhanced UX (30 minutes)
1. Add hover tooltips
2. Implement toast notifications
3. Add copy button to main group display

### Phase 3: Polish (30 minutes)
1. Add smooth animations
2. Test on mobile devices
3. Accessibility improvements (aria-labels, keyboard support)

## User Flow

### Happy Path
1. User opens group selector dropdown
2. User sees invite code with copy icon
3. User clicks copy button
4. Icon changes to checkmark briefly
5. Toast shows "Invite code copied!"
6. User can paste code elsewhere

### Edge Cases
- **Copy fails**: Show error toast "Failed to copy code"
- **No clipboard access**: Fallback to select text method
- **Mobile**: Ensure touch targets are appropriate size

## Testing Strategy

### Unit Tests
```tsx
describe('Copy Invite Code', () => {
  test('copies invite code to clipboard', async () => {
    // Mock clipboard API
    // Render component with invite code
    // Click copy button
    // Verify clipboard content
  })
  
  test('shows success feedback after copy', async () => {
    // Click copy button
    // Verify checkmark icon appears
    // Verify toast notification
  })
  
  test('handles copy failure gracefully', async () => {
    // Mock clipboard failure
    // Verify fallback method called
    // Verify error handling
  })
})
```

### Manual Testing
- [ ] Copy works on Chrome, Firefox, Safari
- [ ] Mobile tap targets are accessible  
- [ ] Toast notifications don't interfere with UI
- [ ] Keyboard navigation works (tab to button, enter to copy)

## Security Considerations

### Clipboard Access
- Clipboard API requires secure context (HTTPS)
- Graceful fallback for insecure contexts
- No sensitive data beyond invite codes

### Privacy
- Invite codes are already visible in UI
- Copy functionality doesn't expose additional data
- No logging of copy operations

## Accessibility

### WCAG Compliance
```tsx
<button
  aria-label={`Copy invite code ${inviteCode}`}
  title="Copy invite code"
  className="copy-button"
>
  <Copy size={12} />
</button>
```

### Screen Readers
- Proper aria-labels on copy buttons
- Success/failure announcements
- Keyboard navigation support

## Performance Impact

### Bundle Size
- Add Copy/Check icons from Lucide React
- ~1KB additional JavaScript for clipboard handling
- No external dependencies needed

### Runtime
- Minimal - only clipboard API calls
- Async operations don't block UI
- No memory leaks (proper cleanup of timeouts)

## Future Enhancements

### Potential Additions
1. **Copy with message**: Pre-format "Join my foosball group: DEMO123"
2. **Share API integration**: Native sharing on mobile devices
3. **QR code generation**: Visual code sharing option
4. **Batch copy**: Copy multiple group codes at once

### Analytics (Optional)
- Track copy button usage
- Monitor copy success/failure rates
- A/B test different copy button placements

## Risk Assessment

### Low Risks
- **Browser compatibility**: Excellent with fallback
- **User confusion**: Familiar copy interaction pattern
- **Performance**: Minimal impact

### Mitigation Strategies
- **Clipboard unavailable**: Clear error messaging + fallback
- **Touch devices**: Adequate button sizing (44px minimum)
- **Accessibility**: Full keyboard + screen reader support

## Success Metrics

### User Experience
- [ ] Copy button clearly visible and discoverable
- [ ] Instant visual feedback on successful copy
- [ ] Works consistently across devices/browsers
- [ ] Zero user reports of copy failures

### Technical
- [ ] Copy success rate > 98%
- [ ] No performance degradation
- [ ] Accessibility audit passes
- [ ] All unit tests pass

## Implementation Checklist

### Code Changes
- [ ] Update GroupSelector.tsx with copy buttons
- [ ] Add clipboard utility functions
- [ ] Implement visual feedback states
- [ ] Add toast notification system (optional)

### Testing
- [ ] Unit tests for copy functionality
- [ ] Browser compatibility testing
- [ ] Mobile device testing
- [ ] Accessibility testing with screen readers

### Documentation
- [ ] Update component documentation
- [ ] Add usage examples
- [ ] Update user guide with copy feature

---

*This feature enhances user experience with minimal development effort and high user value.*