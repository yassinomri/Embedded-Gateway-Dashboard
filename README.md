# Embedded Gateway Dashboard

A frontend-first dashboard for monitoring and interacting with gateways and edge devices. This repository is primarily a modern TypeScript single-page application (Vite + Tailwind) that implements UI screens, components, and example data for a gateway/device dashboard. It includes screenshots and static assets to demonstrate the design and expected flows.

This repo focuses on the user interface and developer-facing pieces — it provides a working SPA and UI prototypes. The backend in this repository is a collection of CGI scripts and helpers intended to be deployed under /www on OpenWrt-based gateway systems (see the /backend directory content below).

## What the repository contains now

- Frontend: TypeScript-based SPA built with Vite and styled with Tailwind CSS (source under `src/`, SPA bootstrap at `index.html`).
- Static assets and screenshots (root) to show the UI and flows.
- A `backend/` directory containing CGI scripts and small shell helpers intended to run from the device web root (`/www`) on OpenWrt-based gateways — these are not a full packaged service but are deployable web endpoints for embedded firmware.
- Tooling and config files for building and linting (Vite, Tailwind, TypeScript, ESLint, etc.).
- Lockfiles for package managers (bun.lockb and package-lock.json).

## Backend (what's actually in /backend)

The backend directory contains CGI scripts and small shell helpers that are expected to live inside the gateway's web root (/www) on an OpenWrt-based system. These scripts implement device management pages, network utilities, and monitoring endpoints used by the frontend UI:

- connected-device.cgi — Manage device popup and details for connected devices
- credentials.cgi — Settings page for updating credentials (username/password)
- dashboard_data.cgi — Internet speed test enhancements and dashboard data
- dhcp_dns.cgi — DHCP & DNS configuration and IP range validation
- firewall.cgi — Firewall-related endpoints (legacy/compat behavior)
- network.cgi — Network page and gateway-status detection fixes
- network_monitor.sh — Wifi auth alerting backend helper
- packet-analyzer.cgi — Network analysis endpoints used by the UI
- performance.cgi — QoS management and SQM integration
- ping.cgi — Ping/check endpoints and network page helpers
- reboot.cgi — System page endpoint for reboot and system actions
- security_alerts.cgi — Wifi authentication alerts reporting
- speed_test.cgi — Internet speed test endpoint
- system_info.cgi — System information retrieval endpoint
- wifi_monitor.sh — Wifi log mechanism to capture failed auths
- wireless.cgi — Wireless configuration and status endpoints

These scripts are designed as lightweight web endpoints (CGI + small shell scripts) so they can be deployed directly into the gateway firmware image (for example into /www) and called from the frontend UI. They are not a full standalone backend service with database persistence; instead they bridge the SPA to on-device utilities and configuration.

## Current, implemented functionality (frontend-focused)
- Dashboard UI and layout for device/gateway overviews.
- Device list and detail panels (UI and mock/example data).
- Telemetry charts and lightweight visual mockups for time-series metrics.
- Logs/event stream UI with filtering and live/demo data.
- Control action UI elements (buttons/forms) demonstrating control flows wired to frontend handlers and the CGI endpoints in `/backend`.

Note: While the frontend is a complete SPA, backend behavior (persistence, authentication, packaging, or fully featured protocol adapters) is limited to the supplied CGI endpoints and helper scripts and may require adaptation for production firmware.

## Quick start (developer)
1. Install dependencies
   - npm: `npm install`
   - or if you prefer bun: `bun install`
2. Run dev server
   - npm: `npm run dev` (or the equivalent defined in package.json)
3. Build for production
   - npm: `npm run build`
4. Preview the built SPA
   - npm: `npm run preview`

(Exact script names are defined in package.json — please refer to it if a different package manager or script is preferred.)

## Deployment (to an OpenWrt-based gateway)
This section explains how to deploy both the backend CGI scripts and the built frontend SPA so the dashboard can be served directly from the gateway.

1) Build the frontend locally
- From the project root:
  - Install: `npm install` (or `bun install`)
  - Build: `npm run build`
- The Vite build output is typically `dist/`. Verify the build directory after running the build.

2) Choose a web-root path on the gateway
- Option A (root): copy UI to `/www/` so the dashboard is served at `https://<gateway>/`
- Option B (subpath): copy UI to `/www/embedded-dashboard/` and set the Vite base to `/embedded-dashboard/` before building
  - To set base, edit `vite.config.ts` or set `--base /embedded-dashboard/` when running the build

3) Copy files to the gateway
- Example using scp/rsync:
  - Copy built UI:
    - `scp -r dist/* root@<GW>:/www/embedded-dashboard/`
  - Copy backend scripts:
    - `scp backend/*.cgi root@<GW>:/www/`
    - `scp backend/*.sh root@<GW>:/www/`

4) Set permissions on the gateway
- SSH to gateway and run:
  - `chmod +x /www/*.cgi /www/*.sh`
  - `chown root:root /www/*.cgi /www/*.sh` (or suitable owner)
- Verify script shebangs (e.g. `#!/bin/sh`, `#!/bin/bash`, or `#!/usr/bin/env node`) and that required interpreters exist on the device.

5) Configure uHTTPd (or your web server)
- Ensure CGI execution is enabled and the document root includes your files.
- Example minimal uhttpd snippet (add to `/etc/config/uhttpd` or equivalent):

config uhttpd 'main'
    option home '/www'
    option rfc1918_filter '1'

config cgi
    option match '^/.*\.cgi$'
    option interpreter '/usr/bin/env bash'

- If you serve the SPA from a subpath (eg `/embedded-dashboard/`), ensure the document root contains that folder and asset paths match the SPA base.

6) SPA routing / fallback
- For history-mode client-side routing, configure the web server to serve `index.html` for unknown routes, or use hash-based routing to avoid server rewrites.

7) Paths & CORS
- If SPA and CGI live on the same host/port, CORS is not needed. If hosted separately, enable CORS or proxy requests.
- Confirm the frontend points to the correct CGI paths (relative vs absolute). Update the frontend config if you moved scripts to a different path.

8) Runtime dependencies & privileges
- Confirm utilities used by scripts (ip, tc, sqm, ping, etc.) are present on the gateway and that scripts have the privileges needed to run them.
- Actions like reboot or firewall modification require root privileges.

9) Post-deploy checks
- Visit the dashboard in a browser and open DevTools → Network to confirm assets load.
- Call a CGI endpoint directly (e.g. `https://<GW>/speed_test.cgi`) to verify output.
- Check logs (`/var/log/messages`, uhttpd logs) for script errors.

10) Packaging into firmware (optional)
- For reproducible deployments, include the frontend and backend files in an OpenWrt image or create an IPK package to install them.

## Deploy example commands (summary)
- Build & copy (example):
  - `npm install && npm run build`
  - `scp -r dist/* root@<GW>:/www/embedded-dashboard/`
  - `scp backend/*.cgi root@<GW>:/www/`
  - `ssh root@<GW> 'chmod +x /www/*.cgi /www/*.sh'`

## Extending this project
- Frontend: add components, connect real APIs, replace mock data with live endpoints.
- Backend: extend the CGI scripts, or replace them with a packaged system service if you want more persistence or robustness.
- Packaging: create an IPK package or image integration if you want the dashboard included in firmware builds.

## Contributing
Contributions are welcome. If you plan to extend the backend into a production agent, add protocol adapters, or create an OpenWrt package, please open an issue describing the intended scope so we can coordinate.

## Author
By: Yassin Omri

## License
No license file is included in this repository. Add a LICENSE file if you intend to relicense or publish under a specific open-source license.