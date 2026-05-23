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

## Building the backend daemons
The repository now contains two native backend daemons under `backend/daemons/`:

- `performance` — collects latency / packet loss / throughput and writes cached JSON consumed by `performance.cgi`
- `packet-analyzerd` — captures packet data and writes cached JSON consumed by `packet-analyzer.cgi`

These binaries are target-specific. The produced executable matches the compiler/toolchain you use:

- build with your host compiler on x86_64 Linux: you get an x86_64 binary
- build with an ARM toolchain: you get an ARM binary for Raspberry Pi / other ARM targets
- build with an OpenWrt/prplOS SDK toolchain: you get a binary suitable for that firmware target

The `backend/Makefile` is intentionally configurable:

- `CC` — compiler to use
- `CROSS_COMPILE` — optional toolchain prefix, e.g. `aarch64-openwrt-linux-musl-`
- `STATIC=1` — add `-static` at link time
- `CPPFLAGS`, `CFLAGS`, `LDFLAGS`, `LDLIBS` — standard build overrides

Examples:

1. Build natively on the current machine:
   - `cd backend`
   - `make build/bin/performance`
   - `make build/bin/packet_analyzerd`

2. Build a static x86_64 binary with musl (useful for the QEMU/prplOS VM flow used during development):
   - `cd backend`
   - `make build/bin/performance CC=musl-gcc STATIC=1`
   - `make build/bin/packet_analyzerd CC=musl-gcc STATIC=1`

3. Build with a cross-toolchain prefix from an OpenWrt/prplOS SDK:
   - `cd backend`
   - `make build/bin/performance CROSS_COMPILE=<toolchain-prefix> STATIC=1`
   - `make build/bin/packet_analyzerd CROSS_COMPILE=<toolchain-prefix> STATIC=1`

4. Build with an explicit compiler path/wrapper instead of a prefix:
   - `cd backend`
   - `make build/bin/performance CC=/path/to/your/target-gcc STATIC=1`
   - `make build/bin/packet_analyzerd CC=/path/to/your/target-gcc STATIC=1`

Notes:

- For a Raspberry Pi 3/4 or any real gateway target, use the exact compiler/toolchain that matches the target userspace and libc. Do not assume a binary built for the x86_64 QEMU VM will run on ARM hardware.
- For OpenWrt/prplOS-style targets, the safest route is to build with the matching SDK/buildroot toolchain for that image.
- If you are unsure which toolchain prefix to use, inspect your SDK/buildroot environment and reuse the compiler wrapper it provides.

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
  - Copy backend daemons (if you are using the daemon-based monitoring flow):
    - `scp backend/build/bin/performance root@<GW>:/usr/sbin/gateway-perfd`
    - `scp backend/build/bin/packet_analyzerd root@<GW>:/usr/sbin/packet-analyzerd`
    - `scp backend/init.d/performance root@<GW>:/etc/init.d/performance`
    - `scp backend/init.d/packet-analyzerd root@<GW>:/etc/init.d/packet-analyzerd`

4) Set permissions on the gateway
- SSH to gateway and run:
  - `chmod +x /www/*.cgi /www/*.sh`
  - `chmod +x /usr/sbin/gateway-perfd /usr/sbin/packet-analyzerd`
  - `chmod +x /etc/init.d/performance /etc/init.d/packet-analyzerd`
  - `chown root:root /www/*.cgi /www/*.sh` (or suitable owner)
- Verify script shebangs (e.g. `#!/bin/sh`, `#!/bin/bash`, or `#!/usr/bin/env node`) and that required interpreters exist on the device.

5) Enable and start the daemon services
- SSH to gateway and run:
  - `/etc/init.d/performance enable`
  - `/etc/init.d/performance restart`
  - `/etc/init.d/packet-analyzerd enable`
  - `/etc/init.d/packet-analyzerd restart`

6) Configure uHTTPd (or your web server)
- Ensure CGI execution is enabled and the document root includes your files.
- Example minimal uhttpd snippet (add to `/etc/config/uhttpd` or equivalent):

config uhttpd 'main'
    option home '/www'
    option rfc1918_filter '1'
    option cgi_prefix '/api'

config cgi
    option match '^/.*\.cgi$'
    option interpreter '/usr/bin/env bash'

- If you install the C CGI binary at `/www/api/v1/system/info`, the `cgi_prefix /api` line ensures `/api/v1/system/info` is executed directly (no `.cgi` suffix required).

- If you serve the SPA from a subpath (eg `/embedded-dashboard/`), ensure the document root contains that folder and asset paths match the SPA base.

7) SPA routing / fallback
- For history-mode client-side routing, configure the web server to serve `index.html` for unknown routes, or use hash-based routing to avoid server rewrites.

8) Paths & CORS
- If SPA and CGI live on the same host/port, CORS is not needed. If hosted separately, enable CORS or proxy requests.
- Confirm the frontend points to the correct CGI paths (relative vs absolute). Update the frontend config if you moved scripts to a different path.

9) Runtime dependencies & privileges
- Confirm utilities used by scripts (ip, tc, sqm, ping, etc.) are present on the gateway and that scripts have the privileges needed to run them.
- Actions like reboot or firewall modification require root privileges.
- `packet-analyzerd` requires `tcpdump` on the target.

10) Post-deploy checks
- Visit the dashboard in a browser and open DevTools → Network to confirm assets load.
- Call a CGI endpoint directly (e.g. `https://<GW>/speed_test.cgi`) to verify output.
- Confirm daemon output files are being refreshed:
  - `/tmp/performance.json`
  - `/tmp/packet_analyzer.json`
- Check logs (`/var/log/messages`, uhttpd logs) for script errors.

11) Packaging into firmware (optional)
- For reproducible deployments, include the frontend and backend files in an OpenWrt image or create an IPK package to install them.

## Deploy example commands (summary)
- Build & copy (example):
  - `npm install && npm run build`
  - `scp -r dist/* root@<GW>:/www/embedded-dashboard/`
  - `scp backend/*.cgi root@<GW>:/www/`
  - `scp backend/build/bin/performance root@<GW>:/usr/sbin/gateway-perfd`
  - `scp backend/build/bin/packet_analyzerd root@<GW>:/usr/sbin/packet-analyzerd`
  - `ssh root@<GW> 'chmod +x /www/*.cgi /www/*.sh'`

## Contributing
Contributions are welcome. If you plan to extend the backend into a production agent, add protocol adapters, or create an OpenWrt package, please open an issue describing the intended scope so we can coordinate.

## Author
By: Yassin Omri

## License
No license file is included in this repository.
