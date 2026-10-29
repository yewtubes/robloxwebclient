# API route coverage

Every web API the original WebClient (0.745.0.7451145) and the Studio game
server (0.745.0.7451137) call, how the request reaches this platform, and what
answers it. Built from real traffic: the backend appends every request to
`data/logs/requests.jsonl` (method, host, path, query, status, user, and the
body for unrouted or failed calls). Regenerate the observed list with:

```bash
node tools/routes_seen.js            # summary of data/logs/requests.jsonl
```

Status legend:

- **implemented**: answered from the platform database / store with the contract the client expects, verified against client traffic
- **partial**: answered correctly for what this platform has, but a feature behind it doesn't exist yet (noted)
- **missing**: the client calls it and gets a 404; the client tolerates that (noted what degrades)
- **external**: needs a service this platform cannot provide itself (authorized external service or signing keys)

Auth column: **session** = needs the signed-in local account (browser cookie
`RBXLocalSession`, Studio's `.ROBLOSECURITY` holding a local studio token, or an
OAuth bearer token from our `/oauth/v1/token`); **none** = public; **loopback/admin**
= `X-Admin-Key` when `ADMIN_KEY` is set, else loopback callers only.

## How requests reach the backend

| Caller | Mechanism | Where |
|---|---|---|
| Web client page (WasmPlayer.js, loading screen) | `window.__wasmDevSettings.apiProxy/cdnProxy`, the developer hook WasmPlayer.js reads on any host that isn't `*.roblox.com`: URLs become `/proxy/https://<host>/<path>` | `webclient/site-shim.js`, `tools/server.js` |
| Engine (worker threads, `fetch`/XHR in WebClient.js) | the same shim, prepended to the served WebClient.js, rewrites `*.roblox.com`, `*.rbxcdn.com`, `*.robloxlabs.com` to `/proxy/` (same origin, so the session cookie is sent) | `tools/backend/routes/platform.js` (`webClientFile`) |
| Studio (game server and editor) | started with `-baseUrl https://www.sitetest1.robloxlabs.com`; those host names resolve to 127.0.0.1 (`/etc/hosts`, `tools/studio/setup_env.sh`) and `tools/studio_backend.js` answers HTTPS with a certificate from our own CA, which only Studio's `ssl/cacert.pem` trusts | `tools/studio_backend.js` |
| Game traffic | RakNet/UDP and RbxTransport (WebTransport over HTTP/3) straight to the Studio server, from the join script `gamejoin` returns | `tools/backend/routes/games.js` |

Not done with DNS for the browser: `*.roblox.com` over HTTPS can't be redirected
without a certificate the browser trusts for those names, and this project does
not install one. The original client already supports a proxy for non-Roblox
hosts, so nothing in WasmPlayer.js, WebClient.js or WebClient.wasm is changed.
The served WebClient.js has the shim prepended (the original bytes follow
unchanged); see "Limitations".

## Accounts and sessions

| Host | Method, path | Request | Response | Auth | Status |
|---|---|---|---|---|---|
| local | `POST /api/local/auth/signup` | `{username, password, displayName?, birthdate}` | `{id, name, displayName, hasVerifiedBadge}` + `Set-Cookie: RBXLocalSession` · 400 validation | none | implemented |
| local | `POST /api/local/auth/login` | `{username, password}` | same · 403 wrong password/banned | none | implemented |
| local | `POST /api/local/auth/logout`, `GET /api/local/auth/me` | | | session | implemented |
| users | `GET /v1/users/authenticated` | | `{id, name, displayName}` · 401 | session | implemented |
| users | `GET /v1/users/authenticated/app-launch-info` | | `{id, name, displayName, ageBracket, countryCode, isPremium}` | session | implemented |
| users | `GET /v1/users/authenticated/{age-bracket,country-code,roles}` | | `{ageBracket}` / `{countryCode}` / `{roles: []}` | session | implemented |
| users | `GET /v1/users/{id}` | | `{description, created, isBanned, externalAppDisplayName, hasVerifiedBadge, id, name, displayName}` · 404 | none | implemented |
| users | `POST /v1/users` | `{userIds, excludeBannedUsers}` | `{data: [{hasVerifiedBadge, id, name, displayName}]}` | none | implemented |
| users | `POST /v1/usernames/users` | `{usernames, excludeBannedUsers}` | `{data: [{requestedUsername, …}]}` | none | implemented |
| users | `GET /v1/users/search?keyword&limit` | | paged `{data: […]}` · 400 short keyword | none | implemented |
| users | `GET /v1/users/{id}/username-history` | | `{data: []}` (no renames on this platform) | none | implemented |
| apis | `POST /user-profile-api/v1/user/profiles/get-profiles` | `{userIds, fields}` | `{profileDetails: [{userId, names: {combinedName, displayName, username, …}, isVerified}]}` | none | implemented |
| accountinformation | `GET /v1/birthdate`, `GET /v1/description` | | from the account | session | implemented |
| accountsettings | `GET /v1/email` | | `{emailAddress: null, verified: false}` (accounts have no e-mail) | session | partial |
| usermoderation | `GET /v1/not-approved` | | `{}` or the ban record of a banned account | session | implemented |
| auth | `POST /v2/logout` | | `{}`, ends the calling session | session | implemented |
| apis | `POST /validate-machine` | | `{success, isValid, messages}` | none | implemented |

### OAuth (Studio sign-in)

| Host | Method, path | Notes | Status |
|---|---|---|---|
| apis | `GET /oauth/.well-known/openid-configuration` | discovery document pointing at the caller's host | implemented |
| apis | `GET/POST /oauth/v1/authorize` | approves for the browser's signed-in account; else `STUDIO_OAUTH_USER`; else a login form; stores the code with its PKCE challenge, 302 to `redirect_uri?code&state` | implemented |
| apis | `POST /oauth/v1/token` | `authorization_code` (PKCE S256 checked) and `refresh_token`; returns access/refresh/id tokens and sets Studio's `.ROBLOSECURITY` to a local studio session | implemented |
| apis | `POST /oauth/v1/token/{introspect,revoke,resources}`, `GET /oauth/v1/userinfo`, `GET /oauth/v1/certs` | id_tokens are unsigned (`alg: none`), so `certs` has no keys | implemented |

## Experiences, places and servers

| Host | Method, path | Request | Response | Auth | Status |
|---|---|---|---|---|---|
| economy | `GET /v2/assets/{placeId}/details` | | product info (`Name`, `Description`, `Creator{Id,Name,CreatorType,HasVerifiedBadge}`, `AssetTypeId: 9`, …) from the place and universe; loading-screen title and `MarketplaceService:GetProductInfo` | none | implemented |
| economy | `GET /v2/assets/{assetId}/details` | | product info from the asset row | none | implemented |
| apis | `GET /universes/v1/places/{placeId}/universe` | | `{universeId}` | none | implemented |
| apis | `GET /universes/v1/universes/{id}/is-private-playtester` | | `{isPrivatePlaytester}` (the creator) | session | implemented |
| games | `GET /v1/games?universeIds` | | `{data: [{id, rootPlaceId, name, description, creator, playing, visits, maxPlayers, created, updated, universeAvatarType, genre, favoritedCount, …}]}`; `playing` counts live sessions | none | implemented |
| games | `GET /v1/games/multiget-place-details?placeIds` | | `[{placeId, name, description, url, builder, builderId, isPlayable, universeId, universeRootPlaceId, …}]` | none | implemented |
| games | `GET /v1/games/{universeId}/servers/Public` | | `{data: [{id, maxPlayers, playing, playerTokens, fps, ping}]}` from `game_servers` | none | implemented |
| games | `GET /v1/games/votes`, `/v1/games/{id}/favorites[/count]` | | zero votes; favourites count from the universe | none | partial (no voting/favouriting yet) |
| develop | `GET /v1/universes/{id}`, `/v1/universes/multiget?ids`, `/v1/universes/{id}/places` | | universe configuration | none | implemented |
| gamejoin | `POST /v1/join-game` | `{placeId, isTeleport, gameJoinAttemptId, …}` | `status 2` + join script (`MachineAddress`, `ServerPort`, `NetStackPort`, `NetStackTokenValue`, `GameFqdn`, `NetStackConfig{certHashes}`, `UserId`, `UserName`, `DisplayName`, `SessionId`, `UniverseId`, `CharacterAppearance`, …) for the user's own account; `status 0` + message while no server runs (the client retries); `6` full; `12` unknown/private place | session | implemented |
| gamejoin | `POST /v1/join-game-instance` | `{placeId, gameId}` | the same for a given server | session | implemented |
| gamejoin | `POST /v1/play-with-user` | `{userIdToFollow}` | join the followed user's server | session | implemented |
| local | `POST /api/local/servers`, `POST /api/local/servers/{jobId}/heartbeat`, `DELETE /api/local/servers/{jobId}`, `GET /api/local/servers` | `{placeId, host, port, transportPort, certHash?, maxPlayers?}` | the server row; game servers register here (`tools/studio/run_server.sh` does it through `tools/admin.js`) | loopback/admin | implemented |
| presence | `POST /v1/presence/users` | `{userIds}` | `{userPresences: [{userPresenceType, lastLocation, placeId, rootPlaceId, gameId, universeId, userId, lastOnline}]}` from sessions and activity | none | implemented |
| presence | `POST /v1/presence/register-app-presence`, `/v1/presence/last-online` | | | session / none | implemented |
| gameinternationalization | `GET /v1/user-localization-settings/player-choice/{universeId}` | | `{userUniverseLocalizationSettingValue: {settingType, settingTargetId}}` stored per user | session | implemented |
| gameinternationalization | `POST /v1/user-localization-settings/universe/{id}` | `{settingType, settingTargetId}` | `{}` | session | implemented |
| gameinternationalization | `GET /v1/supported-languages/games/{id}[/in-experience-language-selection]`, `/v1/source-language/games/{id}` | | English only (experiences have no translations yet) | none | partial |

## Assets

| Host | Method, path | Request | Response | Auth | Status |
|---|---|---|---|---|---|
| assetdelivery | `GET /v1/asset/?id={id}[&version=]` and `?hash={md5}` | `contentRepresentationPriorityList`, `doNotFallbackToBaselineRepresentation` | asset bytes, `Content-Type` sniffed (png/jpeg/ktx2/ogg/mp3/rbxm/mesh…), `ETag`/`304`, `Roblox-AssetTypeId`, `Roblox-AssetVersion`; 404 `Request asset was not found`; 404 when only a non-baseline representation is accepted | none | implemented |
| assetdelivery | `POST /v1/assets/batch`, `/v2/assets/batch` | `[{requestId, assetId | hash, version?, contentRepresentationPriorityList?, doNotFallbackToBaselineRepresentation?}]` | `[{requestId, location, assetTypeId, isArchived, contentRepresentationSpecifier}]` or `{errors}` per item | none | implemented |
| assetdelivery | `GET /v1/assetId/{id}[/version/{n}]`, `/v2/assetId/{id}[/version/{n}]` | | `{location, …}` / `{locations: [{assetFormat, location}], assetTypeId, …}` | none | implemented |
| c0-c7.rbxcdn.com | `GET /{md5}` | | hash-addressed content from the store | none | implemented |

Store and fallback (`tools/backend/assets.js`): content-addressed blobs in
`data/content/`, `assets` + `asset_versions` rows. Missing ids go to the
fallback chosen by `ASSET_FALLBACK`: `public` (Roblox's anonymous asset delivery,
only assets Roblox serves without sign-in; default), `opencloud`
(`ROBLOX_OPEN_CLOUD_API_KEY`, an API key you created), `mirror`
(`ASSET_MIRROR_URL` with `{id}`, a mirror you are permitted to use) or `none`.
Fetched bytes are stored unchanged with `source='fallback:<mode>'`. Every miss
and every fallback result is recorded in `asset_misses` and
`data/logs/asset-fallback.log`; `node tools/admin.js asset misses` lists them.

Assets seen that the platform can't serve yet (`asset misses`):

| Asset | Requested by | Why |
|---|---|---|
| hash `01fbb35a1b3f53173f68a2d02bb735d2` (Image, `Residual` representation) | the engine itself (the hash is compiled into WebClient.wasm) | Roblox's CDN refuses it anonymously (403); needs an authorized source |
| 9475422736, 3570695787, 2790382281, 2790390993, 123480233606534 | the earlier uploaded Baseplate place's GUIs/meshes | `401 Authentication required to access Asset`; import the files (`tools/admin.js asset import`) or use `opencloud` with a key that may read them |

## Avatars and thumbnails

| Host | Method, path | Response | Auth | Status |
|---|---|---|---|---|
| avatar | `GET /v1/avatar-fetch?userId&placeId` | `{resolvedAvatarType, bodyColors, bodyColor3s, scales, assetAndAssetTypeIds, animationAssetIds, emotes, …}` from `avatars` | none | implemented |
| avatar, api, www | `GET /v1.1/avatar-fetch/?userId&placeId`, `GET /v2/avatar/avatar-fetch/?userId&placeId` | the same document: `Player.CharacterAppearance` (RCC render scripts) and `Players:GetHumanoidDescriptionFromUserId` | none | implemented |
| avatar | `GET /v1/users/{id}/avatar`, `/v2/avatar/users/{id}/avatar`, `/v1/users/{id}/currently-wearing`, `/v1/avatar`, `/v2/avatar/avatar`, `/v1/avatar-rules` | | none / session | implemented |
| avatar | `POST /v1/avatar/set-body-colors`, `set-player-avatar-type`, `set-scales`, `/v1|v2/avatar/set-wearing-assets` | saved to `avatars`. Wearing: assets missing from the store are fetched through `ASSET_FALLBACK` (logged) and accepted only if they are a wearable type (clothing, faces, heads, body parts, accessories, animations, emotes, layered clothing) | session | implemented |
| thumbnails | `POST /v1/batch`, `GET /v1/games/icons`, `/v1/games/multiget/thumbnails`, `/v1/places/gameicons`, `/v1/users/avatar-headshot|avatar-bust|avatar`, `/v1/assets` | `{data: [{targetId, state, imageUrl, version}]}`; images that exist come back `Completed`; renders are queued and return `Pending` until the Studio render worker (`tools/render/worker.js`) completes them | none | partial: the worker is preliminary (see docs/KNOWN_ISSUES.md) |
| local | `POST /api/local/render/claim`, `POST /api/local/render/jobs/{key}/result`, `GET /api/local/render/jobs` | render-job queue for the Studio render worker (avatars, places, non-image assets), as RCC renders for Roblox | loopback/admin | implemented (queue) |

## Configuration, policy and platform services

| Host | Method, path | Response | Status |
|---|---|---|---|
| clientsettings(cdn) | `GET /v2/settings/application/{app}` | `WebClientApp`: `webclient/LocalFlags.json`; other apps (Studio's `PCStudioApp`): `webclient/flags/<app>.json` + `<app>.local.json` | implemented |
| clientsettings(cdn) | `GET /v2/client-version/WebClientApp` | the build in `webclient/live/` | implemented |
| clientsettings(cdn) | `GET /v2/client-version/WindowsStudio64` | the installed Studio build (`$STUDIO_DIR/version.json`) | implemented |
| clientsettings | `GET /v2/user-channel` | `{}` (production channel) | implemented |
| setup.rbxcdn.com | `GET /webclient/{version}-RobloxWebClient/*` | the original client files from `webclient/live/` | implemented |
| locale | `GET /v1/locales/user-localization-locus-supported-locales` | the account's locale | implemented |
| apis | `GET /player-policy-service/v1/player-policy-client`, `GET|POST /player-policy-service/v1/player-policy-rcc` | PolicyService data from the account's age (`isSubjectToChinaPolicies`, `arePaidRandomItemsRestricted`, `isPaidItemTradingAllowed`, `allowedExternalLinkReferences`, `areAdsAllowed`, `isContentSharingAllowed`, …) | implemented |
| apis | `POST /product-experimentation-platform/v1/projects/{id}/values` | `{layers: {<requested>: {parameters: {}, experimentName: null, …}}}`: this platform runs no experiments | implemented |
| apis | `GET /guac*`, `/universal-app-configuration*`, `/app-policy*`, `/maintenance-status` | `{}` (defaults), `{isAlertVisible: false}` | implemented |
| voice | `GET /v1/settings` | voice disabled and opted out (no voice service) | partial |
| friends | `GET /v1/users/{id}/friends[/online|/count|/statuses]`, `GET /v1/my/friends/requests`, `GET /v1/user/friend-requests/count`, `POST /v1/users/{id}/request-friendship|accept-friend-request|unfriend|decline-friend-request` | from `friendships` (mutual rows are friends, one row is a request) | implemented |
| groups | `GET /v1|v2/users/{id}/groups/roles`, `/v2/groups/{id}/users`, `/v1/groups/{id}`, `/v2/groups` | empty / 400 not found: the platform has no groups yet | partial |
| apis | `POST /user-blocking-api/v1/users/rcc/get-user-blocking-data` `{userId}` | `{blockedUsersListIsComplete, blockedByUsersListIsComplete, reciprocalUserData: [{userId, isBlocked, isBlockingViewer}]}` from `user_blocks`. The game server's text chat drops a player's messages while this is missing | implemented |
| apis | `POST /user-blocking-api/v1/users/rcc/batch-check-reciprocal-block` `{userId, otherUserIds}` | `{otherUsers: [{userId, isBlocked, isBlockingViewer}]}` | implemented |
| apis | `GET /universe-chat-api/v1/universe-chat-settings` | `{globalChatEnabled: false, presetChatStatus: "Enabled"}`: no universe-wide chat (universe-chat-messaging-api isn't run here) | implemented |
| users, accountinformation | `GET|POST /v1/description` | the account's `description` | implemented |
| ephemeralcounters.api, ecsv2, lms, metrics, tracing, client-telemetry, `*/experience-signals-ingest/*`, `*/pbe`, `*.rbxinfra.com` | telemetry, counters and crash reports: accepted (`200 {}`), recorded in the request log, not forwarded | implemented (sink) |

## Called but not implemented

| Host | Method, path | Caller | What degrades |
|---|---|---|---|
| apis | `GET /player-hydration-service/v1/players/signed` | engine, on join | Player attributes for creator experimentation must be signed with the key in the flag `PlayerHydrationServicePublicKey`. **external** until this platform has its own signing key and sets that flag; the engine logs "hydrating player failed" and continues |
| realtime-signalr | `GET /userhub/` (WebSocket) | Studio editor | real-time notifications in Studio; it reconnects every 30 s and logs 404 |
| apis | `/access-management/v1/rcc-user-feature-access`, `/v2/rcc-user-feature-evaluation`, `/v1/feature-access` | game server, Studio | age-check / feature gates; contracts not confirmed. The game server treats a failure as "not verified" |
| apis | `/user-profile-api/v1/user/profiles/rcc/settings` | game server | profile settings in experience; contract not confirmed |
| apis, develop, assetgame | Studio editor: `studio-user-data-api/*`, `studio-user-settings/plugin-permissions`, `creator-notifications`, `doc-site`, `studio-assistant`, `creator-home-api/groups`, `universes/v1/search`, `develop /v1/gametemplates`, `assetgame /my/settings/json` | Studio editor panels | start page, templates, assistant, notifications |
| apis | `GET /modals-api/v1/prompts`, `/marketplace-widgets/v1/widgets/shop-widgets`, `POST /checkout/v1/offers` | in-game CoreScripts | commerce UI; there is no economy here. Response contracts not yet confirmed, so they stay 404 rather than guessed |

## Limitations

- **WebClient.js delivery.** The engine's workers make their own HTTP calls, so
  the shim has to run inside them. It is prepended to WebClient.js when served;
  the original file stays byte-for-byte unchanged on disk. `ROUTING=sw` is
  reserved for serving it unmodified behind a service worker (not finished).
- **Default R15 head.** The default dynamic head (`content/avatar/characterR15DynamicHeadV2.rbxm`)
  uses mesh asset 123480233606534, which Roblox only serves to authenticated
  requests (anonymous asset delivery: 401). With `ASSET_FALLBACK=public` R15
  characters have no head, in game and in renders. Use `ASSET_FALLBACK=opencloud`
  with your own Open Cloud key, or import the asset into the store
  (`tools/admin.js asset import`). Avatars set to R6 don't need it.
- **Script bytecode.** Game scripts fail with `bytecode corrupted`: the 2026
  client requires Roblox's integrity footer on bytecode (see
  `docs/STUDIO_SERVER_JOIN.md`). API redirection does not affect this.
