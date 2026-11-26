# Rust migration plan: jitsi-meet (TypeScript/JavaScript)

4 packages, 1329 source files (214171 lines), 223 test files, 731 UI files, grouped into 356 units.

| Ready | Caution | Blocked | Keep in source language |
| ---: | ---: | ---: | ---: |
| 109 | 45 | 4 | 198 |

> 5 files had parse errors; their units are marked caution.

## Start here

Best first ports: safe to port (readiness) and worth porting (loops and string work, tests, size).

| # | Unit | Lines | Priority | Readiness | Tests | Bridge | Main risks |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | `react/features/base/known-domains/` | 127 | 77 | 100 | 1 | napi-rs | - |
| 2 | `react/features/base/premeeting/` | 258 | 72 | 94 | 2 | napi-rs | Async and promises (4); Exceptions (3) |
| 3 | `react/features/base/low-bandwidth-mode/` | 75 | 71 | 93 | 1 | napi-rs | - |
| 4 | `react/features/base/popover/` | 168 | 67 | 97 | 0 | napi-rs | - |
| 5 | `react/features/noise-detection/` | 107 | 66 | 98 | 0 | napi-rs | Dynamic typing (1) |
| 6 | `react/features/desktop-picker/` | 78 | 66 | 97 | 0 | napi-rs | Dynamic typing (1) |
| 7 | `react/features/power-monitor/` | 151 | 66 | 97 | 0 | napi-rs | - |
| 8 | `react/features/talk-while-muted/` | 124 | 66 | 97 | 0 | napi-rs | Dynamic typing (1) |
| 9 | `react/features/videosipgw/` | 229 | 66 | 95 | 0 | napi-rs | JSON round-trips (1) |
| 10 | `react/features/base/lastn/` | 141 | 66 | 94 | 0 | napi-rs | Insertion-ordered maps and object keys (2) |

### `react/features/base/known-domains/`

127 lines in 4 files, wave 2, priority 77, readiness 100, bridge **napi-rs**.

- 1 imports use aliases or virtual modules and were not followed.
- Import cycle with react/features/desktop-picker/components/, react/features/desktop-picker/, react/features/unsupported-browser/components/, react/features/talk-while-muted/, react/features/rejoin/, react/features/power-monitor/, react/features/polls-history/, react/features/old-client-notification/, react/features/noise-detection/, react/features/no-audio-signal/components/, react/features/no-audio-signal/, react/features/mobile/wake-lock/, react/features/mobile/proximity/, react/features/mobile/call-integration/, react/features/mobile/audio-mode/, react/features/media-connectivity/, react/features/external-api/, react/features/deep-linking/, react/features/client-requirements/, react/features/base/user-interaction/, react/features/rtcstats/, react/features/stream-effects/audio-mixer/, react/features/base/tracks/components/web/, react/features/noise-suppression/components/, react/features/feedback/components/, react/features/feedback/, react/features/embed-meeting/components/, react/features/embed-meeting/, react/features/base/tooltip/, react/features/settings/components/web/video/, react/features/settings/components/web/audio/, react/features/salesforce/components/web/, react/features/stream-effects/virtual-background/workers/, react/features/stream-effects/virtual-background/pipeline/, react/features/stream-effects/virtual-background/compositor/, react/features/stream-effects/virtual-background/backend/, react/features/stream-effects/virtual-background/, react/features/screen-share/components/web/, react/features/time-timer/components/native/, react/features/mobile/picture-in-picture/components/, react/features/base/testing/components/, react/features/system-wide-user-notification/, react/features/system-wide-user-notification/components/web/, react/features/recent-list/, react/features/recent-list/components/, react/features/mobile/navigation/components/welcome/components/, react/features/welcome/components/, react/features/welcome/, react/features/visitors/components/native/, react/features/salesforce/components/native/, react/features/mobile/navigation/components/settings/components/, react/features/prejoin/components/native/, react/features/dynamic-branding/components/native/, react/features/lobby/components/native/, react/features/mobile/navigation/components/lobby/components/, react/features/mobile/navigation/components/chat/components/, react/features/invite/components/add-people-dialog/native/, react/features/gifs/components/native/, react/features/etherpad/components/native/, react/features/recording/components/native/, react/features/mobile/audio-mode/components/, react/features/display-name/components/native/, react/features/filmstrip/components/native/, react/features/connection-indicator/components/native/, react/features/conference/components/native/carmode/, react/features/mobile/navigation/components/conference/components/, react/features/invite/components/dial-in-summary/native/, react/features/polls/components/native/, react/features/polls/components/, react/features/polls/components/web/, react/features/polls/, react/features/videosipgw/, react/features/recording/components/LiveStream/web/, react/features/mobile/react-native-sdk/, react/features/voice-agents/, react/features/voice-agents/components/web/, react/features/visitors/components/web/, react/features/base/lastn/, react/features/video-quality/components/, react/features/recording/components/, react/features/recording/components/web/, react/features/gifs/components/web/, react/features/reactions/components/web/, react/features/prejoin/components/web/country-picker/, react/features/prejoin/components/web/dialogs/, react/features/prejoin/components/web/, react/features/participants-pane/components/breakout-rooms/components/web/, react/features/participants-pane/components/web/, react/features/overlay/components/web/, react/features/overlay/, react/features/subtitles/components/web/, react/features/base/participants/components/, react/features/large-video/components/, react/features/invite/components/callee-info/, react/features/presence-status/components/, react/features/virtual-background/components/, react/features/device-selection/components/, react/features/stream-effects/noise-suppression/, react/features/noise-suppression/, react/features/device-selection/, react/features/mobile/background/, react/features/calendar-sync/web/, react/features/time-timer/components/web/, react/features/time-timer/, react/features/mobile/permissions/, react/features/calendar-sync/components/, react/features/calendar-sync/, react/features/settings/components/web/, react/features/settings/components/native/, react/features/speaker-stats/components/native/, react/features/speaker-stats/components/, react/features/speaker-stats/components/web/, react/features/speaker-stats/, react/features/lobby/components/, react/features/base/premeeting/, react/features/base/premeeting/components/web/, react/features/lobby/components/web/, react/features/security/components/security-dialog/web/, react/features/security/, react/features/security/components/security-dialog/, react/features/room-lock/, react/features/security/components/security-dialog/native/, react/features/salesforce/, react/features/subtitles/components/, react/features/subtitles/components/native/, react/features/screenshot-capture/, react/features/recording/components/Recording/web/, react/features/recording/components/Recording/, react/features/recording/components/Recording/native/, react/features/google-api/components/, react/features/recording/components/LiveStream/, react/features/google-api/, react/features/recording/components/LiveStream/native/, react/features/reactions/components/native/, react/features/etherpad/components/, react/features/custom-panel/components/native/, react/features/remote-control/components/, react/features/remote-control/, react/features/base/sounds/components/, react/features/base/app/components/, react/features/whiteboard/components/web/, react/features/whiteboard/components/native/, react/features/whiteboard/, react/features/multi-screen/, react/features/video-menu/components/web/, react/features/video-menu/components/, react/features/shared-video/components/web/, react/features/shared-video/components/, react/features/shared-video/components/native/, react/features/video-menu/components/native/, react/features/share-room/, react/features/participants-pane/components/native/, react/features/breakout-rooms/components/native/, react/features/base/ui/components/native/, react/features/base/settings/components/native/, react/features/toolbox/components/native/, react/features/toolbox/components/, react/features/pip/components/web/, react/features/pip/, react/features/settings/, react/features/keyboard-shortcuts/components/, react/features/keyboard-shortcuts/, react/features/gifs/, react/features/face-landmarks/, react/features/display-name/, react/features/display-name/components/web/, react/features/connection-stats/components/, react/features/connection-indicator/components/, react/features/connection-indicator/components/web/, react/features/filmstrip/components/web/, react/features/visitors/, react/features/file-sharing/components/web/, react/features/file-sharing/, react/features/custom-panel/, react/features/custom-panel/components/web/, react/features/video-quality/, react/features/video-layout/components/, react/features/shared-video/, react/features/large-video/, react/features/follow-me/, react/features/video-layout/, react/features/conference/components/, react/features/base/media/components/native/, react/features/base/media/components/, react/features/base/media/components/web/, react/features/conference/components/web/, react/features/base/i18n/components/web/, react/features/conference/, react/features/video-menu/, react/features/connection-indicator/, react/features/base/testing/, react/features/lobby/, react/features/mobile/picture-in-picture/, react/features/dropbox/, react/features/mobile/external-api/, react/features/subtitles/, react/features/transcribing/, react/features/e2ee/components/, react/features/e2ee/, react/features/recording/, react/features/jaas/components/web/, react/features/jaas/, react/features/invite/components/add-people-dialog/, react/features/base/buttons/, react/features/invite/components/add-people-dialog/web/, react/features/invite/, react/features/prejoin/, react/features/device-permissions/components/web/, react/features/device-permissions/, react/features/base/devices/, react/features/base/sounds/, react/features/reactions/, react/features/base/dialog/components/, react/features/base/dialog/components/native/, react/features/chat/components/native/, react/features/chat/components/, react/features/chat/components/web/, react/features/base/react/components/web/, react/features/base/react/components/, react/features/base/react/components/native/, react/features/mobile/navigation/components/, react/features/mobile/navigation/, react/features/base/modal/components/, react/features/base/label/components/native/, react/features/audio-translation/components/native/, react/features/conference/components/native/, react/features/base/responsive-ui/, react/features/base/react/, react/features/filmstrip/, react/features/base/environment/, react/features/screen-share/, react/features/notifications/, react/features/virtual-background/, react/features/dynamic-branding/, react/features/base/i18n/, react/features/chat/, react/features/breakout-rooms/, react/features/base/toolbox/components/web/, react/features/base/avatar/components/web/, react/features/base/avatar/components/native/, react/features/base/avatar/components/, react/features/toolbox/components/web/, react/features/base/popover/components/, react/features/base/tooltip/components/, react/features/base/toolbox/components/, react/features/base/label/components/web/, react/features/audio-translation/components/web/, react/features/audio-translation/, react/features/toolbox/, react/features/etherpad/, modules/UI/videolayout/, modules/UI/etherpad/, modules/UI/, react/features/base/tracks/, react/features/participants-pane/, react/features/base/ui/components/, react/features/base/icons/svg/, react/features/base/icons/components/, react/features/base/ui/components/web/, react/features/authentication/components/web/, react/features/base/jwt/, react/features/base/settings/, react/features/base/low-bandwidth-mode/, react/features/base/color-scheme/, react/features/base/dialog/, react/features/base/media/, react/features/av-moderation/, react/features/base/participants/, react/features/base/net-info/, react/features/base/lib-jitsi-meet/, react/features/base/redux/, react/features/base/flags/, react/features/base/config/, react/features/base/logging/, react/features/base/app/, react/features/base/connection/, react/features/authentication/components/native/, react/features/authentication/, react/features/base/conference/, react/features/analytics/handlers/, react/features/analytics/, react/features/app/, react/features/base/util/, modules/transport/, modules/API/: port them together.
- 1 test file imports it directly.

### `react/features/base/premeeting/`

258 lines in 7 files, wave 2, priority 72, readiness 94, bridge **napi-rs**.

- Import cycle with react/features/desktop-picker/components/, react/features/desktop-picker/, react/features/unsupported-browser/components/, react/features/talk-while-muted/, react/features/rejoin/, react/features/power-monitor/, react/features/polls-history/, react/features/old-client-notification/, react/features/noise-detection/, react/features/no-audio-signal/components/, react/features/no-audio-signal/, react/features/mobile/wake-lock/, react/features/mobile/proximity/, react/features/mobile/call-integration/, react/features/mobile/audio-mode/, react/features/media-connectivity/, react/features/external-api/, react/features/deep-linking/, react/features/client-requirements/, react/features/base/user-interaction/, react/features/rtcstats/, react/features/stream-effects/audio-mixer/, react/features/base/tracks/components/web/, react/features/noise-suppression/components/, react/features/feedback/components/, react/features/feedback/, react/features/embed-meeting/components/, react/features/embed-meeting/, react/features/base/tooltip/, react/features/settings/components/web/video/, react/features/settings/components/web/audio/, react/features/salesforce/components/web/, react/features/stream-effects/virtual-background/workers/, react/features/stream-effects/virtual-background/pipeline/, react/features/stream-effects/virtual-background/compositor/, react/features/stream-effects/virtual-background/backend/, react/features/stream-effects/virtual-background/, react/features/screen-share/components/web/, react/features/time-timer/components/native/, react/features/mobile/picture-in-picture/components/, react/features/base/testing/components/, react/features/system-wide-user-notification/, react/features/system-wide-user-notification/components/web/, react/features/recent-list/, react/features/recent-list/components/, react/features/mobile/navigation/components/welcome/components/, react/features/welcome/components/, react/features/welcome/, react/features/visitors/components/native/, react/features/salesforce/components/native/, react/features/mobile/navigation/components/settings/components/, react/features/prejoin/components/native/, react/features/dynamic-branding/components/native/, react/features/lobby/components/native/, react/features/mobile/navigation/components/lobby/components/, react/features/mobile/navigation/components/chat/components/, react/features/invite/components/add-people-dialog/native/, react/features/gifs/components/native/, react/features/etherpad/components/native/, react/features/recording/components/native/, react/features/mobile/audio-mode/components/, react/features/display-name/components/native/, react/features/filmstrip/components/native/, react/features/connection-indicator/components/native/, react/features/conference/components/native/carmode/, react/features/mobile/navigation/components/conference/components/, react/features/invite/components/dial-in-summary/native/, react/features/polls/components/native/, react/features/polls/components/, react/features/polls/components/web/, react/features/polls/, react/features/videosipgw/, react/features/recording/components/LiveStream/web/, react/features/mobile/react-native-sdk/, react/features/voice-agents/, react/features/voice-agents/components/web/, react/features/visitors/components/web/, react/features/base/lastn/, react/features/video-quality/components/, react/features/recording/components/, react/features/recording/components/web/, react/features/gifs/components/web/, react/features/reactions/components/web/, react/features/prejoin/components/web/country-picker/, react/features/prejoin/components/web/dialogs/, react/features/prejoin/components/web/, react/features/participants-pane/components/breakout-rooms/components/web/, react/features/participants-pane/components/web/, react/features/overlay/components/web/, react/features/overlay/, react/features/subtitles/components/web/, react/features/base/participants/components/, react/features/large-video/components/, react/features/invite/components/callee-info/, react/features/presence-status/components/, react/features/virtual-background/components/, react/features/device-selection/components/, react/features/stream-effects/noise-suppression/, react/features/noise-suppression/, react/features/device-selection/, react/features/mobile/background/, react/features/calendar-sync/web/, react/features/time-timer/components/web/, react/features/time-timer/, react/features/mobile/permissions/, react/features/calendar-sync/components/, react/features/calendar-sync/, react/features/settings/components/web/, react/features/settings/components/native/, react/features/speaker-stats/components/native/, react/features/speaker-stats/components/, react/features/speaker-stats/components/web/, react/features/speaker-stats/, react/features/lobby/components/, react/features/base/premeeting/components/web/, react/features/lobby/components/web/, react/features/security/components/security-dialog/web/, react/features/security/, react/features/security/components/security-dialog/, react/features/room-lock/, react/features/security/components/security-dialog/native/, react/features/salesforce/, react/features/subtitles/components/, react/features/subtitles/components/native/, react/features/screenshot-capture/, react/features/recording/components/Recording/web/, react/features/recording/components/Recording/, react/features/recording/components/Recording/native/, react/features/google-api/components/, react/features/recording/components/LiveStream/, react/features/google-api/, react/features/recording/components/LiveStream/native/, react/features/reactions/components/native/, react/features/etherpad/components/, react/features/custom-panel/components/native/, react/features/remote-control/components/, react/features/remote-control/, react/features/base/sounds/components/, react/features/base/app/components/, react/features/whiteboard/components/web/, react/features/whiteboard/components/native/, react/features/whiteboard/, react/features/multi-screen/, react/features/video-menu/components/web/, react/features/video-menu/components/, react/features/shared-video/components/web/, react/features/shared-video/components/, react/features/shared-video/components/native/, react/features/video-menu/components/native/, react/features/share-room/, react/features/participants-pane/components/native/, react/features/breakout-rooms/components/native/, react/features/base/ui/components/native/, react/features/base/settings/components/native/, react/features/toolbox/components/native/, react/features/toolbox/components/, react/features/pip/components/web/, react/features/pip/, react/features/settings/, react/features/keyboard-shortcuts/components/, react/features/keyboard-shortcuts/, react/features/gifs/, react/features/face-landmarks/, react/features/display-name/, react/features/display-name/components/web/, react/features/connection-stats/components/, react/features/connection-indicator/components/, react/features/connection-indicator/components/web/, react/features/filmstrip/components/web/, react/features/visitors/, react/features/file-sharing/components/web/, react/features/file-sharing/, react/features/custom-panel/, react/features/custom-panel/components/web/, react/features/video-quality/, react/features/video-layout/components/, react/features/shared-video/, react/features/large-video/, react/features/follow-me/, react/features/video-layout/, react/features/conference/components/, react/features/base/media/components/native/, react/features/base/media/components/, react/features/base/media/components/web/, react/features/conference/components/web/, react/features/base/i18n/components/web/, react/features/conference/, react/features/video-menu/, react/features/connection-indicator/, react/features/base/testing/, react/features/lobby/, react/features/mobile/picture-in-picture/, react/features/dropbox/, react/features/mobile/external-api/, react/features/subtitles/, react/features/transcribing/, react/features/e2ee/components/, react/features/e2ee/, react/features/recording/, react/features/jaas/components/web/, react/features/jaas/, react/features/invite/components/add-people-dialog/, react/features/base/buttons/, react/features/invite/components/add-people-dialog/web/, react/features/invite/, react/features/prejoin/, react/features/device-permissions/components/web/, react/features/device-permissions/, react/features/base/devices/, react/features/base/sounds/, react/features/reactions/, react/features/base/dialog/components/, react/features/base/dialog/components/native/, react/features/chat/components/native/, react/features/chat/components/, react/features/chat/components/web/, react/features/base/react/components/web/, react/features/base/react/components/, react/features/base/react/components/native/, react/features/mobile/navigation/components/, react/features/mobile/navigation/, react/features/base/modal/components/, react/features/base/label/components/native/, react/features/audio-translation/components/native/, react/features/conference/components/native/, react/features/base/responsive-ui/, react/features/base/react/, react/features/filmstrip/, react/features/base/environment/, react/features/screen-share/, react/features/notifications/, react/features/virtual-background/, react/features/dynamic-branding/, react/features/base/i18n/, react/features/chat/, react/features/breakout-rooms/, react/features/base/toolbox/components/web/, react/features/base/avatar/components/web/, react/features/base/avatar/components/native/, react/features/base/avatar/components/, react/features/toolbox/components/web/, react/features/base/popover/components/, react/features/base/tooltip/components/, react/features/base/toolbox/components/, react/features/base/label/components/web/, react/features/audio-translation/components/web/, react/features/audio-translation/, react/features/toolbox/, react/features/etherpad/, modules/UI/videolayout/, modules/UI/etherpad/, modules/UI/, react/features/base/tracks/, react/features/participants-pane/, react/features/base/ui/components/, react/features/base/icons/svg/, react/features/base/icons/components/, react/features/base/ui/components/web/, react/features/authentication/components/web/, react/features/base/jwt/, react/features/base/settings/, react/features/base/low-bandwidth-mode/, react/features/base/color-scheme/, react/features/base/dialog/, react/features/base/media/, react/features/av-moderation/, react/features/base/participants/, react/features/base/net-info/, react/features/base/lib-jitsi-meet/, react/features/base/known-domains/, react/features/base/redux/, react/features/base/flags/, react/features/base/config/, react/features/base/logging/, react/features/base/app/, react/features/base/connection/, react/features/authentication/components/native/, react/features/authentication/, react/features/base/conference/, react/features/analytics/handlers/, react/features/analytics/, react/features/app/, react/features/base/util/, modules/transport/, modules/API/: port them together.
- 2 test files import it directly.
- Async and promises x4: `react/features/base/premeeting/actions.web.ts:34`, `react/features/base/premeeting/actions.web.ts:53`, `react/features/base/premeeting/actions.web.ts:54`
- Exceptions x3: `react/features/base/premeeting/actions.web.ts:42`, `react/features/base/premeeting/actions.web.ts:46`, `react/features/base/premeeting/actions.web.ts:50`

### `react/features/base/low-bandwidth-mode/`

75 lines in 4 files, wave 2, priority 71, readiness 93, bridge **napi-rs**.

- Import cycle with react/features/desktop-picker/components/, react/features/desktop-picker/, react/features/unsupported-browser/components/, react/features/talk-while-muted/, react/features/rejoin/, react/features/power-monitor/, react/features/polls-history/, react/features/old-client-notification/, react/features/noise-detection/, react/features/no-audio-signal/components/, react/features/no-audio-signal/, react/features/mobile/wake-lock/, react/features/mobile/proximity/, react/features/mobile/call-integration/, react/features/mobile/audio-mode/, react/features/media-connectivity/, react/features/external-api/, react/features/deep-linking/, react/features/client-requirements/, react/features/base/user-interaction/, react/features/rtcstats/, react/features/stream-effects/audio-mixer/, react/features/base/tracks/components/web/, react/features/noise-suppression/components/, react/features/feedback/components/, react/features/feedback/, react/features/embed-meeting/components/, react/features/embed-meeting/, react/features/base/tooltip/, react/features/settings/components/web/video/, react/features/settings/components/web/audio/, react/features/salesforce/components/web/, react/features/stream-effects/virtual-background/workers/, react/features/stream-effects/virtual-background/pipeline/, react/features/stream-effects/virtual-background/compositor/, react/features/stream-effects/virtual-background/backend/, react/features/stream-effects/virtual-background/, react/features/screen-share/components/web/, react/features/time-timer/components/native/, react/features/mobile/picture-in-picture/components/, react/features/base/testing/components/, react/features/system-wide-user-notification/, react/features/system-wide-user-notification/components/web/, react/features/recent-list/, react/features/recent-list/components/, react/features/mobile/navigation/components/welcome/components/, react/features/welcome/components/, react/features/welcome/, react/features/visitors/components/native/, react/features/salesforce/components/native/, react/features/mobile/navigation/components/settings/components/, react/features/prejoin/components/native/, react/features/dynamic-branding/components/native/, react/features/lobby/components/native/, react/features/mobile/navigation/components/lobby/components/, react/features/mobile/navigation/components/chat/components/, react/features/invite/components/add-people-dialog/native/, react/features/gifs/components/native/, react/features/etherpad/components/native/, react/features/recording/components/native/, react/features/mobile/audio-mode/components/, react/features/display-name/components/native/, react/features/filmstrip/components/native/, react/features/connection-indicator/components/native/, react/features/conference/components/native/carmode/, react/features/mobile/navigation/components/conference/components/, react/features/invite/components/dial-in-summary/native/, react/features/polls/components/native/, react/features/polls/components/, react/features/polls/components/web/, react/features/polls/, react/features/videosipgw/, react/features/recording/components/LiveStream/web/, react/features/mobile/react-native-sdk/, react/features/voice-agents/, react/features/voice-agents/components/web/, react/features/visitors/components/web/, react/features/base/lastn/, react/features/video-quality/components/, react/features/recording/components/, react/features/recording/components/web/, react/features/gifs/components/web/, react/features/reactions/components/web/, react/features/prejoin/components/web/country-picker/, react/features/prejoin/components/web/dialogs/, react/features/prejoin/components/web/, react/features/participants-pane/components/breakout-rooms/components/web/, react/features/participants-pane/components/web/, react/features/overlay/components/web/, react/features/overlay/, react/features/subtitles/components/web/, react/features/base/participants/components/, react/features/large-video/components/, react/features/invite/components/callee-info/, react/features/presence-status/components/, react/features/virtual-background/components/, react/features/device-selection/components/, react/features/stream-effects/noise-suppression/, react/features/noise-suppression/, react/features/device-selection/, react/features/mobile/background/, react/features/calendar-sync/web/, react/features/time-timer/components/web/, react/features/time-timer/, react/features/mobile/permissions/, react/features/calendar-sync/components/, react/features/calendar-sync/, react/features/settings/components/web/, react/features/settings/components/native/, react/features/speaker-stats/components/native/, react/features/speaker-stats/components/, react/features/speaker-stats/components/web/, react/features/speaker-stats/, react/features/lobby/components/, react/features/base/premeeting/, react/features/base/premeeting/components/web/, react/features/lobby/components/web/, react/features/security/components/security-dialog/web/, react/features/security/, react/features/security/components/security-dialog/, react/features/room-lock/, react/features/security/components/security-dialog/native/, react/features/salesforce/, react/features/subtitles/components/, react/features/subtitles/components/native/, react/features/screenshot-capture/, react/features/recording/components/Recording/web/, react/features/recording/components/Recording/, react/features/recording/components/Recording/native/, react/features/google-api/components/, react/features/recording/components/LiveStream/, react/features/google-api/, react/features/recording/components/LiveStream/native/, react/features/reactions/components/native/, react/features/etherpad/components/, react/features/custom-panel/components/native/, react/features/remote-control/components/, react/features/remote-control/, react/features/base/sounds/components/, react/features/base/app/components/, react/features/whiteboard/components/web/, react/features/whiteboard/components/native/, react/features/whiteboard/, react/features/multi-screen/, react/features/video-menu/components/web/, react/features/video-menu/components/, react/features/shared-video/components/web/, react/features/shared-video/components/, react/features/shared-video/components/native/, react/features/video-menu/components/native/, react/features/share-room/, react/features/participants-pane/components/native/, react/features/breakout-rooms/components/native/, react/features/base/ui/components/native/, react/features/base/settings/components/native/, react/features/toolbox/components/native/, react/features/toolbox/components/, react/features/pip/components/web/, react/features/pip/, react/features/settings/, react/features/keyboard-shortcuts/components/, react/features/keyboard-shortcuts/, react/features/gifs/, react/features/face-landmarks/, react/features/display-name/, react/features/display-name/components/web/, react/features/connection-stats/components/, react/features/connection-indicator/components/, react/features/connection-indicator/components/web/, react/features/filmstrip/components/web/, react/features/visitors/, react/features/file-sharing/components/web/, react/features/file-sharing/, react/features/custom-panel/, react/features/custom-panel/components/web/, react/features/video-quality/, react/features/video-layout/components/, react/features/shared-video/, react/features/large-video/, react/features/follow-me/, react/features/video-layout/, react/features/conference/components/, react/features/base/media/components/native/, react/features/base/media/components/, react/features/base/media/components/web/, react/features/conference/components/web/, react/features/base/i18n/components/web/, react/features/conference/, react/features/video-menu/, react/features/connection-indicator/, react/features/base/testing/, react/features/lobby/, react/features/mobile/picture-in-picture/, react/features/dropbox/, react/features/mobile/external-api/, react/features/subtitles/, react/features/transcribing/, react/features/e2ee/components/, react/features/e2ee/, react/features/recording/, react/features/jaas/components/web/, react/features/jaas/, react/features/invite/components/add-people-dialog/, react/features/base/buttons/, react/features/invite/components/add-people-dialog/web/, react/features/invite/, react/features/prejoin/, react/features/device-permissions/components/web/, react/features/device-permissions/, react/features/base/devices/, react/features/base/sounds/, react/features/reactions/, react/features/base/dialog/components/, react/features/base/dialog/components/native/, react/features/chat/components/native/, react/features/chat/components/, react/features/chat/components/web/, react/features/base/react/components/web/, react/features/base/react/components/, react/features/base/react/components/native/, react/features/mobile/navigation/components/, react/features/mobile/navigation/, react/features/base/modal/components/, react/features/base/label/components/native/, react/features/audio-translation/components/native/, react/features/conference/components/native/, react/features/base/responsive-ui/, react/features/base/react/, react/features/filmstrip/, react/features/base/environment/, react/features/screen-share/, react/features/notifications/, react/features/virtual-background/, react/features/dynamic-branding/, react/features/base/i18n/, react/features/chat/, react/features/breakout-rooms/, react/features/base/toolbox/components/web/, react/features/base/avatar/components/web/, react/features/base/avatar/components/native/, react/features/base/avatar/components/, react/features/toolbox/components/web/, react/features/base/popover/components/, react/features/base/tooltip/components/, react/features/base/toolbox/components/, react/features/base/label/components/web/, react/features/audio-translation/components/web/, react/features/audio-translation/, react/features/toolbox/, react/features/etherpad/, modules/UI/videolayout/, modules/UI/etherpad/, modules/UI/, react/features/base/tracks/, react/features/participants-pane/, react/features/base/ui/components/, react/features/base/icons/svg/, react/features/base/icons/components/, react/features/base/ui/components/web/, react/features/authentication/components/web/, react/features/base/jwt/, react/features/base/settings/, react/features/base/color-scheme/, react/features/base/dialog/, react/features/base/media/, react/features/av-moderation/, react/features/base/participants/, react/features/base/net-info/, react/features/base/lib-jitsi-meet/, react/features/base/known-domains/, react/features/base/redux/, react/features/base/flags/, react/features/base/config/, react/features/base/logging/, react/features/base/app/, react/features/base/connection/, react/features/authentication/components/native/, react/features/authentication/, react/features/base/conference/, react/features/analytics/handlers/, react/features/analytics/, react/features/app/, react/features/base/util/, modules/transport/, modules/API/: port them together.
- 1 test file imports it directly.

### `react/features/base/popover/`

168 lines in 1 file, wave 0, priority 67, readiness 97, bridge **napi-rs**.

- Leaf: imports no other unit.

### `react/features/noise-detection/`

107 lines in 6 files, wave 2, priority 66, readiness 98, bridge **napi-rs**.

- Import cycle with react/features/desktop-picker/components/, react/features/desktop-picker/, react/features/unsupported-browser/components/, react/features/talk-while-muted/, react/features/rejoin/, react/features/power-monitor/, react/features/polls-history/, react/features/old-client-notification/, react/features/no-audio-signal/components/, react/features/no-audio-signal/, react/features/mobile/wake-lock/, react/features/mobile/proximity/, react/features/mobile/call-integration/, react/features/mobile/audio-mode/, react/features/media-connectivity/, react/features/external-api/, react/features/deep-linking/, react/features/client-requirements/, react/features/base/user-interaction/, react/features/rtcstats/, react/features/stream-effects/audio-mixer/, react/features/base/tracks/components/web/, react/features/noise-suppression/components/, react/features/feedback/components/, react/features/feedback/, react/features/embed-meeting/components/, react/features/embed-meeting/, react/features/base/tooltip/, react/features/settings/components/web/video/, react/features/settings/components/web/audio/, react/features/salesforce/components/web/, react/features/stream-effects/virtual-background/workers/, react/features/stream-effects/virtual-background/pipeline/, react/features/stream-effects/virtual-background/compositor/, react/features/stream-effects/virtual-background/backend/, react/features/stream-effects/virtual-background/, react/features/screen-share/components/web/, react/features/time-timer/components/native/, react/features/mobile/picture-in-picture/components/, react/features/base/testing/components/, react/features/system-wide-user-notification/, react/features/system-wide-user-notification/components/web/, react/features/recent-list/, react/features/recent-list/components/, react/features/mobile/navigation/components/welcome/components/, react/features/welcome/components/, react/features/welcome/, react/features/visitors/components/native/, react/features/salesforce/components/native/, react/features/mobile/navigation/components/settings/components/, react/features/prejoin/components/native/, react/features/dynamic-branding/components/native/, react/features/lobby/components/native/, react/features/mobile/navigation/components/lobby/components/, react/features/mobile/navigation/components/chat/components/, react/features/invite/components/add-people-dialog/native/, react/features/gifs/components/native/, react/features/etherpad/components/native/, react/features/recording/components/native/, react/features/mobile/audio-mode/components/, react/features/display-name/components/native/, react/features/filmstrip/components/native/, react/features/connection-indicator/components/native/, react/features/conference/components/native/carmode/, react/features/mobile/navigation/components/conference/components/, react/features/invite/components/dial-in-summary/native/, react/features/polls/components/native/, react/features/polls/components/, react/features/polls/components/web/, react/features/polls/, react/features/videosipgw/, react/features/recording/components/LiveStream/web/, react/features/mobile/react-native-sdk/, react/features/voice-agents/, react/features/voice-agents/components/web/, react/features/visitors/components/web/, react/features/base/lastn/, react/features/video-quality/components/, react/features/recording/components/, react/features/recording/components/web/, react/features/gifs/components/web/, react/features/reactions/components/web/, react/features/prejoin/components/web/country-picker/, react/features/prejoin/components/web/dialogs/, react/features/prejoin/components/web/, react/features/participants-pane/components/breakout-rooms/components/web/, react/features/participants-pane/components/web/, react/features/overlay/components/web/, react/features/overlay/, react/features/subtitles/components/web/, react/features/base/participants/components/, react/features/large-video/components/, react/features/invite/components/callee-info/, react/features/presence-status/components/, react/features/virtual-background/components/, react/features/device-selection/components/, react/features/stream-effects/noise-suppression/, react/features/noise-suppression/, react/features/device-selection/, react/features/mobile/background/, react/features/calendar-sync/web/, react/features/time-timer/components/web/, react/features/time-timer/, react/features/mobile/permissions/, react/features/calendar-sync/components/, react/features/calendar-sync/, react/features/settings/components/web/, react/features/settings/components/native/, react/features/speaker-stats/components/native/, react/features/speaker-stats/components/, react/features/speaker-stats/components/web/, react/features/speaker-stats/, react/features/lobby/components/, react/features/base/premeeting/, react/features/base/premeeting/components/web/, react/features/lobby/components/web/, react/features/security/components/security-dialog/web/, react/features/security/, react/features/security/components/security-dialog/, react/features/room-lock/, react/features/security/components/security-dialog/native/, react/features/salesforce/, react/features/subtitles/components/, react/features/subtitles/components/native/, react/features/screenshot-capture/, react/features/recording/components/Recording/web/, react/features/recording/components/Recording/, react/features/recording/components/Recording/native/, react/features/google-api/components/, react/features/recording/components/LiveStream/, react/features/google-api/, react/features/recording/components/LiveStream/native/, react/features/reactions/components/native/, react/features/etherpad/components/, react/features/custom-panel/components/native/, react/features/remote-control/components/, react/features/remote-control/, react/features/base/sounds/components/, react/features/base/app/components/, react/features/whiteboard/components/web/, react/features/whiteboard/components/native/, react/features/whiteboard/, react/features/multi-screen/, react/features/video-menu/components/web/, react/features/video-menu/components/, react/features/shared-video/components/web/, react/features/shared-video/components/, react/features/shared-video/components/native/, react/features/video-menu/components/native/, react/features/share-room/, react/features/participants-pane/components/native/, react/features/breakout-rooms/components/native/, react/features/base/ui/components/native/, react/features/base/settings/components/native/, react/features/toolbox/components/native/, react/features/toolbox/components/, react/features/pip/components/web/, react/features/pip/, react/features/settings/, react/features/keyboard-shortcuts/components/, react/features/keyboard-shortcuts/, react/features/gifs/, react/features/face-landmarks/, react/features/display-name/, react/features/display-name/components/web/, react/features/connection-stats/components/, react/features/connection-indicator/components/, react/features/connection-indicator/components/web/, react/features/filmstrip/components/web/, react/features/visitors/, react/features/file-sharing/components/web/, react/features/file-sharing/, react/features/custom-panel/, react/features/custom-panel/components/web/, react/features/video-quality/, react/features/video-layout/components/, react/features/shared-video/, react/features/large-video/, react/features/follow-me/, react/features/video-layout/, react/features/conference/components/, react/features/base/media/components/native/, react/features/base/media/components/, react/features/base/media/components/web/, react/features/conference/components/web/, react/features/base/i18n/components/web/, react/features/conference/, react/features/video-menu/, react/features/connection-indicator/, react/features/base/testing/, react/features/lobby/, react/features/mobile/picture-in-picture/, react/features/dropbox/, react/features/mobile/external-api/, react/features/subtitles/, react/features/transcribing/, react/features/e2ee/components/, react/features/e2ee/, react/features/recording/, react/features/jaas/components/web/, react/features/jaas/, react/features/invite/components/add-people-dialog/, react/features/base/buttons/, react/features/invite/components/add-people-dialog/web/, react/features/invite/, react/features/prejoin/, react/features/device-permissions/components/web/, react/features/device-permissions/, react/features/base/devices/, react/features/base/sounds/, react/features/reactions/, react/features/base/dialog/components/, react/features/base/dialog/components/native/, react/features/chat/components/native/, react/features/chat/components/, react/features/chat/components/web/, react/features/base/react/components/web/, react/features/base/react/components/, react/features/base/react/components/native/, react/features/mobile/navigation/components/, react/features/mobile/navigation/, react/features/base/modal/components/, react/features/base/label/components/native/, react/features/audio-translation/components/native/, react/features/conference/components/native/, react/features/base/responsive-ui/, react/features/base/react/, react/features/filmstrip/, react/features/base/environment/, react/features/screen-share/, react/features/notifications/, react/features/virtual-background/, react/features/dynamic-branding/, react/features/base/i18n/, react/features/chat/, react/features/breakout-rooms/, react/features/base/toolbox/components/web/, react/features/base/avatar/components/web/, react/features/base/avatar/components/native/, react/features/base/avatar/components/, react/features/toolbox/components/web/, react/features/base/popover/components/, react/features/base/tooltip/components/, react/features/base/toolbox/components/, react/features/base/label/components/web/, react/features/audio-translation/components/web/, react/features/audio-translation/, react/features/toolbox/, react/features/etherpad/, modules/UI/videolayout/, modules/UI/etherpad/, modules/UI/, react/features/base/tracks/, react/features/participants-pane/, react/features/base/ui/components/, react/features/base/icons/svg/, react/features/base/icons/components/, react/features/base/ui/components/web/, react/features/authentication/components/web/, react/features/base/jwt/, react/features/base/settings/, react/features/base/low-bandwidth-mode/, react/features/base/color-scheme/, react/features/base/dialog/, react/features/base/media/, react/features/av-moderation/, react/features/base/participants/, react/features/base/net-info/, react/features/base/lib-jitsi-meet/, react/features/base/known-domains/, react/features/base/redux/, react/features/base/flags/, react/features/base/config/, react/features/base/logging/, react/features/base/app/, react/features/base/connection/, react/features/authentication/components/native/, react/features/authentication/, react/features/base/conference/, react/features/analytics/handlers/, react/features/analytics/, react/features/app/, react/features/base/util/, modules/transport/, modules/API/: port them together.
- Dynamic typing x1: `react/features/noise-detection/middleware.ts:29`

## Order by package

Packages come after the workspace packages they use. Inside a package, port by wave: a unit's imports are in earlier waves.

### 1. jitsi-meet (`.`, node, 18 test files)

| Wave | Unit | Status | Lines | Readiness | Bridge | Main risks |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 0 | `android/scripts/` | ready | 26 | 100 | napi-rs | JSON round-trips (2) |
| 0 | `custom.js` | ready | 2 | 100 | napi-rs | - |
| 0 | `doc/jaas/` | caution | 7 | 100 | napi-rs | - |
| 0 | `giphy-analytics-stub.js` | ready | 12 | 100 | napi-rs | - |
| 0 | `modules/recorder/` | ready | 39 | 100 | napi-rs | - |
| 0 | `static/` | ready | 56 | 100 | napi-rs | Number semantics (1); Clock and random numbers (1) |
| 0 | `interface_config.js` | ready | 196 | 99 | napi-rs | - |
| 0 | `react/features/audio-level-indicator/components/` | keep | 70 | 99 | keep | Class inheritance (1) |
| 0 | `react/features/base/dialog/components/web/` | keep | 48 | 98 | keep | Class inheritance (1) |
| 0 | `react/features/base/label/` | ready | 5 | 98 | napi-rs | - |
| 0 | `react/features/invite/components/dial-in-info-page/` | keep | 21 | 98 | keep | - |
| 0 | `react/features/base/popover/` | ready | 168 | 97 | napi-rs | - |
| 0 | `modules/UI/util/` | ready | 51 | 96 | napi-rs | - |
| 0 | `react/features/base/modal/` | keep | 21 | 96 | keep | - |
| 0 | `react/features/old-client-notification/components/` | keep | 32 | 96 | keep | Class inheritance (1) |
| 0 | `react/features/presence-status/` | ready | 117 | 95 | napi-rs | - |
| 0 | `modules/util/` | ready | 84 | 94 | napi-rs | Async and promises (1); Exceptions (1) |
| 0 | `react/features/mobile/navigation/components/settings/` | keep | 21 | 94 | keep | Dynamic typing (1) |
| 0 | `react/features/base/responsive-ui/components/` | keep | 59 | 93 | keep | - |
| 0 | `react/features/mobile/navigation/components/lobby/` | keep | 21 | 93 | keep | Dynamic typing (1) |
| 0 | `pwa-worker.js` | ready | 73 | 92 | napi-rs | Async and promises (10); Dynamic typing (1) |
| 0 | `lang/` | blocked | 28 | 90 | napi-rs | String offsets and slicing (1); Dynamic code (eval, new Function, computed import) (1) |
| 0 | `react/features/base/styles/components/styles/` | ready | 45 | 88 | napi-rs | - |
| 0 | `react/features/stream-effects/rnnoise/` | ready | 178 | 84 | napi-rs | Callback-shaped APIs (3); Dynamic typing (1) |
| 0 | `react/features/mobile/navigation/components/conference/` | keep | 39 | 82 | keep | Dynamic typing (1) |
| 0 | `react/features/base/avatar/` | ready | 144 | 78 | napi-rs | String offsets and slicing (1); Dynamic typing (1) |
| 0 | `react/features/base/styles/` | ready | 268 | 72 | napi-rs | String offsets and slicing (1); Dynamic typing (1) |
| 0 | `react/features/stream-effects/virtual-background/vendor/tflite/` | ready | 24 | 64 | napi-rs | String offsets and slicing (12); Insertion-ordered maps and object keys (8) |
| 0 | `react/features/base/media-cast/` | ready | 863 | 60 | napi-rs | Async and promises (18); Callback-shaped APIs (7) |
| 0 | `config.js` | ready | 1916 | 52 | napi-rs | String offsets and slicing (1) |
| 0 | `react/features/mobile/polyfills/` | caution | 465 | 30 | napi-rs | String offsets and slicing (1); Reflection and prototypes (5) |
| 0 | `react/features/base/ui/` | keep | 1529 | 27 | keep | Dynamic typing (11); Insertion-ordered maps and object keys (4) |
| 1 | `modules/UI/audio_levels/` | ready | 51 | 100 | napi-rs | Number semantics (3) |
| 1 | `react/` | caution | 114 | 90 | napi-rs | - |
| 1 | `react/features/prejoin/components/web/preview/` | keep | 71 | 89 | keep | - |
| 1 | `react/features/base/ui/hooks/` | keep | 197 | 76 | keep | Callback-shaped APIs (9); Reflection and prototypes (1) |
| 2 | `index.android.js` | ready | 1 | 100 | napi-rs | - |
| 2 | `index.ios.js` | ready | 1 | 100 | napi-rs | - |
| 2 | `react/features/base/known-domains/` | ready | 127 | 100 | napi-rs | - |
| 2 | `react/features/rejoin/` | ready | 24 | 100 | napi-rs | Clock and random numbers (1) |
| 2 | `react/features/base/tooltip/` | keep | 90 | 99 | keep | - |
| 2 | `react/features/media-connectivity/` | ready | 144 | 99 | napi-rs | - |
| 2 | `react/features/base/user-interaction/` | ready | 104 | 98 | napi-rs | Dynamic typing (1) |
| 2 | `react/features/embed-meeting/` | ready | 20 | 98 | napi-rs | - |
| 2 | `react/features/mobile/proximity/` | ready | 30 | 98 | napi-rs | - |
| 2 | `react/features/mobile/wake-lock/` | ready | 31 | 98 | napi-rs | - |
| 2 | `react/features/noise-detection/` | ready | 107 | 98 | napi-rs | Dynamic typing (1) |
| 2 | `react/features/desktop-picker/` | ready | 78 | 97 | napi-rs | Dynamic typing (1) |
| 2 | `react/features/old-client-notification/` | keep | 55 | 97 | keep | - |
| 2 | `react/features/power-monitor/` | ready | 151 | 97 | napi-rs | - |
| 2 | `react/features/security/components/security-dialog/` | caution | 85 | 97 | napi-rs | Class inheritance (1) |
| 2 | `react/features/talk-while-muted/` | ready | 124 | 97 | napi-rs | Dynamic typing (1) |
| 2 | `react/features/jaas/components/web/` | keep | 47 | 96 | keep | Dynamic typing (2); Class inheritance (1) |
| 2 | `modules/UI/` | ready | 196 | 95 | napi-rs | - |
| 2 | `react/features/base/settings/components/native/` | keep | 40 | 95 | keep | Class inheritance (1) |
| 2 | `react/features/keyboard-shortcuts/components/` | ready | 43 | 95 | napi-rs | Class inheritance (1) |
| 2 | `react/features/mobile/permissions/` | ready | 85 | 95 | napi-rs | - |
| 2 | `react/features/mobile/picture-in-picture/components/` | ready | 56 | 95 | napi-rs | Class inheritance (1) |
| 2 | `react/features/noise-suppression/components/` | keep | 59 | 95 | keep | Class inheritance (1) |
| 2 | `react/features/videosipgw/` | ready | 229 | 95 | napi-rs | JSON round-trips (1) |
| 2 | `react/features/welcome/` | keep | 66 | 95 | keep | - |
| 2 | `react/features/base/lastn/` | ready | 141 | 94 | napi-rs | Insertion-ordered maps and object keys (2) |
| 2 | `react/features/base/premeeting/` | ready | 258 | 94 | napi-rs | Async and promises (4); Exceptions (3) |
| 2 | `react/features/no-audio-signal/components/` | keep | 30 | 94 | keep | - |
| 2 | `react/features/system-wide-user-notification/components/web/` | keep | 31 | 94 | keep | - |
| 2 | `react/features/unsupported-browser/components/` | keep | 79 | 94 | keep | Class inheritance (1) |
| 2 | `modules/transport/` | ready | 43 | 93 | napi-rs | - |
| 2 | `react/features/base/i18n/components/web/` | keep | 73 | 93 | keep | Insertion-ordered maps and object keys (2) |
| 2 | `react/features/base/low-bandwidth-mode/` | ready | 75 | 93 | napi-rs | - |
| 2 | `react/features/base/sounds/components/` | keep | 140 | 93 | keep | Class inheritance (1) |
| 2 | `react/features/mobile/react-native-sdk/` | ready | 171 | 93 | napi-rs | - |
| 2 | `react/features/polls-history/` | ready | 162 | 93 | napi-rs | Insertion-ordered maps and object keys (2); Dynamic typing (1) |
| 2 | `react/features/shared-video/components/` | keep | 62 | 93 | keep | Class inheritance (1) |
| 2 | `react/features/base/tracks/components/web/` | keep | 36 | 92 | keep | Callback-shaped APIs (1) |
| 2 | `react/features/client-requirements/` | keep | 172 | 92 | keep | Dynamic typing (1) |
| 2 | `react/features/mobile/navigation/components/chat/components/` | keep | 88 | 92 | keep | - |
| 2 | `react/features/base/toolbox/components/web/` | keep | 246 | 91 | keep | Callback-shaped APIs (1) |
| 2 | `react/features/recording/components/` | keep | 82 | 91 | keep | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/remote-control/components/` | keep | 148 | 91 | keep | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/security/` | ready | 79 | 91 | napi-rs | Dynamic typing (1) |
| 2 | `react/features/stream-effects/audio-mixer/` | caution | 97 | 91 | napi-rs | Dynamic typing (6); Exceptions (1) |
| 2 | `react/features/video-layout/components/` | ready | 83 | 91 | napi-rs | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/invite/components/add-people-dialog/` | keep | 281 | 90 | keep | Async and promises (1); Class inheritance (1) |
| 2 | `react/features/no-audio-signal/` | keep | 162 | 90 | keep | Async and promises (3) |
| 2 | `modules/UI/etherpad/` | ready | 152 | 89 | napi-rs | Async and promises (2); Class inheritance (1) |
| 2 | `react/features/base/avatar/components/native/` | keep | 253 | 89 | keep | Class inheritance (1) |
| 2 | `react/features/etherpad/components/` | ready | 123 | 89 | napi-rs | Dynamic typing (2); Class inheritance (2) |
| 2 | `react/features/lobby/components/` | keep | 411 | 89 | keep | Class inheritance (1) |
| 2 | `react/features/mobile/navigation/components/lobby/components/` | keep | 44 | 89 | keep | - |
| 2 | `react/features/base/buttons/` | keep | 212 | 88 | keep | Async and promises (2) |
| 2 | `react/features/base/react/components/` | keep | 122 | 87 | keep | Dynamic typing (3); Class inheritance (2) |
| 2 | `react/features/connection-indicator/components/` | keep | 197 | 87 | keep | Dynamic typing (10); Class inheritance (1) |
| 2 | `react/features/mobile/navigation/components/settings/components/` | keep | 82 | 87 | keep | - |
| 2 | `react/features/system-wide-user-notification/` | ready | 196 | 87 | napi-rs | Insertion-ordered maps and object keys (2) |
| 2 | `react/features/voice-agents/components/web/` | keep | 58 | 87 | keep | Insertion-ordered maps and object keys (1) |
| 2 | `react/features/embed-meeting/components/` | keep | 114 | 86 | keep | Class inheritance (1) |
| 2 | `react/features/mobile/audio-mode/` | ready | 203 | 86 | napi-rs | Dynamic typing (2) |
| 2 | `react/features/mobile/background/` | ready | 159 | 86 | napi-rs | Dynamic typing (1) |
| 2 | `react/features/mobile/picture-in-picture/` | ready | 80 | 86 | napi-rs | Async and promises (2) |
| 2 | `react/features/presence-status/components/` | keep | 108 | 86 | keep | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/share-room/` | ready | 194 | 86 | napi-rs | - |
| 2 | `react/features/base/testing/` | ready | 299 | 85 | napi-rs | - |
| 2 | `react/features/prejoin/components/web/country-picker/` | keep | 295 | 85 | keep | Callback-shaped APIs (1) |
| 2 | `react/features/rtcstats/` | caution | 228 | 85 | napi-rs | Dynamic typing (5); Number semantics (1) |
| 2 | `react/features/screen-share/components/web/` | keep | 206 | 85 | keep | Class inheritance (2) |
| 2 | `react/features/stream-effects/virtual-background/backend/` | ready | 206 | 85 | napi-rs | Async and promises (7); Callback-shaped APIs (2) |
| 2 | `react/features/gifs/components/native/` | keep | 105 | 84 | keep | - |
| 2 | `react/features/overlay/` | ready | 208 | 84 | napi-rs | String offsets and slicing (1); Dynamic typing (5) |
| 2 | `react/features/stream-effects/virtual-background/pipeline/` | ready | 190 | 84 | napi-rs | Async and promises (10); Dynamic typing (2) |
| 2 | `react/features/video-menu/` | ready | 205 | 84 | napi-rs | - |
| 2 | `react/features/visitors/components/web/` | keep | 197 | 84 | keep | - |
| 2 | `react/features/base/avatar/components/web/` | keep | 233 | 83 | keep | - |
| 2 | `react/features/base/color-scheme/` | caution | 182 | 83 | napi-rs | Insertion-ordered maps and object keys (3); Dynamic typing (2) |
| 2 | `react/features/display-name/components/native/` | keep | 125 | 83 | keep | Class inheritance (2); Callback-shaped APIs (1) |
| 2 | `react/features/etherpad/` | ready | 242 | 83 | napi-rs | Exceptions (1) |
| 2 | `react/features/base/label/components/web/` | keep | 116 | 82 | keep | Callback-shaped APIs (1) |
| 2 | `react/features/google-api/components/` | keep | 158 | 82 | keep | Class inheritance (2); Callback-shaped APIs (2) |
| 2 | `react/features/mobile/navigation/components/welcome/components/` | keep | 107 | 82 | keep | Callback-shaped APIs (1) |
| 2 | `react/features/room-lock/` | caution | 245 | 82 | napi-rs | Dynamic typing (1); Async and promises (1) |
| 2 | `react/features/security/components/security-dialog/web/` | keep | 349 | 82 | keep | Class inheritance (1) |
| 2 | `react/features/speaker-stats/components/` | keep | 186 | 82 | keep | Insertion-ordered maps and object keys (3); Class inheritance (1) |
| 2 | `react/features/time-timer/components/native/` | keep | 190 | 82 | keep | String offsets and slicing (3); Number semantics (18) |
| 2 | `react/features/base/flags/` | ready | 327 | 81 | napi-rs | Insertion-ordered maps and object keys (2); Dynamic typing (1) |
| 2 | `react/features/deep-linking/` | ready | 188 | 81 | napi-rs | Regexes built at runtime (2); String offsets and slicing (1) |
| 2 | `react/features/display-name/` | ready | 145 | 81 | napi-rs | - |
| 2 | `react/features/invite/components/callee-info/` | keep | 251 | 81 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/stream-effects/virtual-background/compositor/` | ready | 574 | 81 | napi-rs | Callback-shaped APIs (5); Exceptions (6) |
| 2 | `react/features/toolbox/components/` | keep | 315 | 81 | keep | Class inheritance (5) |
| 2 | `react/features/base/label/components/native/` | keep | 302 | 80 | keep | Class inheritance (2) |
| 2 | `react/features/base/testing/components/` | keep | 322 | 80 | keep | Class inheritance (3); Callback-shaped APIs (1) |
| 2 | `react/features/device-selection/` | caution | 383 | 80 | napi-rs | Dynamic typing (4); Async and promises (3) |
| 2 | `react/features/etherpad/components/native/` | keep | 109 | 80 | keep | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/feedback/components/` | keep | 339 | 80 | keep | Class inheritance (1) |
| 2 | `react/features/lobby/components/web/` | keep | 395 | 80 | keep | Class inheritance (2) |
| 2 | `react/features/mobile/navigation/components/conference/components/` | keep | 253 | 80 | keep | - |
| 2 | `react/features/visitors/components/native/` | keep | 143 | 80 | keep | - |
| 2 | `react/features/base/net-info/` | ready | 312 | 79 | napi-rs | Dynamic typing (2); Class inheritance (2) |
| 2 | `react/features/base/participants/components/` | keep | 297 | 79 | keep | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/custom-panel/components/native/` | keep | 131 | 79 | keep | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/custom-panel/components/web/` | keep | 313 | 79 | keep | Class inheritance (1) |
| 2 | `react/features/dynamic-branding/components/native/` | keep | 76 | 79 | keep | String offsets and slicing (2) |
| 2 | `react/features/mobile/audio-mode/components/` | keep | 351 | 79 | keep | Class inheritance (2) |
| 2 | `react/features/recording/components/web/` | keep | 228 | 79 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/external-api/` | ready | 547 | 78 | napi-rs | Dynamic typing (3); Async and promises (2) |
| 2 | `react/features/lobby/components/native/` | keep | 379 | 78 | keep | Class inheritance (2); Reflection and prototypes (1) |
| 2 | `react/features/recent-list/` | ready | 520 | 78 | napi-rs | String offsets and slicing (1); Clock and random numbers (7) |
| 2 | `react/features/recording/components/native/` | keep | 257 | 78 | keep | Class inheritance (4); Dynamic typing (2) |
| 2 | `react/features/screen-share/` | ready | 367 | 78 | napi-rs | Dynamic typing (2); Async and promises (1) |
| 2 | `react/features/time-timer/components/web/` | keep | 439 | 78 | keep | - |
| 2 | `react/features/authentication/components/native/` | keep | 428 | 77 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/base/dialog/components/` | keep | 111 | 77 | keep | String offsets and slicing (10); Dynamic typing (1) |
| 2 | `react/features/base/tooltip/components/` | keep | 160 | 77 | keep | - |
| 2 | `react/features/connection-indicator/components/native/` | keep | 207 | 77 | keep | Dynamic typing (4); Class inheritance (1) |
| 2 | `react/features/base/dialog/` | keep | 305 | 76 | keep | Dynamic typing (5) |
| 2 | `react/features/base/media/components/` | keep | 244 | 76 | keep | Dynamic typing (6); Callback-shaped APIs (5) |
| 2 | `react/features/conference/components/` | keep | 287 | 76 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/feedback/` | ready | 329 | 76 | napi-rs | Async and promises (10); Exceptions (2) |
| 2 | `react/features/follow-me/` | ready | 527 | 76 | napi-rs | Dynamic typing (3); JSON round-trips (3) |
| 2 | `react/features/pip/components/web/` | keep | 261 | 76 | keep | Class inheritance (1); Exceptions (1) |
| 2 | `react/features/transcribing/` | ready | 358 | 76 | napi-rs | - |
| 2 | `react/features/noise-suppression/` | ready | 204 | 75 | napi-rs | Dynamic typing (5); Async and promises (4) |
| 2 | `react/features/authentication/components/web/` | keep | 403 | 74 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/base/avatar/components/` | keep | 290 | 74 | keep | Dynamic typing (1); Class inheritance (1) |
| 2 | `react/features/base/environment/` | ready | 198 | 74 | napi-rs | Dynamic typing (6); Async and promises (3) |
| 2 | `react/features/connection-indicator/` | ready | 236 | 74 | napi-rs | Insertion-ordered maps and object keys (5); Dynamic typing (2) |
| 2 | `react/features/speaker-stats/components/native/` | keep | 297 | 74 | keep | Class inheritance (2) |
| 2 | `react/features/subtitles/components/` | keep | 348 | 74 | keep | Dynamic typing (2); Class inheritance (2) |
| 2 | `react/features/audio-translation/components/web/` | keep | 266 | 73 | keep | Callback-shaped APIs (2); Dynamic typing (1) |
| 2 | `react/features/invite/components/dial-in-summary/native/` | keep | 160 | 73 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/prejoin/components/native/` | keep | 496 | 73 | keep | - |
| 2 | `react/features/time-timer/` | keep | 802 | 73 | keep | Dynamic typing (1); Number semantics (4) |
| 2 | `react/features/base/app/` | ready | 196 | 72 | napi-rs | Dynamic typing (4); Callback-shaped APIs (1) |
| 2 | `react/features/base/icons/svg/` | ready | 475 | 72 | napi-rs | Dynamic typing (2); Insertion-ordered maps and object keys (1) |
| 2 | `react/features/gifs/components/web/` | keep | 262 | 72 | keep | Async and promises (3) |
| 2 | `react/features/security/components/security-dialog/native/` | keep | 577 | 72 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/chat/components/` | keep | 347 | 71 | keep | Class inheritance (3); Callback-shaped APIs (3) |
| 2 | `react/features/conference/components/native/carmode/` | keep | 496 | 70 | keep | - |
| 2 | `react/features/dropbox/` | ready | 333 | 70 | napi-rs | Dynamic typing (8); Async and promises (4) |
| 2 | `react/features/e2ee/` | ready | 528 | 70 | napi-rs | Insertion-ordered maps and object keys (1) |
| 2 | `react/features/large-video/` | ready | 460 | 70 | napi-rs | Dynamic typing (2); Async and promises (2) |
| 2 | `react/features/stream-effects/noise-suppression/` | blocked | 380 | 70 | napi-rs | Dynamic code (eval, new Function, computed import) (1); Async and promises (8) |
| 2 | `react/features/audio-translation/components/native/` | keep | 295 | 69 | keep | Class inheritance (2); Dynamic typing (1) |
| 2 | `react/features/base/sounds/` | ready | 520 | 69 | napi-rs | Insertion-ordered maps and object keys (4) |
| 2 | `react/features/file-sharing/components/web/` | keep | 595 | 69 | keep | Callback-shaped APIs (2); Class inheritance (1) |
| 2 | `react/features/salesforce/components/native/` | keep | 724 | 69 | keep | Callback-shaped APIs (7) |
| 2 | `react/features/settings/components/web/video/` | keep | 446 | 69 | keep | Dynamic typing (3); Async and promises (2) |
| 2 | `react/features/shared-video/` | ready | 843 | 69 | napi-rs | Exceptions (2) |
| 2 | `react/features/desktop-picker/components/` | keep | 581 | 68 | keep | Dynamic typing (9); Class inheritance (2) |
| 2 | `react/features/mobile/call-integration/` | caution | 598 | 67 | napi-rs | Dynamic typing (12); Reflection and prototypes (4) |
| 2 | `react/features/prejoin/components/web/dialogs/` | keep | 529 | 67 | keep | Callback-shaped APIs (7); Dynamic typing (1) |
| 2 | `react/features/video-quality/` | ready | 931 | 67 | napi-rs | Insertion-ordered maps and object keys (7); Dynamic typing (3) |
| 2 | `react/features/base/modal/components/` | keep | 217 | 66 | keep | Dynamic typing (2); Callback-shaped APIs (1) |
| 2 | `react/features/base/responsive-ui/` | ready | 447 | 66 | napi-rs | Reflection and prototypes (3); Dynamic typing (1) |
| 2 | `react/features/jaas/` | ready | 334 | 66 | napi-rs | Async and promises (11); Dynamic typing (3) |
| 2 | `react/features/analytics/handlers/` | ready | 322 | 65 | napi-rs | String offsets and slicing (4); Dynamic typing (6) |
| 2 | `react/features/base/popover/components/` | keep | 555 | 65 | keep | Class inheritance (1) |
| 2 | `react/features/base/react/` | keep | 197 | 65 | keep | Regex features the `regex` crate lacks (2); Callback-shaped APIs (3) |
| 2 | `react/features/invite/components/add-people-dialog/native/` | keep | 646 | 65 | keep | Dynamic typing (11); Class inheritance (1) |
| 2 | `react/features/keyboard-shortcuts/` | ready | 523 | 65 | napi-rs | Insertion-ordered maps and object keys (4); Async and promises (1) |
| 2 | `react/features/subtitles/components/native/` | keep | 300 | 65 | keep | Callback-shaped APIs (3); Class inheritance (2) |
| 2 | `react/features/video-layout/` | ready | 736 | 65 | napi-rs | Insertion-ordered maps and object keys (1) |
| 2 | `react/features/e2ee/components/` | keep | 328 | 64 | keep | String offsets and slicing (6); Dynamic typing (2) |
| 2 | `react/features/overlay/components/web/` | keep | 473 | 64 | keep | Class inheritance (6); Dynamic typing (2) |
| 2 | `react/features/recent-list/components/` | keep | 485 | 64 | keep | Class inheritance (6); Dynamic typing (4) |
| 2 | `react/features/whiteboard/components/native/` | keep | 337 | 64 | keep | Dynamic typing (2); Class inheritance (2) |
| 2 | `react/features/gifs/` | ready | 413 | 63 | napi-rs | String offsets and slicing (3); Insertion-ordered maps and object keys (1) |
| 2 | `react/features/polls/components/` | keep | 462 | 63 | keep | Callback-shaped APIs (21); Insertion-ordered maps and object keys (2) |
| 2 | `react/features/device-permissions/` | keep | 602 | 62 | keep | Async and promises (14); Dynamic typing (9) |
| 2 | `react/features/salesforce/components/web/` | keep | 823 | 62 | keep | Callback-shaped APIs (7) |
| 2 | `react/features/base/ui/components/` | keep | 214 | 61 | keep | Callback-shaped APIs (4); Dynamic typing (1) |
| 2 | `react/features/notifications/` | keep | 838 | 61 | keep | String offsets and slicing (1); Insertion-ordered maps and object keys (1) |
| 2 | `react/features/base/icons/components/` | keep | 255 | 60 | keep | Dynamic typing (3); Callback-shaped APIs (3) |
| 2 | `react/features/breakout-rooms/components/native/` | keep | 538 | 60 | keep | Insertion-ordered maps and object keys (4); Dynamic typing (3) |
| 2 | `react/features/connection-stats/components/` | keep | 729 | 60 | keep | String offsets and slicing (4); Callback-shaped APIs (3) |
| 2 | `react/features/subtitles/components/web/` | keep | 534 | 60 | keep | Class inheritance (2); Callback-shaped APIs (2) |
| 2 | `react/features/video-menu/components/` | keep | 940 | 60 | keep | Class inheritance (13); Dynamic typing (5) |
| 2 | `react/features/voice-agents/` | ready | 783 | 60 | napi-rs | Insertion-ordered maps and object keys (13); Dynamic typing (5) |
| 2 | `react/features/display-name/components/web/` | keep | 569 | 59 | keep | Class inheritance (1); Callback-shaped APIs (1) |
| 2 | `react/features/virtual-background/` | ready | 416 | 59 | napi-rs | Async and promises (16); Dynamic typing (2) |
| 2 | `react/features/base/premeeting/components/web/` | keep | 773 | 58 | keep | Dynamic typing (2); Callback-shaped APIs (2) |
| 2 | `react/features/mobile/navigation/` | keep | 428 | 58 | keep | Dynamic typing (1); Callback-shaped APIs (1) |
| 2 | `react/features/recording/components/LiveStream/web/` | keep | 678 | 58 | keep | Dynamic typing (7); Class inheritance (5) |
| 2 | `react/features/participants-pane/` | keep | 695 | 57 | keep | Insertion-ordered maps and object keys (2); Callback-shaped APIs (2) |
| 2 | `react/features/base/app/components/` | keep | 276 | 56 | keep | Async and promises (10); Dynamic typing (4) |
| 2 | `react/features/settings/components/web/audio/` | keep | 842 | 56 | keep | Dynamic typing (6); Async and promises (4) |
| 2 | `react/features/conference/` | keep | 613 | 55 | keep | Async and promises (4); Dynamic typing (3) |
| 2 | `react/features/prejoin/components/web/` | keep | 667 | 55 | keep | Dynamic typing (4); Async and promises (4) |
| 2 | `react/features/base/media/components/web/` | keep | 1098 | 54 | keep | Class inheritance (4); Dynamic typing (2) |
| 2 | `react/features/base/ui/components/native/` | keep | 554 | 54 | keep | Callback-shaped APIs (4); Dynamic typing (3) |
| 2 | `react/features/participants-pane/components/breakout-rooms/components/web/` | keep | 782 | 54 | keep | Callback-shaped APIs (8); Insertion-ordered maps and object keys (6) |
| 2 | `react/features/recording/components/LiveStream/native/` | keep | 877 | 54 | keep | Dynamic typing (10); Class inheritance (6) |
| 2 | `react/features/speaker-stats/components/web/` | keep | 1031 | 54 | keep | Class inheritance (1); Callback-shaped APIs (1) |
| 2 | `react/features/file-sharing/` | ready | 681 | 53 | napi-rs | Insertion-ordered maps and object keys (7); Dynamic typing (5) |
| 2 | `react/features/calendar-sync/web/` | ready | 592 | 52 | napi-rs | String offsets and slicing (1); Async and promises (11) |
| 2 | `react/features/mobile/external-api/` | ready | 963 | 52 | napi-rs | Dynamic typing (18); Insertion-ordered maps and object keys (2) |
| 2 | `react/features/polls/components/web/` | keep | 845 | 52 | keep | String offsets and slicing (3); Callback-shaped APIs (2) |
| 2 | `react/features/reactions/components/native/` | keep | 641 | 52 | keep | Dynamic typing (5); Class inheritance (3) |
| 2 | `react/features/stream-effects/virtual-background/workers/` | ready | 462 | 52 | napi-rs | String offsets and slicing (1); Async and promises (23) |
| 2 | `react/features/base/jwt/` | caution | 794 | 50 | napi-rs | String offsets and slicing (2); Insertion-ordered maps and object keys (4) |
| 2 | `react/features/mobile/navigation/components/` | keep | 442 | 50 | keep | Callback-shaped APIs (2); Dynamic typing (1) |
| 2 | `react/features/recording/components/LiveStream/` | keep | 647 | 50 | keep | Regex features the `regex` crate lacks (2); String offsets and slicing (1) |
| 2 | `react/features/av-moderation/` | caution | 1317 | 49 | napi-rs | Dynamic typing (1); Exceptions (2) |
| 2 | `react/features/device-permissions/components/web/` | keep | 1136 | 49 | keep | Callback-shaped APIs (4); Dynamic typing (1) |
| 2 | `react/features/large-video/components/` | keep | 888 | 49 | keep | Dynamic typing (3); Class inheritance (3) |
| 2 | `react/features/whiteboard/components/web/` | keep | 455 | 49 | keep | Async and promises (11); Dynamic typing (7) |
| 2 | `react/features/video-quality/components/` | keep | 741 | 48 | keep | String offsets and slicing (1); Class inheritance (5) |
| 2 | `react/features/base/logging/` | caution | 644 | 47 | napi-rs | Dynamic typing (9); Callback-shaped APIs (3) |
| 2 | `react/features/connection-indicator/components/web/` | keep | 875 | 47 | keep | Dynamic typing (5); Class inheritance (2) |
| 2 | `react/features/reactions/components/web/` | keep | 793 | 47 | keep | String offsets and slicing (1); Dynamic typing (4) |
| 2 | `react/features/audio-translation/` | caution | 864 | 46 | napi-rs | String offsets and slicing (2); Insertion-ordered maps and object keys (14) |
| 2 | `react/features/conference/components/web/` | keep | 1074 | 45 | keep | Class inheritance (3); Dynamic typing (2) |
| 2 | `react/features/custom-panel/` | keep | 816 | 45 | keep | Callback-shaped APIs (11); Dynamic typing (4) |
| 2 | `react/features/polls/` | keep | 897 | 45 | keep | String offsets and slicing (2); Dynamic typing (8) |
| 2 | `react/features/polls/components/native/` | keep | 846 | 45 | keep | String offsets and slicing (3); Callback-shaped APIs (3) |
| 2 | `react/features/remote-control/` | keep | 1273 | 45 | keep | Dynamic typing (7); Async and promises (2) |
| 2 | `react/features/base/redux/` | caution | 657 | 44 | napi-rs | Dynamic typing (31); Insertion-ordered maps and object keys (7) |
| 2 | `react/features/breakout-rooms/` | caution | 748 | 44 | napi-rs | String offsets and slicing (5); Insertion-ordered maps and object keys (16) |
| 2 | `react/features/reactions/` | caution | 948 | 44 | napi-rs | String offsets and slicing (1); Dynamic typing (4) |
| 2 | `react/features/speaker-stats/` | caution | 818 | 44 | napi-rs | Regexes built at runtime (1); Callback-shaped APIs (13) |
| 2 | `react/features/recording/components/Recording/native/` | keep | 893 | 43 | keep | Class inheritance (5); Callback-shaped APIs (3) |
| 2 | `react/features/base/media/` | caution | 1279 | 42 | napi-rs | Dynamic typing (8); Async and promises (1) |
| 2 | `react/features/base/toolbox/components/` | keep | 952 | 41 | keep | Dynamic typing (8); Class inheritance (7) |
| 2 | `react/features/google-api/` | caution | 1029 | 41 | napi-rs | Async and promises (17); Dynamic typing (4) |
| 2 | `react/features/salesforce/` | keep | 794 | 41 | keep | Regex features the `regex` crate lacks (1); Async and promises (37) |
| 2 | `modules/UI/videolayout/` | caution | 1661 | 40 | napi-rs | Async and promises (2) |
| 2 | `react/features/dynamic-branding/` | caution | 957 | 40 | napi-rs | Regex features the `regex` crate lacks (1); Async and promises (16) |
| 2 | `react/features/lobby/` | caution | 1124 | 40 | napi-rs | Async and promises (4); Dynamic typing (3) |
| 2 | `react/features/base/lib-jitsi-meet/` | blocked | 434 | 39 | napi-rs | String offsets and slicing (1); Dynamic code (eval, new Function, computed import) (1) |
| 2 | `react/features/device-selection/components/` | keep | 1136 | 39 | keep | Dynamic typing (6); Async and promises (4) |
| 2 | `react/features/invite/components/add-people-dialog/web/` | keep | 1271 | 38 | keep | Dynamic typing (4); Async and promises (2) |
| 2 | `react/features/calendar-sync/components/` | keep | 1285 | 37 | keep | Class inheritance (10); Dynamic typing (8) |
| 2 | `react/features/shared-video/components/web/` | keep | 1267 | 37 | keep | Dynamic typing (12); Class inheritance (6) |
| 2 | `react/features/subtitles/` | caution | 1053 | 37 | napi-rs | String offsets and slicing (1); Dynamic typing (7) |
| 2 | `react/features/whiteboard/` | caution | 882 | 37 | napi-rs | String offsets and slicing (2); Async and promises (3) |
| 2 | `react/features/filmstrip/components/native/` | keep | 1248 | 36 | keep | Dynamic typing (7); Class inheritance (4) |
| 2 | `react/features/stream-effects/virtual-background/` | caution | 1140 | 36 | napi-rs | Async and promises (22); Dynamic typing (8) |
| 2 | `react/features/base/settings/` | caution | 829 | 35 | napi-rs | Regex features the `regex` crate lacks (2); String offsets and slicing (1) |
| 2 | `react/features/settings/components/native/` | keep | 1343 | 35 | keep | Insertion-ordered maps and object keys (3); Class inheritance (1) |
| 2 | `react/features/shared-video/components/native/` | keep | 944 | 35 | keep | Class inheritance (6); Async and promises (4) |
| 2 | `react/features/base/media/components/native/` | keep | 920 | 34 | keep | Dynamic typing (10); Async and promises (5) |
| 2 | `react/features/screenshot-capture/` | keep | 653 | 34 | keep | String offsets and slicing (1); Async and promises (18) |
| 2 | `react/features/base/devices/` | caution | 1361 | 32 | napi-rs | String offsets and slicing (2); Async and promises (8) |
| 2 | `react/features/recording/components/Recording/web/` | keep | 1299 | 32 | keep | String offsets and slicing (1); Class inheritance (5) |
| 2 | `react/features/analytics/` | caution | 1637 | 30 | napi-rs | Dynamic typing (15); Async and promises (3) |
| 2 | `react/features/virtual-background/components/` | keep | 919 | 29 | keep | String offsets and slicing (2); Async and promises (16) |
| 2 | `react/features/base/connection/` | caution | 1148 | 27 | napi-rs | String offsets and slicing (4); Async and promises (6) |
| 2 | `react/features/participants-pane/components/native/` | keep | 1573 | 27 | keep | Dynamic typing (8); Callback-shaped APIs (3) |
| 2 | `react/features/base/dialog/components/native/` | keep | 1163 | 25 | keep | Class inheritance (7); Callback-shaped APIs (4) |
| 2 | `react/features/base/i18n/` | keep | 810 | 25 | keep | String offsets and slicing (2); Regex features the `regex` crate lacks (1) |
| 2 | `react/features/conference/components/native/` | keep | 1513 | 25 | keep | Dynamic typing (7); Class inheritance (6) |
| 2 | `react/features/face-landmarks/` | caution | 1018 | 24 | napi-rs | String offsets and slicing (1); Async and promises (14) |
| 2 | `react/features/welcome/components/` | keep | 1453 | 24 | keep | String offsets and slicing (2); Dynamic typing (4) |
| 2 | `react/features/visitors/` | caution | 1294 | 23 | napi-rs | Dynamic typing (8); Callback-shaped APIs (5) |
| 2 | `react/features/settings/` | caution | 1144 | 22 | napi-rs | String offsets and slicing (2); Dynamic typing (11) |
| 2 | `react/features/app/` | caution | 1284 | 20 | napi-rs | String offsets and slicing (3); Async and promises (8) |
| 2 | `react/features/prejoin/` | caution | 1743 | 19 | napi-rs | String offsets and slicing (5); Async and promises (11) |
| 2 | `react/features/calendar-sync/` | keep | 1045 | 18 | keep | String offsets and slicing (5); Regexes built at runtime (2) |
| 2 | `modules/API/` | caution | 2543 | 15 | napi-rs | Insertion-ordered maps and object keys (3); JSON round-trips (5) |
| 2 | `react/features/multi-screen/` | keep | 1738 | 15 | keep | String offsets and slicing (2); Async and promises (14) |
| 2 | `react/features/pip/` | keep | 1802 | 14 | keep | String offsets and slicing (1); Callback-shaped APIs (12) |
| 2 | `react/features/toolbox/components/native/` | keep | 1462 | 14 | keep | Dynamic typing (11); Class inheritance (11) |
| 2 | `react/features/authentication/` | caution | 1497 | 11 | napi-rs | String offsets and slicing (2); Dynamic typing (10) |
| 2 | `react/features/base/react/components/native/` | keep | 1641 | 7 | keep | Class inheritance (16); Callback-shaped APIs (13) |
| 2 | `react/features/base/react/components/web/` | keep | 1385 | 7 | keep | String offsets and slicing (6); Class inheritance (11) |
| 2 | `react/features/participants-pane/components/web/` | keep | 2349 | 4 | keep | Callback-shaped APIs (11); Dynamic typing (7) |
| 2 | `react/features/video-menu/components/native/` | keep | 1906 | 3 | keep | Dynamic typing (19); Class inheritance (18) |
| 2 | `react/features/base/conference/` | caution | 4169 | 0 | napi-rs | String offsets and slicing (3); Dynamic typing (36) |
| 2 | `react/features/base/config/` | caution | 2820 | 0 | napi-rs | String offsets and slicing (3); Dynamic typing (24) |
| 2 | `react/features/base/participants/` | caution | 3459 | 0 | napi-rs | String offsets and slicing (13); Insertion-ordered maps and object keys (24) |
| 2 | `react/features/base/tracks/` | keep | 3047 | 0 | keep | String offsets and slicing (3); Dynamic typing (57) |
| 2 | `react/features/base/ui/components/web/` | keep | 3278 | 0 | keep | Callback-shaped APIs (30); Dynamic typing (10) |
| 2 | `react/features/base/util/` | keep | 1517 | 0 | keep | String offsets and slicing (34); Regexes built at runtime (5) |
| 2 | `react/features/chat/` | caution | 3338 | 0 | napi-rs | String offsets and slicing (6); Regexes built at runtime (3) |
| 2 | `react/features/chat/components/native/` | keep | 2907 | 0 | keep | String offsets and slicing (1); Class inheritance (9) |
| 2 | `react/features/chat/components/web/` | keep | 4091 | 0 | keep | String offsets and slicing (4); Callback-shaped APIs (11) |
| 2 | `react/features/filmstrip/` | caution | 3327 | 0 | napi-rs | String offsets and slicing (5); Dynamic typing (12) |
| 2 | `react/features/filmstrip/components/web/` | keep | 3849 | 0 | keep | Dynamic typing (17); Class inheritance (4) |
| 2 | `react/features/invite/` | caution | 1728 | 0 | napi-rs | String offsets and slicing (6); Regexes built at runtime (2) |
| 2 | `react/features/recording/` | keep | 2748 | 0 | keep | String offsets and slicing (2); Async and promises (10) |
| 2 | `react/features/recording/components/Recording/` | keep | 2320 | 0 | keep | Callback-shaped APIs (24); Async and promises (17) |
| 2 | `react/features/settings/components/web/` | keep | 2271 | 0 | keep | String offsets and slicing (5); Dynamic typing (25) |
| 2 | `react/features/toolbox/` | keep | 2550 | 0 | keep | String offsets and slicing (6); Insertion-ordered maps and object keys (10) |
| 2 | `react/features/toolbox/components/web/` | keep | 2425 | 0 | keep | Class inheritance (14); Dynamic typing (4) |
| 2 | `react/features/video-menu/components/web/` | keep | 2875 | 0 | keep | Callback-shaped APIs (14); Class inheritance (11) |
| 3 | `modules/translation/` | ready | 31 | 100 | napi-rs | - |
| 3 | `react/features/authentication/components/` | ready | 4 | 100 | napi-rs | - |
| 3 | `react/features/chrome-extension-banner/` | ready | 2 | 100 | napi-rs | - |
| 3 | `react/features/display-name/components/` | ready | 2 | 100 | napi-rs | - |
| 3 | `react/features/salesforce/components/` | ready | 3 | 100 | napi-rs | - |
| 3 | `react/features/visitors/components/` | ready | 2 | 100 | napi-rs | - |
| 3 | `react/features/base/jitsi-local-storage/` | ready | 86 | 95 | napi-rs | Insertion-ordered maps and object keys (1); Exceptions (1) |
| 3 | `react/features/notifications/components/` | keep | 78 | 94 | keep | Insertion-ordered maps and object keys (5) |
| 3 | `modules/devices/` | ready | 268 | 93 | napi-rs | Async and promises (2) |
| 3 | `react/features/preload/` | ready | 249 | 90 | napi-rs | Async and promises (4); Insertion-ordered maps and object keys (1) |
| 3 | `react/features/voice-agents/components/` | keep | 128 | 89 | keep | - |
| 3 | `modules/screenshare-cast/` | ready | 223 | 86 | napi-rs | Async and promises (6); Exceptions (3) |
| 3 | `react/features/room-lock/components/` | keep | 280 | 84 | keep | Class inheritance (2); Dynamic typing (1) |
| 3 | `react/features/pip/components/` | keep | 411 | 76 | keep | Dynamic typing (2); Async and promises (2) |
| 3 | `react/features/notifications/components/web/` | keep | 430 | 72 | keep | Callback-shaped APIs (2) |
| 3 | `react/features/analytics/handlers/amplitude/` | ready | 140 | 68 | napi-rs | Async and promises (8); Exceptions (2) |
| 3 | `react/features/notifications/components/native/` | keep | 532 | 66 | keep | Dynamic typing (4); Class inheritance (1) |
| 3 | `react/features/always-on-top/` | keep | 1155 | 52 | keep | Callback-shaped APIs (6); Class inheritance (5) |
| 3 | `react/features/load-test/` | ready | 927 | 51 | napi-rs | String offsets and slicing (2); Dynamic typing (21) |
| 3 | `react/features/multi-screen/components/` | keep | 1277 | 44 | keep | String offsets and slicing (1); Callback-shaped APIs (2) |
| 3 | `react/features/invite/components/dial-in-summary/web/` | keep | 574 | 43 | keep | String offsets and slicing (2); Async and promises (7) |
| 3 | `modules/API/external/` | caution | 1741 | 29 | napi-rs | String offsets and slicing (1); Insertion-ordered maps and object keys (9) |
| 4 | `react/features/chrome-extension-banner/components/` | keep | 312 | 77 | keep | Async and promises (2); Class inheritance (1) |
| 4 | `react/features/deep-linking/components/` | keep | 449 | 71 | keep | Regex features the `regex` crate lacks (1); Class inheritance (1) |
| 4 | `conference.js` | caution | 2131 | 28 | napi-rs | Async and promises (39); Exceptions (9) |
| 5 | `app.js` | ready | 62 | 86 | napi-rs | Dynamic typing (1); Async and promises (1) |
| 5 | `react/features/app/components/` | keep | 412 | 62 | keep | Async and promises (11); Dynamic typing (3) |

### 2. @jitsi/react-native-sdk (`react-native-sdk`, node, 0 test files)

| Wave | Unit | Status | Lines | Readiness | Bridge | Main risks |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 0 | `react-native-sdk/sdk_instructions.js` | ready | 2 | 100 | napi-rs | - |
| 0 | `react-native-sdk/prepare_sdk.js` | ready | 182 | 95 | napi-rs | - |
| 0 | `react-native-sdk/update_sdk_dependencies.js` | ready | 45 | 93 | napi-rs | Insertion-ordered maps and object keys (4); Exceptions (1) |
| 0 | `react-native-sdk/update_dependencies.js` | blocked | 82 | 86 | napi-rs | Dynamic code (eval, new Function, computed import) (2); Insertion-ordered maps and object keys (4) |
| 3 | `react-native-sdk/index.tsx` | keep | 155 | 86 | keep | Callback-shaped APIs (6) |

## npm dependencies

| Package | Units | Rust | Fit | Note |
| --- | ---: | --- | --- | --- |
| `redux` | 30 | ? | unknown |  |
| `react-redux` | 28 | ? | unknown |  |
| `react-native` | 19 | ? | unknown |  |
| `@jitsi/js-utils` | 15 | ? | unknown |  |
| `@jitsi/logger` | 8 | ? | unknown |  |
| `i18next` | 8 | ? | unknown |  |
| `jquery` | 3 | ? | unknown |  |
| `@jitsi/rnnoise-wasm` | 2 | ? | unknown |  |
| `@mui/material` | 2 | ? | unknown |  |
| `base64-js` | 2 | ? | unknown |  |
| `js-md5` | 2 | ? | unknown |  |
| `jwt-decode` | 2 | ? | unknown |  |
| `react-i18next` | 2 | ? | unknown |  |
| `react-native-default-preference` | 2 | ? | unknown |  |
| `@amplitude/analytics-browser` | 1 | ? | unknown |  |
| `@amplitude/analytics-core` | 1 | ? | unknown |  |
| `@amplitude/analytics-react-native` | 1 | ? | unknown |  |
| `@amplitude/analytics-types` | 1 | ? | unknown |  |
| `@giphy/react-native-sdk` | 1 | ? | unknown |  |
| `@jitsi/excalidraw` | 1 | ? | unknown |  |
| `@matrix-org/olm` | 1 | ? | unknown |  |
| `@microsoft/microsoft-graph-client` | 1 | ? | unknown |  |
| `@react-native-async-storage/async-storage` | 1 | ? | unknown |  |
| `@react-native-community/netinfo` | 1 | ? | unknown |  |
| `@react-native-google-signin/google-signin` | 1 | ? | unknown |  |
| `@sayem314/react-native-keep-awake` | 1 | ? | unknown |  |
| `@stomp/stompjs` | 1 | ? | unknown |  |
| `@tensorflow-models/body-segmentation` | 1 | ? | unknown |  |
| `@tensorflow/tfjs-backend-wasm` | 1 | ? | unknown |  |
| `@tensorflow/tfjs-backend-webgl` | 1 | ? | unknown |  |
| `@tensorflow/tfjs-backend-webgpu` | 1 | ? | unknown |  |
| `@tensorflow/tfjs-core` | 1 | ? | unknown |  |
| `@vladmandic/human` | 1 | ? | unknown |  |
| `@xmldom/xmldom` | 1 | ? | unknown |  |
| `abab` | 1 | ? | unknown |  |
| `dompurify` | 1 | ? | unknown |  |
| `dropbox` | 1 | ? | unknown |  |
| `focus-visible` | 1 | ? | unknown |  |
| `grapheme-splitter` | 1 | ? | unknown |  |
| `image-capture` | 1 | ? | unknown |  |
| `js-sha512` | 1 | ? | unknown |  |
| `lib-jitsi-meet` | 1 | ? | unknown |  |
| `promise.withresolvers` | 1 | ? | unknown |  |
| `react-emoji-render` | 1 | ? | unknown |  |
| `react-native-background-timer` | 1 | ? | unknown |  |
| `react-native-device-info` | 1 | ? | unknown |  |
| `react-native-gesture-handler` | 1 | ? | unknown |  |
| `react-native-get-random-values` | 1 | ? | unknown |  |
| `react-native-performance` | 1 | ? | unknown |  |
| `react-native-url-polyfill` | 1 | ? | unknown |  |
| `react-native-webrtc` | 1 | ? | unknown |  |
| `react-native-worklets-core` | 1 | ? | unknown |  |
| `redux-thunk` | 1 | ? | unknown |  |
| `reselect` | 1 | ? | unknown |  |
| `text-encoding` | 1 | ? | unknown |  |
| `traverse` | 1 | ? | unknown |  |
| `wasm-check` | 1 | ? | unknown |  |
| `windows-iana` | 1 | ? | unknown |  |
| `lodash-es` | 18 | std, itertools | good |  |
| `uuid` | 7 | uuid, nanoid | good |  |
| `semver` | 2 | node-semver | good | Use node-semver, not semver: npm range syntax differs from Cargo's. |

## Blocked

- `lang/`: Uses dynamic code (eval, new Function or computed imports).
- `react-native-sdk/update_dependencies.js`: Uses dynamic code (eval, new Function or computed imports).
- `react/features/base/lib-jitsi-meet/`: Uses dynamic code (eval, new Function or computed imports).
- `react/features/stream-effects/noise-suppression/`: Uses dynamic code (eval, new Function or computed imports).

## Risk guide

- **String offsets and slicing** (High): JS indexes strings in UTF-16 code units, Rust in UTF-8 bytes. Offsets that cross the boundary must be converted, or non-ASCII text gets wrong ranges silently.
- **Regex features the `regex` crate lacks** (High): Lookaround, backreferences and the `y` flag are not in the `regex` crate. Use `fancy-regex` for those patterns, or rewrite them, and test them on non-ASCII text: `\w`, `\b` and case-insensitive matching differ between engines even where a pattern compiles. JS `/i` without `u` never matches a non-ASCII letter to an ASCII one, Rust `(?i)` does (`ſ` matches `s`, the Kelvin sign `K` matches `k`): write `(?i-u)` or compare with `eq_ignore_ascii_case`.
- **Regexes built at runtime** (High): Patterns come from data or config in JS syntax. Rust regex syntax differs, so user-visible behavior can change. Pin it with tests on real patterns.
- **Dynamic code (eval, new Function, computed import)** (High): eval, new Function and computed imports have no Rust equivalent. Keep this part in JS or replace it with an explicit registry.
- **Dynamic typing** (Medium): Values whose shape is checked at runtime need an explicit Rust enum or `serde_json::Value`.
- **Insertion-ordered maps and object keys** (Medium): JS Map, Set and object keys keep insertion order. `HashMap` does not: use `indexmap` wherever order reaches output. With serde_json's `preserve_order`, `Map::remove` swaps the last key into the hole: use `shift_remove` for JS `delete`. Sort with `js::sort` when a comparator can return NaN: the order then depends on V8's algorithm.
- **Exceptions** (Low): Thrown errors become `Result`. Errors crossing the bridge must map back to the same JS error shape.
- **Async and promises** (Medium): Promises become futures. Bridge with napi-rs `async fn` or `wasm-bindgen-futures`, or keep the async shell in JS and port the sync core.
- **Class inheritance** (Medium): Class hierarchies become traits plus composition; `instanceof` checks become enums.
- **Reflection and prototypes** (Medium): Proxy, Reflect, Symbol and prototype tricks need a redesign, not a translation.
- **Callback-shaped APIs** (Medium): Function-typed parameters and methods cross the bridge on every call. Keep boundaries coarse: pass data in, get data out.
- **Number semantics** (Low): JS numbers are f64; bitwise ops truncate to i32; parseInt is lenient. Pick Rust integer types deliberately. Printing differs: `${n}` gives `1e+21`, `1e-7` and `0` for -0 where Rust's `{}` does not, so use `js::number_to_string`. `Math.round` rounds halves up (-2.5 gives -2), Rust's `round` away from zero: use `js::math_round`. `toFixed` rounds exact halves up ((2.5).toFixed(0) is "3"), Rust's `{:.0}` to even.
- **JSON round-trips** (Low): JSON.stringify key order and number formatting must match `serde_json` output if the result is user-visible.
- **Clock and random numbers** (Low): Results that depend on the time or on random numbers differ on every run, so a plain recording cannot pin them down. Record with `record --pin-clock` (TS/JS with the napi bridge, Python): `Date.now()`, `new Date()` and `Math.random` (`time.time`, `datetime.now` and `random`) then return fixed values during record, diff and gate, and the port reads the same ones from `src/port/pinned.rs` (`now_ms()`, `random()`, a documented mulberry32). Or pass the time and the seed in as parameters.

## Whole app

Shape: **library**.

| Entry point | Kind | Found from |
| --- | --- | --- |
| jitsi-meet: `.` | library | no main and no server: the package's public API |
| @jitsi/react-native-sdk: `react-native-sdk` | library | no main and no server: the package's public API |

### Every dependency

| Dependency | Declared | Used by | Rust | Fit | Note |
| --- | --- | --- | --- | --- | --- |
| `tsx` | yes | 0 | - | none | Loads TS/JS config or plugins at runtime. Keep loading in JS and pass data to Rust. |
| `react-redux` | yes | 170 | ? | unknown |  |
| `react-i18next` | yes | 120 | ? | unknown |  |
| `react-native` | yes | 82 | ? | unknown |  |
| `tss-react` | yes | 57 | ? | unknown |  |
| `redux` | yes | 39 | ? | unknown |  |
| `@jitsi/js-utils` | yes | 26 | ? | unknown |  |
| `@mui/material` | yes | 25 | ? | unknown |  |
| `@react-navigation/native` | yes | 15 | ? | unknown |  |
| `react-native-paper` | yes | 15 | ? | unknown |  |
| `i18next` | yes | 14 | ? | unknown |  |
| `react-native-safe-area-context` | yes | 14 | ? | unknown |  |
| `clsx` | yes | 10 | ? | unknown |  |
| `@jitsi/logger` | yes | 8 | ? | unknown |  |
| `react-native-dialog` | yes | 6 | ? | unknown |  |
| `@react-navigation/stack` | yes | 5 | ? | unknown |  |
| `react-native-webview` | yes | 5 | ? | unknown |  |
| `jquery` | yes | 4 | ? | unknown |  |
| `react-native-svg` | yes | 4 | ? | unknown |  |
| `@giphy/react-native-sdk` | yes | 3 | ? | unknown |  |
| `base64-js` | yes | 3 | ? | unknown |  |
| `js-md5` | yes | 3 | ? | unknown |  |
| `react-emoji-render` | yes | 3 | ? | unknown |  |
| `react-focus-on` | yes | 3 | ? | unknown |  |
| `react-native-device-info` | yes | 3 | ? | unknown |  |
| `react-native-webrtc` | yes | 3 | ? | unknown |  |
| `@emotion/cache` | yes | 2 | ? | unknown |  |
| `@emotion/react` | yes | 2 | ? | unknown |  |
| `@jitsi/excalidraw` | yes | 2 | ? | unknown |  |
| `@jitsi/rnnoise-wasm` | yes | 2 | ? | unknown |  |
| `i18n-iso-countries` | yes | 2 | ? | unknown |  |
| `image-capture` | yes | 2 | ? | unknown |  |
| `jwt-decode` | yes | 2 | ? | unknown |  |
| `react-linkify` | yes | 2 | ? | unknown |  |
| `react-native-default-preference` | yes | 2 | ? | unknown |  |
| `react-window` | yes | 2 | ? | unknown |  |
| `redux-thunk` | yes | 2 | ? | unknown |  |
| `@amplitude/analytics-browser` | yes | 1 | ? | unknown |  |
| `@amplitude/analytics-core` | no | 1 | ? | unknown |  |
| `@amplitude/analytics-react-native` | yes | 1 | ? | unknown |  |
| `@amplitude/analytics-types` | no | 1 | ? | unknown |  |
| `@braintree/sanitize-url` | yes | 1 | ? | unknown |  |
| `@giphy/js-fetch-api` | yes | 1 | ? | unknown |  |
| `@giphy/react-components` | yes | 1 | ? | unknown |  |
| `@matrix-org/olm` | yes | 1 | ? | unknown |  |
| `@microsoft/microsoft-graph-client` | yes | 1 | ? | unknown |  |
| `@react-native-async-storage/async-storage` | yes | 1 | ? | unknown |  |
| `@react-native-clipboard/clipboard` | yes | 1 | ? | unknown |  |
| `@react-native-community/netinfo` | yes | 1 | ? | unknown |  |
| `@react-native-community/slider` | yes | 1 | ? | unknown |  |
| `@react-native-google-signin/google-signin` | yes | 1 | ? | unknown |  |
| `@react-navigation/bottom-tabs` | yes | 1 | ? | unknown |  |
| `@react-navigation/elements` | yes | 1 | ? | unknown |  |
| `@react-navigation/material-top-tabs` | yes | 1 | ? | unknown |  |
| `@sayem314/react-native-keep-awake` | yes | 1 | ? | unknown |  |
| `@stomp/stompjs` | yes | 1 | ? | unknown |  |
| `@tensorflow-models/body-segmentation` | yes | 1 | ? | unknown |  |
| `@tensorflow/tfjs-backend-wasm` | yes | 1 | ? | unknown |  |
| `@tensorflow/tfjs-backend-webgl` | yes | 1 | ? | unknown |  |
| `@tensorflow/tfjs-backend-webgpu` | yes | 1 | ? | unknown |  |
| `@tensorflow/tfjs-core` | yes | 1 | ? | unknown |  |
| `@vladmandic/human` | yes | 1 | ? | unknown |  |
| `@xmldom/xmldom` | yes | 1 | ? | unknown |  |
| `abab` | yes | 1 | ? | unknown |  |
| `classnames` | no | 1 | ? | unknown |  |
| `clipboard-copy` | yes | 1 | ? | unknown |  |
| `dompurify` | yes | 1 | ? | unknown |  |
| `dropbox` | yes | 1 | ? | unknown |  |
| `focus-visible` | yes | 1 | ? | unknown |  |
| `grapheme-splitter` | yes | 1 | ? | unknown |  |
| `i18next-browser-languagedetector` | yes | 1 | ? | unknown |  |
| `i18next-http-backend` | yes | 1 | ? | unknown |  |
| `js-sha512` | yes | 1 | ? | unknown |  |
| `lib-jitsi-meet` | yes | 1 | ? | unknown |  |
| `pixelmatch` | yes | 1 | ? | unknown |  |
| `promise.withresolvers` | yes | 1 | ? | unknown |  |
| `react-dom` | yes | 1 | ? | unknown |  |
| `react-native-background-timer` | yes | 1 | ? | unknown |  |
| `react-native-calendar-events` | yes | 1 | ? | unknown |  |
| `react-native-gesture-handler` | yes | 1 | ? | unknown |  |
| `react-native-get-random-values` | yes | 1 | ? | unknown |  |
| `react-native-orientation-locker` | yes | 1 | ? | unknown |  |
| `react-native-performance` | yes | 1 | ? | unknown |  |
| `react-native-sound` | yes | 1 | ? | unknown |  |
| `react-native-splash-view` | yes | 1 | ? | unknown |  |
| `react-native-url-polyfill` | yes | 1 | ? | unknown |  |
| `react-native-video` | yes | 1 | ? | unknown |  |
| `react-native-worklets-core` | yes | 1 | ? | unknown |  |
| `react-native-youtube-iframe` | yes | 1 | ? | unknown |  |
| `react-textarea-autosize` | yes | 1 | ? | unknown |  |
| `react-virtualized-auto-sizer` | yes | 1 | ? | unknown |  |
| `react-youtube` | yes | 1 | ? | unknown |  |
| `reselect` | yes | 1 | ? | unknown |  |
| `seamless-scroll-polyfill` | yes | 1 | ? | unknown |  |
| `text-encoding` | yes | 1 | ? | unknown |  |
| `traverse` | no | 1 | ? | unknown |  |
| `ts-ebml` | yes | 1 | ? | unknown |  |
| `unorm` | yes | 1 | ? | unknown |  |
| `wasm-check` | yes | 1 | ? | unknown |  |
| `windows-iana` | yes | 1 | ? | unknown |  |
| `zxcvbn` | yes | 1 | ? | unknown |  |
| `@emotion/styled` | yes | 0 | ? | unknown |  |
| `@jitsi/rtcstats` | yes | 0 | ? | unknown |  |
| `@mediapipe/selfie_segmentation` | yes | 0 | ? | unknown |  |
| `@svgr/webpack` | yes | 0 | ? | unknown |  |
| `@tensorflow/tfjs-converter` | yes | 0 | ? | unknown |  |
| `@vladmandic/human-models` | yes | 0 | ? | unknown |  |
| `@wdio/allure-reporter` | yes | 0 | ? | unknown |  |
| `@wdio/cli` | yes | 0 | ? | unknown |  |
| `@wdio/globals` | yes | 0 | ? | unknown |  |
| `@wdio/junit-reporter` | yes | 0 | ? | unknown |  |
| `@wdio/local-runner` | yes | 0 | ? | unknown |  |
| `@wdio/mocha-framework` | yes | 0 | ? | unknown |  |
| `@xmpp/client` | yes | 0 | ? | unknown |  |
| `@xmpp/xml` | yes | 0 | ? | unknown |  |
| `allure-commandline` | yes | 0 | ? | unknown |  |
| `amplitude-js` | yes | 0 | ? | unknown |  |
| `bc-css-flags` | yes | 0 | ? | unknown |  |
| `junit-report-builder` | yes | 0 | ? | unknown |  |
| `null-loader` | yes | 0 | ? | unknown |  |
| `optional-require` | yes | 0 | ? | unknown |  |
| `pretty` | yes | 0 | ? | unknown |  |
| `promise.allsettled` | yes | 0 | ? | unknown |  |
| `punycode` | yes | 0 | ? | unknown |  |
| `react` | yes | 0 | ? | unknown |  |
| `react-native-pager-view` | yes | 0 | ? | unknown |  |
| `react-native-screen-corner-radius` | yes | 0 | ? | unknown |  |
| `react-native-screens` | yes | 0 | ? | unknown |  |
| `react-native-svg-transformer` | yes | 0 | ? | unknown |  |
| `react-native-tab-view` | yes | 0 | ? | unknown |  |
| `testcontainers` | yes | 0 | ? | unknown |  |
| `util` | yes | 0 | ? | unknown |  |
| `webdriverio` | yes | 0 | ? | unknown |  |
| `lodash-es` | yes | 39 | std, itertools | good |  |
| `uuid` | yes | 10 | uuid, nanoid | good |  |
| `semver` | yes | 2 | node-semver | good | Use node-semver, not semver: npm range syntax differs from Cargo's. |
| `dayjs` | yes | 1 | jiff | good |  |
| `dotenv` | yes | 0 | dotenvy | good |  |
| `glob` | yes | 0 | ignore, globset | good |  |
| `jsonwebtoken` | yes | 0 | jsonwebtoken | good |  |
| `ws` | yes | 0 | tokio-tungstenite | good |  |

### Pieces, in port order

- wave 0: `android/scripts/` (26 lines)
- wave 0: `config.js` (1916 lines)
- wave 0: `custom.js` (2 lines)
- wave 0: `doc/jaas/` (7 lines)
- wave 0: `giphy-analytics-stub.js` (12 lines)
- wave 0: `interface_config.js` (196 lines)
- wave 0: `lang/` (28 lines)
- wave 0: `modules/UI/util/` (51 lines)
- wave 0: `modules/recorder/` (39 lines)
- wave 0: `modules/util/` (84 lines)
- wave 0: `pwa-worker.js` (73 lines)
- wave 0: `react-native-sdk/prepare_sdk.js` (182 lines)
- wave 0: `react-native-sdk/sdk_instructions.js` (2 lines)
- wave 0: `react-native-sdk/update_dependencies.js` (82 lines)
- wave 0: `react-native-sdk/update_sdk_dependencies.js` (45 lines)
- wave 0: `react/features/base/avatar/` (144 lines)
- wave 0: `react/features/base/label/` (5 lines)
- wave 0: `react/features/base/media-cast/` (863 lines)
- wave 0: `react/features/base/popover/` (168 lines)
- wave 0: `react/features/base/styles/` (268 lines)
- wave 0: `react/features/base/styles/components/styles/` (45 lines)
- wave 0: `react/features/mobile/polyfills/` (465 lines)
- wave 0: `react/features/presence-status/` (117 lines)
- wave 0: `react/features/stream-effects/rnnoise/` (178 lines)
- wave 0: `react/features/stream-effects/virtual-background/vendor/tflite/` (24 lines)
- wave 0: `static/` (56 lines)
- wave 1: `modules/UI/audio_levels/` (51 lines)
- wave 1: `react/` (114 lines)
- wave 2: `index.android.js` (1 lines)
- wave 2: `index.ios.js` (1 lines)
- wave 2: `modules/API/`, `modules/UI/`, `modules/UI/etherpad/`, `modules/UI/videolayout/`, `modules/transport/`, `react/features/analytics/`, `react/features/analytics/handlers/`, `react/features/app/`, `react/features/audio-translation/`, `react/features/authentication/`, `react/features/av-moderation/`, `react/features/base/app/`, `react/features/base/conference/`, `react/features/base/config/`, `react/features/base/connection/`, `react/features/base/devices/`, `react/features/base/environment/`, `react/features/base/flags/`, `react/features/base/jwt/`, `react/features/base/known-domains/`, `react/features/base/lastn/`, `react/features/base/lib-jitsi-meet/`, `react/features/base/logging/`, `react/features/base/low-bandwidth-mode/`, `react/features/base/media/`, `react/features/base/net-info/`, `react/features/base/participants/`, `react/features/base/premeeting/`, `react/features/base/redux/`, `react/features/base/responsive-ui/`, `react/features/base/settings/`, `react/features/base/sounds/`, `react/features/base/testing/`, `react/features/base/user-interaction/`, `react/features/breakout-rooms/`, `react/features/chat/`, `react/features/connection-indicator/`, `react/features/deep-linking/`, `react/features/desktop-picker/`, `react/features/device-selection/`, `react/features/display-name/`, `react/features/dropbox/`, `react/features/dynamic-branding/`, `react/features/e2ee/`, `react/features/etherpad/`, `react/features/external-api/`, `react/features/face-landmarks/`, `react/features/feedback/`, `react/features/file-sharing/`, `react/features/filmstrip/`, `react/features/follow-me/`, `react/features/gifs/`, `react/features/google-api/`, `react/features/invite/`, `react/features/jaas/`, `react/features/keyboard-shortcuts/`, `react/features/keyboard-shortcuts/components/`, `react/features/large-video/`, `react/features/lobby/`, `react/features/media-connectivity/`, `react/features/mobile/audio-mode/`, `react/features/mobile/background/`, `react/features/mobile/call-integration/`, `react/features/mobile/external-api/`, `react/features/mobile/permissions/`, `react/features/mobile/picture-in-picture/`, `react/features/mobile/proximity/`, `react/features/mobile/react-native-sdk/`, `react/features/mobile/wake-lock/`, `react/features/noise-detection/`, `react/features/noise-suppression/`, `react/features/overlay/`, `react/features/polls-history/`, `react/features/power-monitor/`, `react/features/prejoin/`, `react/features/reactions/`, `react/features/recent-list/`, `react/features/rejoin/`, `react/features/room-lock/`, `react/features/rtcstats/`, `react/features/screen-share/`, `react/features/settings/`, `react/features/share-room/`, `react/features/shared-video/`, `react/features/speaker-stats/`, `react/features/stream-effects/audio-mixer/`, `react/features/stream-effects/noise-suppression/`, `react/features/stream-effects/virtual-background/`, `react/features/stream-effects/virtual-background/backend/`, `react/features/stream-effects/virtual-background/compositor/`, `react/features/stream-effects/virtual-background/pipeline/`, `react/features/stream-effects/virtual-background/workers/`, `react/features/subtitles/`, `react/features/system-wide-user-notification/`, `react/features/talk-while-muted/`, `react/features/transcribing/`, `react/features/video-layout/`, `react/features/video-layout/components/`, `react/features/video-menu/`, `react/features/video-quality/`, `react/features/videosipgw/`, `react/features/virtual-background/`, `react/features/visitors/`, `react/features/voice-agents/`, `react/features/whiteboard/`, tangled: one piece (72082 lines)
- wave 2: `react/features/base/color-scheme/` (182 lines)
- wave 2: `react/features/base/icons/svg/` (475 lines)
- wave 2: `react/features/calendar-sync/web/` (592 lines)
- wave 2: `react/features/embed-meeting/` (20 lines)
- wave 2: `react/features/etherpad/components/` (123 lines)
- wave 2: `react/features/mobile/picture-in-picture/components/` (56 lines)
- wave 2: `react/features/security/` (79 lines)
- wave 2: `react/features/security/components/security-dialog/` (85 lines)
- wave 3: `modules/API/external/` (1741 lines)
- wave 3: `modules/devices/` (268 lines)
- wave 3: `modules/screenshare-cast/` (223 lines)
- wave 3: `modules/translation/` (31 lines)
- wave 3: `react/features/analytics/handlers/amplitude/` (140 lines)
- wave 3: `react/features/authentication/components/` (4 lines)
- wave 3: `react/features/base/jitsi-local-storage/` (86 lines)
- wave 3: `react/features/chrome-extension-banner/` (2 lines)
- wave 3: `react/features/display-name/components/` (2 lines)
- wave 3: `react/features/load-test/` (927 lines)
- wave 3: `react/features/preload/` (249 lines)
- wave 3: `react/features/salesforce/components/` (3 lines)
- wave 3: `react/features/visitors/components/` (2 lines)
- wave 4: `conference.js` (2131 lines)
- wave 5: `app.js` (62 lines)

### Decisions for the user

**D1** (shape): The app is a library, entered through jitsi-meet (.), @jitsi/react-native-sdk (react-native-sdk). Port every entry point, in that shape?

> Yes: the Rust crate's public API becomes the library's front door

**D2** (keep react-native-sdk/index.tsx): react-native-sdk/index.tsx stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D3** (keep react/features/always-on-top/): react/features/always-on-top/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D4** (keep react/features/app/components/): react/features/app/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D5** (keep react/features/audio-level-indicator/components/): react/features/audio-level-indicator/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D6** (keep react/features/audio-translation/components/native/): react/features/audio-translation/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D7** (keep react/features/audio-translation/components/web/): react/features/audio-translation/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D8** (keep react/features/authentication/components/native/): react/features/authentication/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D9** (keep react/features/authentication/components/web/): react/features/authentication/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D10** (keep react/features/base/app/components/): react/features/base/app/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D11** (keep react/features/base/avatar/components/): react/features/base/avatar/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D12** (keep react/features/base/avatar/components/native/): react/features/base/avatar/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D13** (keep react/features/base/avatar/components/web/): react/features/base/avatar/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D14** (keep react/features/base/buttons/): react/features/base/buttons/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D15** (keep react/features/base/dialog/): react/features/base/dialog/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D16** (keep react/features/base/dialog/components/): react/features/base/dialog/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D17** (keep react/features/base/dialog/components/native/): react/features/base/dialog/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D18** (keep react/features/base/dialog/components/web/): react/features/base/dialog/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D19** (keep react/features/base/i18n/): react/features/base/i18n/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D20** (keep react/features/base/i18n/components/web/): react/features/base/i18n/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D21** (keep react/features/base/icons/components/): react/features/base/icons/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D22** (keep react/features/base/label/components/native/): react/features/base/label/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D23** (keep react/features/base/label/components/web/): react/features/base/label/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D24** (keep react/features/base/media/components/): react/features/base/media/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D25** (keep react/features/base/media/components/native/): react/features/base/media/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D26** (keep react/features/base/media/components/web/): react/features/base/media/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D27** (keep react/features/base/modal/): react/features/base/modal/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D28** (keep react/features/base/modal/components/): react/features/base/modal/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D29** (keep react/features/base/participants/components/): react/features/base/participants/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D30** (keep react/features/base/popover/components/): react/features/base/popover/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D31** (keep react/features/base/premeeting/components/web/): react/features/base/premeeting/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D32** (keep react/features/base/react/): react/features/base/react/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D33** (keep react/features/base/react/components/): react/features/base/react/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D34** (keep react/features/base/react/components/native/): react/features/base/react/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D35** (keep react/features/base/react/components/web/): react/features/base/react/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D36** (keep react/features/base/responsive-ui/components/): react/features/base/responsive-ui/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D37** (keep react/features/base/settings/components/native/): react/features/base/settings/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D38** (keep react/features/base/sounds/components/): react/features/base/sounds/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D39** (keep react/features/base/testing/components/): react/features/base/testing/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D40** (keep react/features/base/toolbox/components/): react/features/base/toolbox/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D41** (keep react/features/base/toolbox/components/web/): react/features/base/toolbox/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D42** (keep react/features/base/tooltip/): react/features/base/tooltip/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D43** (keep react/features/base/tooltip/components/): react/features/base/tooltip/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D44** (keep react/features/base/tracks/): react/features/base/tracks/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D45** (keep react/features/base/tracks/components/web/): react/features/base/tracks/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D46** (keep react/features/base/ui/): react/features/base/ui/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D47** (keep react/features/base/ui/components/): react/features/base/ui/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D48** (keep react/features/base/ui/components/native/): react/features/base/ui/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D49** (keep react/features/base/ui/components/web/): react/features/base/ui/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D50** (keep react/features/base/ui/hooks/): react/features/base/ui/hooks/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D51** (keep react/features/base/util/): react/features/base/util/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D52** (keep react/features/breakout-rooms/components/native/): react/features/breakout-rooms/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D53** (keep react/features/calendar-sync/): react/features/calendar-sync/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D54** (keep react/features/calendar-sync/components/): react/features/calendar-sync/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D55** (keep react/features/chat/components/): react/features/chat/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D56** (keep react/features/chat/components/native/): react/features/chat/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D57** (keep react/features/chat/components/web/): react/features/chat/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D58** (keep react/features/chrome-extension-banner/components/): react/features/chrome-extension-banner/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D59** (keep react/features/client-requirements/): react/features/client-requirements/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D60** (keep react/features/conference/): react/features/conference/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D61** (keep react/features/conference/components/): react/features/conference/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D62** (keep react/features/conference/components/native/): react/features/conference/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D63** (keep react/features/conference/components/native/carmode/): react/features/conference/components/native/carmode/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D64** (keep react/features/conference/components/web/): react/features/conference/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D65** (keep react/features/connection-indicator/components/): react/features/connection-indicator/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D66** (keep react/features/connection-indicator/components/native/): react/features/connection-indicator/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D67** (keep react/features/connection-indicator/components/web/): react/features/connection-indicator/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D68** (keep react/features/connection-stats/components/): react/features/connection-stats/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D69** (keep react/features/custom-panel/): react/features/custom-panel/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D70** (keep react/features/custom-panel/components/native/): react/features/custom-panel/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D71** (keep react/features/custom-panel/components/web/): react/features/custom-panel/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D72** (keep react/features/deep-linking/components/): react/features/deep-linking/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D73** (keep react/features/desktop-picker/components/): react/features/desktop-picker/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D74** (keep react/features/device-permissions/): react/features/device-permissions/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D75** (keep react/features/device-permissions/components/web/): react/features/device-permissions/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D76** (keep react/features/device-selection/components/): react/features/device-selection/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D77** (keep react/features/display-name/components/native/): react/features/display-name/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D78** (keep react/features/display-name/components/web/): react/features/display-name/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D79** (keep react/features/dynamic-branding/components/native/): react/features/dynamic-branding/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D80** (keep react/features/e2ee/components/): react/features/e2ee/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D81** (keep react/features/embed-meeting/components/): react/features/embed-meeting/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D82** (keep react/features/etherpad/components/native/): react/features/etherpad/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D83** (keep react/features/feedback/components/): react/features/feedback/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D84** (keep react/features/file-sharing/components/web/): react/features/file-sharing/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D85** (keep react/features/filmstrip/components/native/): react/features/filmstrip/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D86** (keep react/features/filmstrip/components/web/): react/features/filmstrip/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D87** (keep react/features/gifs/components/native/): react/features/gifs/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D88** (keep react/features/gifs/components/web/): react/features/gifs/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D89** (keep react/features/google-api/components/): react/features/google-api/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D90** (keep react/features/invite/components/add-people-dialog/): react/features/invite/components/add-people-dialog/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D91** (keep react/features/invite/components/add-people-dialog/native/): react/features/invite/components/add-people-dialog/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D92** (keep react/features/invite/components/add-people-dialog/web/): react/features/invite/components/add-people-dialog/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D93** (keep react/features/invite/components/callee-info/): react/features/invite/components/callee-info/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D94** (keep react/features/invite/components/dial-in-info-page/): react/features/invite/components/dial-in-info-page/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D95** (keep react/features/invite/components/dial-in-summary/native/): react/features/invite/components/dial-in-summary/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D96** (keep react/features/invite/components/dial-in-summary/web/): react/features/invite/components/dial-in-summary/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D97** (keep react/features/jaas/components/web/): react/features/jaas/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D98** (keep react/features/large-video/components/): react/features/large-video/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D99** (keep react/features/lobby/components/): react/features/lobby/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D100** (keep react/features/lobby/components/native/): react/features/lobby/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D101** (keep react/features/lobby/components/web/): react/features/lobby/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D102** (keep react/features/mobile/audio-mode/components/): react/features/mobile/audio-mode/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D103** (keep react/features/mobile/navigation/): react/features/mobile/navigation/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D104** (keep react/features/mobile/navigation/components/): react/features/mobile/navigation/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D105** (keep react/features/mobile/navigation/components/chat/components/): react/features/mobile/navigation/components/chat/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D106** (keep react/features/mobile/navigation/components/conference/): react/features/mobile/navigation/components/conference/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D107** (keep react/features/mobile/navigation/components/conference/components/): react/features/mobile/navigation/components/conference/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D108** (keep react/features/mobile/navigation/components/lobby/): react/features/mobile/navigation/components/lobby/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D109** (keep react/features/mobile/navigation/components/lobby/components/): react/features/mobile/navigation/components/lobby/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D110** (keep react/features/mobile/navigation/components/settings/): react/features/mobile/navigation/components/settings/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D111** (keep react/features/mobile/navigation/components/settings/components/): react/features/mobile/navigation/components/settings/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D112** (keep react/features/mobile/navigation/components/welcome/components/): react/features/mobile/navigation/components/welcome/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D113** (keep react/features/multi-screen/): react/features/multi-screen/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D114** (keep react/features/multi-screen/components/): react/features/multi-screen/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D115** (keep react/features/no-audio-signal/): react/features/no-audio-signal/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D116** (keep react/features/no-audio-signal/components/): react/features/no-audio-signal/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D117** (keep react/features/noise-suppression/components/): react/features/noise-suppression/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D118** (keep react/features/notifications/): react/features/notifications/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D119** (keep react/features/notifications/components/): react/features/notifications/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D120** (keep react/features/notifications/components/native/): react/features/notifications/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D121** (keep react/features/notifications/components/web/): react/features/notifications/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D122** (keep react/features/old-client-notification/): react/features/old-client-notification/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D123** (keep react/features/old-client-notification/components/): react/features/old-client-notification/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D124** (keep react/features/overlay/components/web/): react/features/overlay/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D125** (keep react/features/participants-pane/): react/features/participants-pane/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D126** (keep react/features/participants-pane/components/breakout-rooms/components/web/): react/features/participants-pane/components/breakout-rooms/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D127** (keep react/features/participants-pane/components/native/): react/features/participants-pane/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D128** (keep react/features/participants-pane/components/web/): react/features/participants-pane/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D129** (keep react/features/pip/): react/features/pip/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D130** (keep react/features/pip/components/): react/features/pip/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D131** (keep react/features/pip/components/web/): react/features/pip/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D132** (keep react/features/polls/): react/features/polls/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D133** (keep react/features/polls/components/): react/features/polls/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D134** (keep react/features/polls/components/native/): react/features/polls/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D135** (keep react/features/polls/components/web/): react/features/polls/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D136** (keep react/features/prejoin/components/native/): react/features/prejoin/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D137** (keep react/features/prejoin/components/web/): react/features/prejoin/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D138** (keep react/features/prejoin/components/web/country-picker/): react/features/prejoin/components/web/country-picker/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D139** (keep react/features/prejoin/components/web/dialogs/): react/features/prejoin/components/web/dialogs/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D140** (keep react/features/prejoin/components/web/preview/): react/features/prejoin/components/web/preview/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D141** (keep react/features/presence-status/components/): react/features/presence-status/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D142** (keep react/features/reactions/components/native/): react/features/reactions/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D143** (keep react/features/reactions/components/web/): react/features/reactions/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D144** (keep react/features/recent-list/components/): react/features/recent-list/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D145** (keep react/features/recording/): react/features/recording/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D146** (keep react/features/recording/components/): react/features/recording/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D147** (keep react/features/recording/components/LiveStream/): react/features/recording/components/LiveStream/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D148** (keep react/features/recording/components/LiveStream/native/): react/features/recording/components/LiveStream/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D149** (keep react/features/recording/components/LiveStream/web/): react/features/recording/components/LiveStream/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D150** (keep react/features/recording/components/Recording/): react/features/recording/components/Recording/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D151** (keep react/features/recording/components/Recording/native/): react/features/recording/components/Recording/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D152** (keep react/features/recording/components/Recording/web/): react/features/recording/components/Recording/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D153** (keep react/features/recording/components/native/): react/features/recording/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D154** (keep react/features/recording/components/web/): react/features/recording/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D155** (keep react/features/remote-control/): react/features/remote-control/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D156** (keep react/features/remote-control/components/): react/features/remote-control/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D157** (keep react/features/room-lock/components/): react/features/room-lock/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D158** (keep react/features/salesforce/): react/features/salesforce/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D159** (keep react/features/salesforce/components/native/): react/features/salesforce/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D160** (keep react/features/salesforce/components/web/): react/features/salesforce/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D161** (keep react/features/screen-share/components/web/): react/features/screen-share/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D162** (keep react/features/screenshot-capture/): react/features/screenshot-capture/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D163** (keep react/features/security/components/security-dialog/native/): react/features/security/components/security-dialog/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D164** (keep react/features/security/components/security-dialog/web/): react/features/security/components/security-dialog/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D165** (keep react/features/settings/components/native/): react/features/settings/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D166** (keep react/features/settings/components/web/): react/features/settings/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D167** (keep react/features/settings/components/web/audio/): react/features/settings/components/web/audio/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D168** (keep react/features/settings/components/web/video/): react/features/settings/components/web/video/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D169** (keep react/features/shared-video/components/): react/features/shared-video/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D170** (keep react/features/shared-video/components/native/): react/features/shared-video/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D171** (keep react/features/shared-video/components/web/): react/features/shared-video/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D172** (keep react/features/speaker-stats/components/): react/features/speaker-stats/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D173** (keep react/features/speaker-stats/components/native/): react/features/speaker-stats/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D174** (keep react/features/speaker-stats/components/web/): react/features/speaker-stats/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D175** (keep react/features/subtitles/components/): react/features/subtitles/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D176** (keep react/features/subtitles/components/native/): react/features/subtitles/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D177** (keep react/features/subtitles/components/web/): react/features/subtitles/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D178** (keep react/features/system-wide-user-notification/components/web/): react/features/system-wide-user-notification/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D179** (keep react/features/time-timer/): react/features/time-timer/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D180** (keep react/features/time-timer/components/native/): react/features/time-timer/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D181** (keep react/features/time-timer/components/web/): react/features/time-timer/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D182** (keep react/features/toolbox/): react/features/toolbox/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D183** (keep react/features/toolbox/components/): react/features/toolbox/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D184** (keep react/features/toolbox/components/native/): react/features/toolbox/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D185** (keep react/features/toolbox/components/web/): react/features/toolbox/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D186** (keep react/features/unsupported-browser/components/): react/features/unsupported-browser/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D187** (keep react/features/video-menu/components/): react/features/video-menu/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D188** (keep react/features/video-menu/components/native/): react/features/video-menu/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D189** (keep react/features/video-menu/components/web/): react/features/video-menu/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D190** (keep react/features/video-quality/components/): react/features/video-quality/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D191** (keep react/features/virtual-background/components/): react/features/virtual-background/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D192** (keep react/features/visitors/components/native/): react/features/visitors/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D193** (keep react/features/visitors/components/web/): react/features/visitors/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D194** (keep react/features/voice-agents/components/): react/features/voice-agents/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D195** (keep react/features/voice-agents/components/web/): react/features/voice-agents/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D196** (keep react/features/welcome/): react/features/welcome/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D197** (keep react/features/welcome/components/): react/features/welcome/components/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D198** (keep react/features/whiteboard/components/native/): react/features/whiteboard/components/native/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D199** (keep react/features/whiteboard/components/web/): react/features/whiteboard/components/web/ stays in the source language (UI code: keep in the original language). What replaces it in the Rust app, or does it stay outside?

> Keep it outside the Rust app, behind the front door, and decide its replacement once the rest is Rust

**D200** (blocked lang/): lang/ is blocked: Uses dynamic code (eval, new Function or computed imports). Rework that part in Rust, or keep the unit outside?

> Research the blocker first; then port it with the piece that uses it

**D201** (blocked react-native-sdk/update_dependencies.js): react-native-sdk/update_dependencies.js is blocked: Uses dynamic code (eval, new Function or computed imports). Rework that part in Rust, or keep the unit outside?

> Research the blocker first; then port it with the piece that uses it

**D202** (blocked react/features/base/lib-jitsi-meet/): react/features/base/lib-jitsi-meet/ is blocked: Uses dynamic code (eval, new Function or computed imports). Rework that part in Rust, or keep the unit outside?

> Research the blocker first; then port it with the piece that uses it

**D203** (blocked react/features/stream-effects/noise-suppression/): react/features/stream-effects/noise-suppression/ is blocked: Uses dynamic code (eval, new Function or computed imports). Rework that part in Rust, or keep the unit outside?

> Research the blocker first; then port it with the piece that uses it

**D204** (dependency tsx): No crate does what tsx does (declared, no unit imports it; Loads TS/JS config or plugins at runtime. Keep loading in JS and pass data to Rust). Reimplement what the app uses, or drop the feature?

> Reimplement only the part the app uses, proved by its recorded cases

**D205** (dependency react-redux): Which crate replaces react-redux (used by 170 units)?

> Research it against primary sources into rust/research/react-redux.md before porting what uses it

**D206** (dependency react-i18next): Which crate replaces react-i18next (used by 120 units)?

> Research it against primary sources into rust/research/react-i18next.md before porting what uses it

**D207** (dependency react-native): Which crate replaces react-native (used by 82 units)?

> Research it against primary sources into rust/research/react-native.md before porting what uses it

**D208** (dependency tss-react): Which crate replaces tss-react (used by 57 units)?

> Research it against primary sources into rust/research/tss-react.md before porting what uses it

**D209** (dependency redux): Which crate replaces redux (used by 39 units)?

> Research it against primary sources into rust/research/redux.md before porting what uses it

**D210** (dependency @jitsi/js-utils): Which crate replaces @jitsi/js-utils (used by 26 units)?

> Research it against primary sources into rust/research/@jitsi-js-utils.md before porting what uses it

**D211** (dependency @mui/material): Which crate replaces @mui/material (used by 25 units)?

> Research it against primary sources into rust/research/@mui-material.md before porting what uses it

**D212** (dependency @react-navigation/native): Which crate replaces @react-navigation/native (used by 15 units)?

> Research it against primary sources into rust/research/@react-navigation-native.md before porting what uses it

**D213** (dependency react-native-paper): Which crate replaces react-native-paper (used by 15 units)?

> Research it against primary sources into rust/research/react-native-paper.md before porting what uses it

**D214** (dependency i18next): Which crate replaces i18next (used by 14 units)?

> Research it against primary sources into rust/research/i18next.md before porting what uses it

**D215** (dependency react-native-safe-area-context): Which crate replaces react-native-safe-area-context (used by 14 units)?

> Research it against primary sources into rust/research/react-native-safe-area-context.md before porting what uses it

**D216** (dependency clsx): Which crate replaces clsx (used by 10 units)?

> Research it against primary sources into rust/research/clsx.md before porting what uses it

**D217** (dependency @jitsi/logger): Which crate replaces @jitsi/logger (used by 8 units)?

> Research it against primary sources into rust/research/@jitsi-logger.md before porting what uses it

**D218** (dependency react-native-dialog): Which crate replaces react-native-dialog (used by 6 units)?

> Research it against primary sources into rust/research/react-native-dialog.md before porting what uses it

**D219** (dependency @react-navigation/stack): Which crate replaces @react-navigation/stack (used by 5 units)?

> Research it against primary sources into rust/research/@react-navigation-stack.md before porting what uses it

**D220** (dependency react-native-webview): Which crate replaces react-native-webview (used by 5 units)?

> Research it against primary sources into rust/research/react-native-webview.md before porting what uses it

**D221** (dependency jquery): Which crate replaces jquery (used by 4 units)?

> Research it against primary sources into rust/research/jquery.md before porting what uses it

**D222** (dependency react-native-svg): Which crate replaces react-native-svg (used by 4 units)?

> Research it against primary sources into rust/research/react-native-svg.md before porting what uses it

**D223** (dependency @giphy/react-native-sdk): Which crate replaces @giphy/react-native-sdk (used by 3 units)?

> Research it against primary sources into rust/research/@giphy-react-native-sdk.md before porting what uses it

**D224** (dependency base64-js): Which crate replaces base64-js (used by 3 units)?

> Research it against primary sources into rust/research/base64-js.md before porting what uses it

**D225** (dependency js-md5): Which crate replaces js-md5 (used by 3 units)?

> Research it against primary sources into rust/research/js-md5.md before porting what uses it

**D226** (dependency react-emoji-render): Which crate replaces react-emoji-render (used by 3 units)?

> Research it against primary sources into rust/research/react-emoji-render.md before porting what uses it

**D227** (dependency react-focus-on): Which crate replaces react-focus-on (used by 3 units)?

> Research it against primary sources into rust/research/react-focus-on.md before porting what uses it

**D228** (dependency react-native-device-info): Which crate replaces react-native-device-info (used by 3 units)?

> Research it against primary sources into rust/research/react-native-device-info.md before porting what uses it

**D229** (dependency react-native-webrtc): Which crate replaces react-native-webrtc (used by 3 units)?

> Research it against primary sources into rust/research/react-native-webrtc.md before porting what uses it

**D230** (dependency @emotion/cache): Which crate replaces @emotion/cache (used by 2 units)?

> Research it against primary sources into rust/research/@emotion-cache.md before porting what uses it

**D231** (dependency @emotion/react): Which crate replaces @emotion/react (used by 2 units)?

> Research it against primary sources into rust/research/@emotion-react.md before porting what uses it

**D232** (dependency @jitsi/excalidraw): Which crate replaces @jitsi/excalidraw (used by 2 units)?

> Research it against primary sources into rust/research/@jitsi-excalidraw.md before porting what uses it

**D233** (dependency @jitsi/rnnoise-wasm): Which crate replaces @jitsi/rnnoise-wasm (used by 2 units)?

> Research it against primary sources into rust/research/@jitsi-rnnoise-wasm.md before porting what uses it

**D234** (dependency i18n-iso-countries): Which crate replaces i18n-iso-countries (used by 2 units)?

> Research it against primary sources into rust/research/i18n-iso-countries.md before porting what uses it

**D235** (dependency image-capture): Which crate replaces image-capture (used by 2 units)?

> Research it against primary sources into rust/research/image-capture.md before porting what uses it

**D236** (dependency jwt-decode): Which crate replaces jwt-decode (used by 2 units)?

> Research it against primary sources into rust/research/jwt-decode.md before porting what uses it

**D237** (dependency react-linkify): Which crate replaces react-linkify (used by 2 units)?

> Research it against primary sources into rust/research/react-linkify.md before porting what uses it

**D238** (dependency react-native-default-preference): Which crate replaces react-native-default-preference (used by 2 units)?

> Research it against primary sources into rust/research/react-native-default-preference.md before porting what uses it

**D239** (dependency react-window): Which crate replaces react-window (used by 2 units)?

> Research it against primary sources into rust/research/react-window.md before porting what uses it

**D240** (dependency redux-thunk): Which crate replaces redux-thunk (used by 2 units)?

> Research it against primary sources into rust/research/redux-thunk.md before porting what uses it

**D241** (dependency @amplitude/analytics-browser): Which crate replaces @amplitude/analytics-browser (used by 1 unit)?

> Research it against primary sources into rust/research/@amplitude-analytics-browser.md before porting what uses it

**D242** (dependency @amplitude/analytics-core): Which crate replaces @amplitude/analytics-core (used by 1 unit)?

> Research it against primary sources into rust/research/@amplitude-analytics-core.md before porting what uses it

**D243** (dependency @amplitude/analytics-react-native): Which crate replaces @amplitude/analytics-react-native (used by 1 unit)?

> Research it against primary sources into rust/research/@amplitude-analytics-react-native.md before porting what uses it

**D244** (dependency @amplitude/analytics-types): Which crate replaces @amplitude/analytics-types (used by 1 unit)?

> Research it against primary sources into rust/research/@amplitude-analytics-types.md before porting what uses it

**D245** (dependency @braintree/sanitize-url): Which crate replaces @braintree/sanitize-url (used by 1 unit)?

> Research it against primary sources into rust/research/@braintree-sanitize-url.md before porting what uses it

**D246** (dependency @giphy/js-fetch-api): Which crate replaces @giphy/js-fetch-api (used by 1 unit)?

> Research it against primary sources into rust/research/@giphy-js-fetch-api.md before porting what uses it

**D247** (dependency @giphy/react-components): Which crate replaces @giphy/react-components (used by 1 unit)?

> Research it against primary sources into rust/research/@giphy-react-components.md before porting what uses it

**D248** (dependency @matrix-org/olm): Which crate replaces @matrix-org/olm (used by 1 unit)?

> Research it against primary sources into rust/research/@matrix-org-olm.md before porting what uses it

**D249** (dependency @microsoft/microsoft-graph-client): Which crate replaces @microsoft/microsoft-graph-client (used by 1 unit)?

> Research it against primary sources into rust/research/@microsoft-microsoft-graph-client.md before porting what uses it

**D250** (dependency @react-native-async-storage/async-storage): Which crate replaces @react-native-async-storage/async-storage (used by 1 unit)?

> Research it against primary sources into rust/research/@react-native-async-storage-async-storage.md before porting what uses it

**D251** (dependency @react-native-clipboard/clipboard): Which crate replaces @react-native-clipboard/clipboard (used by 1 unit)?

> Research it against primary sources into rust/research/@react-native-clipboard-clipboard.md before porting what uses it

**D252** (dependency @react-native-community/netinfo): Which crate replaces @react-native-community/netinfo (used by 1 unit)?

> Research it against primary sources into rust/research/@react-native-community-netinfo.md before porting what uses it

**D253** (dependency @react-native-community/slider): Which crate replaces @react-native-community/slider (used by 1 unit)?

> Research it against primary sources into rust/research/@react-native-community-slider.md before porting what uses it

**D254** (dependency @react-native-google-signin/google-signin): Which crate replaces @react-native-google-signin/google-signin (used by 1 unit)?

> Research it against primary sources into rust/research/@react-native-google-signin-google-signin.md before porting what uses it

**D255** (dependency @react-navigation/bottom-tabs): Which crate replaces @react-navigation/bottom-tabs (used by 1 unit)?

> Research it against primary sources into rust/research/@react-navigation-bottom-tabs.md before porting what uses it

**D256** (dependency @react-navigation/elements): Which crate replaces @react-navigation/elements (used by 1 unit)?

> Research it against primary sources into rust/research/@react-navigation-elements.md before porting what uses it

**D257** (dependency @react-navigation/material-top-tabs): Which crate replaces @react-navigation/material-top-tabs (used by 1 unit)?

> Research it against primary sources into rust/research/@react-navigation-material-top-tabs.md before porting what uses it

**D258** (dependency @sayem314/react-native-keep-awake): Which crate replaces @sayem314/react-native-keep-awake (used by 1 unit)?

> Research it against primary sources into rust/research/@sayem314-react-native-keep-awake.md before porting what uses it

**D259** (dependency @stomp/stompjs): Which crate replaces @stomp/stompjs (used by 1 unit)?

> Research it against primary sources into rust/research/@stomp-stompjs.md before porting what uses it

**D260** (dependency @tensorflow-models/body-segmentation): Which crate replaces @tensorflow-models/body-segmentation (used by 1 unit)?

> Research it against primary sources into rust/research/@tensorflow-models-body-segmentation.md before porting what uses it

**D261** (dependency @tensorflow/tfjs-backend-wasm): Which crate replaces @tensorflow/tfjs-backend-wasm (used by 1 unit)?

> Research it against primary sources into rust/research/@tensorflow-tfjs-backend-wasm.md before porting what uses it

**D262** (dependency @tensorflow/tfjs-backend-webgl): Which crate replaces @tensorflow/tfjs-backend-webgl (used by 1 unit)?

> Research it against primary sources into rust/research/@tensorflow-tfjs-backend-webgl.md before porting what uses it

**D263** (dependency @tensorflow/tfjs-backend-webgpu): Which crate replaces @tensorflow/tfjs-backend-webgpu (used by 1 unit)?

> Research it against primary sources into rust/research/@tensorflow-tfjs-backend-webgpu.md before porting what uses it

**D264** (dependency @tensorflow/tfjs-core): Which crate replaces @tensorflow/tfjs-core (used by 1 unit)?

> Research it against primary sources into rust/research/@tensorflow-tfjs-core.md before porting what uses it

**D265** (dependency @vladmandic/human): Which crate replaces @vladmandic/human (used by 1 unit)?

> Research it against primary sources into rust/research/@vladmandic-human.md before porting what uses it

**D266** (dependency @xmldom/xmldom): Which crate replaces @xmldom/xmldom (used by 1 unit)?

> Research it against primary sources into rust/research/@xmldom-xmldom.md before porting what uses it

**D267** (dependency abab): Which crate replaces abab (used by 1 unit)?

> Research it against primary sources into rust/research/abab.md before porting what uses it

**D268** (dependency classnames): Which crate replaces classnames (used by 1 unit)?

> Research it against primary sources into rust/research/classnames.md before porting what uses it

**D269** (dependency clipboard-copy): Which crate replaces clipboard-copy (used by 1 unit)?

> Research it against primary sources into rust/research/clipboard-copy.md before porting what uses it

**D270** (dependency dompurify): Which crate replaces dompurify (used by 1 unit)?

> Research it against primary sources into rust/research/dompurify.md before porting what uses it

**D271** (dependency dropbox): Which crate replaces dropbox (used by 1 unit)?

> Research it against primary sources into rust/research/dropbox.md before porting what uses it

**D272** (dependency focus-visible): Which crate replaces focus-visible (used by 1 unit)?

> Research it against primary sources into rust/research/focus-visible.md before porting what uses it

**D273** (dependency grapheme-splitter): Which crate replaces grapheme-splitter (used by 1 unit)?

> Research it against primary sources into rust/research/grapheme-splitter.md before porting what uses it

**D274** (dependency i18next-browser-languagedetector): Which crate replaces i18next-browser-languagedetector (used by 1 unit)?

> Research it against primary sources into rust/research/i18next-browser-languagedetector.md before porting what uses it

**D275** (dependency i18next-http-backend): Which crate replaces i18next-http-backend (used by 1 unit)?

> Research it against primary sources into rust/research/i18next-http-backend.md before porting what uses it

**D276** (dependency js-sha512): Which crate replaces js-sha512 (used by 1 unit)?

> Research it against primary sources into rust/research/js-sha512.md before porting what uses it

**D277** (dependency lib-jitsi-meet): Which crate replaces lib-jitsi-meet (used by 1 unit)?

> Research it against primary sources into rust/research/lib-jitsi-meet.md before porting what uses it

**D278** (dependency pixelmatch): Which crate replaces pixelmatch (used by 1 unit)?

> Research it against primary sources into rust/research/pixelmatch.md before porting what uses it

**D279** (dependency promise.withresolvers): Which crate replaces promise.withresolvers (used by 1 unit)?

> Research it against primary sources into rust/research/promise.withresolvers.md before porting what uses it

**D280** (dependency react-dom): Which crate replaces react-dom (used by 1 unit)?

> Research it against primary sources into rust/research/react-dom.md before porting what uses it

**D281** (dependency react-native-background-timer): Which crate replaces react-native-background-timer (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-background-timer.md before porting what uses it

**D282** (dependency react-native-calendar-events): Which crate replaces react-native-calendar-events (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-calendar-events.md before porting what uses it

**D283** (dependency react-native-gesture-handler): Which crate replaces react-native-gesture-handler (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-gesture-handler.md before porting what uses it

**D284** (dependency react-native-get-random-values): Which crate replaces react-native-get-random-values (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-get-random-values.md before porting what uses it

**D285** (dependency react-native-orientation-locker): Which crate replaces react-native-orientation-locker (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-orientation-locker.md before porting what uses it

**D286** (dependency react-native-performance): Which crate replaces react-native-performance (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-performance.md before porting what uses it

**D287** (dependency react-native-sound): Which crate replaces react-native-sound (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-sound.md before porting what uses it

**D288** (dependency react-native-splash-view): Which crate replaces react-native-splash-view (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-splash-view.md before porting what uses it

**D289** (dependency react-native-url-polyfill): Which crate replaces react-native-url-polyfill (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-url-polyfill.md before porting what uses it

**D290** (dependency react-native-video): Which crate replaces react-native-video (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-video.md before porting what uses it

**D291** (dependency react-native-worklets-core): Which crate replaces react-native-worklets-core (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-worklets-core.md before porting what uses it

**D292** (dependency react-native-youtube-iframe): Which crate replaces react-native-youtube-iframe (used by 1 unit)?

> Research it against primary sources into rust/research/react-native-youtube-iframe.md before porting what uses it

**D293** (dependency react-textarea-autosize): Which crate replaces react-textarea-autosize (used by 1 unit)?

> Research it against primary sources into rust/research/react-textarea-autosize.md before porting what uses it

**D294** (dependency react-virtualized-auto-sizer): Which crate replaces react-virtualized-auto-sizer (used by 1 unit)?

> Research it against primary sources into rust/research/react-virtualized-auto-sizer.md before porting what uses it

**D295** (dependency react-youtube): Which crate replaces react-youtube (used by 1 unit)?

> Research it against primary sources into rust/research/react-youtube.md before porting what uses it

**D296** (dependency reselect): Which crate replaces reselect (used by 1 unit)?

> Research it against primary sources into rust/research/reselect.md before porting what uses it

**D297** (dependency seamless-scroll-polyfill): Which crate replaces seamless-scroll-polyfill (used by 1 unit)?

> Research it against primary sources into rust/research/seamless-scroll-polyfill.md before porting what uses it

**D298** (dependency text-encoding): Which crate replaces text-encoding (used by 1 unit)?

> Research it against primary sources into rust/research/text-encoding.md before porting what uses it

**D299** (dependency traverse): Which crate replaces traverse (used by 1 unit)?

> Research it against primary sources into rust/research/traverse.md before porting what uses it

**D300** (dependency ts-ebml): Which crate replaces ts-ebml (used by 1 unit)?

> Research it against primary sources into rust/research/ts-ebml.md before porting what uses it

**D301** (dependency unorm): Which crate replaces unorm (used by 1 unit)?

> Research it against primary sources into rust/research/unorm.md before porting what uses it

**D302** (dependency wasm-check): Which crate replaces wasm-check (used by 1 unit)?

> Research it against primary sources into rust/research/wasm-check.md before porting what uses it

**D303** (dependency windows-iana): Which crate replaces windows-iana (used by 1 unit)?

> Research it against primary sources into rust/research/windows-iana.md before porting what uses it

**D304** (dependency zxcvbn): Which crate replaces zxcvbn (used by 1 unit)?

> Research it against primary sources into rust/research/zxcvbn.md before porting what uses it

**D305** (dependency @emotion/styled): Which crate replaces @emotion/styled (declared, no unit imports it)?

> Research it against primary sources into rust/research/@emotion-styled.md before porting what uses it

**D306** (dependency @jitsi/rtcstats): Which crate replaces @jitsi/rtcstats (declared, no unit imports it)?

> Research it against primary sources into rust/research/@jitsi-rtcstats.md before porting what uses it

**D307** (dependency @mediapipe/selfie_segmentation): Which crate replaces @mediapipe/selfie_segmentation (declared, no unit imports it)?

> Research it against primary sources into rust/research/@mediapipe-selfie_segmentation.md before porting what uses it

**D308** (dependency @svgr/webpack): Which crate replaces @svgr/webpack (declared, no unit imports it)?

> Research it against primary sources into rust/research/@svgr-webpack.md before porting what uses it

**D309** (dependency @tensorflow/tfjs-converter): Which crate replaces @tensorflow/tfjs-converter (declared, no unit imports it)?

> Research it against primary sources into rust/research/@tensorflow-tfjs-converter.md before porting what uses it

**D310** (dependency @vladmandic/human-models): Which crate replaces @vladmandic/human-models (declared, no unit imports it)?

> Research it against primary sources into rust/research/@vladmandic-human-models.md before porting what uses it

**D311** (dependency @wdio/allure-reporter): Which crate replaces @wdio/allure-reporter (declared, no unit imports it)?

> Research it against primary sources into rust/research/@wdio-allure-reporter.md before porting what uses it

**D312** (dependency @wdio/cli): Which crate replaces @wdio/cli (declared, no unit imports it)?

> Research it against primary sources into rust/research/@wdio-cli.md before porting what uses it

**D313** (dependency @wdio/globals): Which crate replaces @wdio/globals (declared, no unit imports it)?

> Research it against primary sources into rust/research/@wdio-globals.md before porting what uses it

**D314** (dependency @wdio/junit-reporter): Which crate replaces @wdio/junit-reporter (declared, no unit imports it)?

> Research it against primary sources into rust/research/@wdio-junit-reporter.md before porting what uses it

**D315** (dependency @wdio/local-runner): Which crate replaces @wdio/local-runner (declared, no unit imports it)?

> Research it against primary sources into rust/research/@wdio-local-runner.md before porting what uses it

**D316** (dependency @wdio/mocha-framework): Which crate replaces @wdio/mocha-framework (declared, no unit imports it)?

> Research it against primary sources into rust/research/@wdio-mocha-framework.md before porting what uses it

**D317** (dependency @xmpp/client): Which crate replaces @xmpp/client (declared, no unit imports it)?

> Research it against primary sources into rust/research/@xmpp-client.md before porting what uses it

**D318** (dependency @xmpp/xml): Which crate replaces @xmpp/xml (declared, no unit imports it)?

> Research it against primary sources into rust/research/@xmpp-xml.md before porting what uses it

**D319** (dependency allure-commandline): Which crate replaces allure-commandline (declared, no unit imports it)?

> Research it against primary sources into rust/research/allure-commandline.md before porting what uses it

**D320** (dependency amplitude-js): Which crate replaces amplitude-js (declared, no unit imports it)?

> Research it against primary sources into rust/research/amplitude-js.md before porting what uses it

**D321** (dependency bc-css-flags): Which crate replaces bc-css-flags (declared, no unit imports it)?

> Research it against primary sources into rust/research/bc-css-flags.md before porting what uses it

**D322** (dependency junit-report-builder): Which crate replaces junit-report-builder (declared, no unit imports it)?

> Research it against primary sources into rust/research/junit-report-builder.md before porting what uses it

**D323** (dependency null-loader): Which crate replaces null-loader (declared, no unit imports it)?

> Research it against primary sources into rust/research/null-loader.md before porting what uses it

**D324** (dependency optional-require): Which crate replaces optional-require (declared, no unit imports it)?

> Research it against primary sources into rust/research/optional-require.md before porting what uses it

**D325** (dependency pretty): Which crate replaces pretty (declared, no unit imports it)?

> Research it against primary sources into rust/research/pretty.md before porting what uses it

**D326** (dependency promise.allsettled): Which crate replaces promise.allsettled (declared, no unit imports it)?

> Research it against primary sources into rust/research/promise.allsettled.md before porting what uses it

**D327** (dependency punycode): Which crate replaces punycode (declared, no unit imports it)?

> Research it against primary sources into rust/research/punycode.md before porting what uses it

**D328** (dependency react): Which crate replaces react (declared, no unit imports it)?

> Research it against primary sources into rust/research/react.md before porting what uses it

**D329** (dependency react-native-pager-view): Which crate replaces react-native-pager-view (declared, no unit imports it)?

> Research it against primary sources into rust/research/react-native-pager-view.md before porting what uses it

**D330** (dependency react-native-screen-corner-radius): Which crate replaces react-native-screen-corner-radius (declared, no unit imports it)?

> Research it against primary sources into rust/research/react-native-screen-corner-radius.md before porting what uses it

**D331** (dependency react-native-screens): Which crate replaces react-native-screens (declared, no unit imports it)?

> Research it against primary sources into rust/research/react-native-screens.md before porting what uses it

**D332** (dependency react-native-svg-transformer): Which crate replaces react-native-svg-transformer (declared, no unit imports it)?

> Research it against primary sources into rust/research/react-native-svg-transformer.md before porting what uses it

**D333** (dependency react-native-tab-view): Which crate replaces react-native-tab-view (declared, no unit imports it)?

> Research it against primary sources into rust/research/react-native-tab-view.md before porting what uses it

**D334** (dependency testcontainers): Which crate replaces testcontainers (declared, no unit imports it)?

> Research it against primary sources into rust/research/testcontainers.md before porting what uses it

**D335** (dependency util): Which crate replaces util (declared, no unit imports it)?

> Research it against primary sources into rust/research/util.md before porting what uses it

**D336** (dependency webdriverio): Which crate replaces webdriverio (declared, no unit imports it)?

> Research it against primary sources into rust/research/webdriverio.md before porting what uses it

**D337** (tangled units): modules/API/, modules/UI/, modules/UI/etherpad/, modules/UI/videolayout/, modules/transport/, react/features/analytics/, react/features/analytics/handlers/, react/features/app/, react/features/audio-translation/, react/features/authentication/, react/features/av-moderation/, react/features/base/app/, react/features/base/conference/, react/features/base/config/, react/features/base/connection/, react/features/base/devices/, react/features/base/environment/, react/features/base/flags/, react/features/base/jwt/, react/features/base/known-domains/, react/features/base/lastn/, react/features/base/lib-jitsi-meet/, react/features/base/logging/, react/features/base/low-bandwidth-mode/, react/features/base/media/, react/features/base/net-info/, react/features/base/participants/, react/features/base/premeeting/, react/features/base/redux/, react/features/base/responsive-ui/, react/features/base/settings/, react/features/base/sounds/, react/features/base/testing/, react/features/base/user-interaction/, react/features/breakout-rooms/, react/features/chat/, react/features/connection-indicator/, react/features/deep-linking/, react/features/desktop-picker/, react/features/device-selection/, react/features/display-name/, react/features/dropbox/, react/features/dynamic-branding/, react/features/e2ee/, react/features/etherpad/, react/features/external-api/, react/features/face-landmarks/, react/features/feedback/, react/features/file-sharing/, react/features/filmstrip/, react/features/follow-me/, react/features/gifs/, react/features/google-api/, react/features/invite/, react/features/jaas/, react/features/keyboard-shortcuts/, react/features/keyboard-shortcuts/components/, react/features/large-video/, react/features/lobby/, react/features/media-connectivity/, react/features/mobile/audio-mode/, react/features/mobile/background/, react/features/mobile/call-integration/, react/features/mobile/external-api/, react/features/mobile/permissions/, react/features/mobile/picture-in-picture/, react/features/mobile/proximity/, react/features/mobile/react-native-sdk/, react/features/mobile/wake-lock/, react/features/noise-detection/, react/features/noise-suppression/, react/features/overlay/, react/features/polls-history/, react/features/power-monitor/, react/features/prejoin/, react/features/reactions/, react/features/recent-list/, react/features/rejoin/, react/features/room-lock/, react/features/rtcstats/, react/features/screen-share/, react/features/settings/, react/features/share-room/, react/features/shared-video/, react/features/speaker-stats/, react/features/stream-effects/audio-mixer/, react/features/stream-effects/noise-suppression/, react/features/stream-effects/virtual-background/, react/features/stream-effects/virtual-background/backend/, react/features/stream-effects/virtual-background/compositor/, react/features/stream-effects/virtual-background/pipeline/, react/features/stream-effects/virtual-background/workers/, react/features/subtitles/, react/features/system-wide-user-notification/, react/features/talk-while-muted/, react/features/transcribing/, react/features/video-layout/, react/features/video-layout/components/, react/features/video-menu/, react/features/video-quality/, react/features/videosipgw/, react/features/virtual-background/, react/features/visitors/, react/features/voice-agents/, react/features/whiteboard/ import each other (72082 lines). Port them as one piece?

> Yes: one piece in wave 2, no glue between its parts

