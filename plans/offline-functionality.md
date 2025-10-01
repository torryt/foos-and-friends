# Offline Functionality Implementation Plan

## Overview
Implement Progressive Web App (PWA) capabilities to enable offline usage of the matchup functionality. Users can view data and generate matchups offline, while database mutations are disabled until connection is restored.

## Architecture Decisions

### Service Worker Framework
- **Choice**: Workbox via `vite-plugin-pwa`
- **Rationale**: Industry standard, excellent Vite integration, declarative configuration
- **Alternative Considered**: Native service worker (too complex for our needs)

### Caching Strategy
- **Static Assets**: Cache-first (instant offline loading)
- **API Data**: Network-first with cache fallback (fresh when online, cached when offline)
- **Mutations**: Network-only (disabled when offline)

### Data Storage
- **Service Worker Cache**: For API responses and static assets
- **LocalStorage**: Continue using for saved matchups (already implemented)
- **No Additional Cache Layer**: Service worker handles all caching needs

## Implementation Steps

### 1. PWA Infrastructure Setup
- Install `vite-plugin-pwa` package
- Configure PWA manifest (name, icons, theme)
- Set up Workbox service worker generation
- Configure auto-update strategy

### 2. Service Worker Caching Configuration
- Precache all static assets (JS, CSS, HTML, images)
- Runtime cache for Supabase API endpoints:
  - `/players` - Cache up to 50 entries, 7-day expiry
  - `/matches` - Cache up to 100 entries, 7-day expiry
  - `/groups` - Cache up to 10 entries, 7-day expiry
- Network-first strategy for API GET requests
- Network-only for POST/PUT/DELETE

### 3. Offline Detection System
- Create `useOfflineStatus` hook
- Monitor `navigator.onLine` status
- Listen for online/offline events
- Provide connection state to components

### 4. Connection Status Indicator
- Add visual indicator in app header
- Show "Online" (green) or "Offline" (red) badge
- Subtle animation on status change
- Optional: Show last sync timestamp

### 5. Disable Mutations When Offline
Components to update:
- `RegisterGameForm` - Disable match submission
- `AddPlayerModal` - Disable player creation
- `EditPlayerModal` - Disable player editing
- `ScoreEntryStep` - Disable score submission
- Show tooltips explaining offline limitations

### 6. Ensure Read Operations Work Offline
Verify these features work with cached data:
- `PickTeamsWorkflow` - Generate matchups from cached players/matches
- `UseMatchupWorkflow` - View saved matchups from localStorage
- `PlayerRankings` - Display cached player rankings
- `RecentMatches` - Show cached match history

### 7. Testing & Validation
- Test offline mode in Chrome DevTools
- Verify all static assets load offline
- Confirm cached API data displays correctly
- Ensure mutations are properly disabled
- Test online/offline transitions

## Technical Implementation Details

### vite.config.ts Configuration
```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Foos & Friends',
    short_name: 'Foosball',
    theme_color: '#3b82f6',
    background_color: '#ffffff'
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 604800 // 7 days
          }
        }
      }
    ]
  }
})
```

### useOfflineStatus Hook
```typescript
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
```

## User Experience

### Online Mode
- Full functionality available
- Data automatically cached for offline use
- No visual changes except online indicator

### Offline Mode
- **Available**: View players, generate matchups, browse saved matchups
- **Disabled**: Add matches, create/edit players, all database writes
- **Visual**: Clear offline indicator, disabled buttons with tooltips

## Success Criteria
- [ ] App loads instantly when offline
- [ ] Matchup generation works with cached data
- [ ] Clear visual indication of offline status
- [ ] All mutations properly disabled when offline
- [ ] Smooth transition between online/offline states
- [ ] PWA installable on mobile and desktop

## Future Enhancements (Not in Current Scope)
- Queue mutations for sync when back online
- Background sync for pending operations
- Conflict resolution for offline edits
- Push notifications for sync completion