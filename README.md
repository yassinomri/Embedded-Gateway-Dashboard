# Embedded Gateway Dashboard

A lightweight monitoring and control dashboard for embedded gateways and edge devices. This repository contains a modern TypeScript frontend (Vite + Tailwind) and a compact backend designed to run inside prplOS / OpenWrt-based gateway images (on real devices or in QEMU). The goal is to provide operators and integrators a simple, local UI to observe gateway health, inspect device telemetry, and interact with edge services without burdening constrained hardware.

## High-level intent and architecture

- Frontend: A thin, performant SPA (TypeScript + Vite) with Tailwind-styled components. The UI surfaces dashboards, device lists, logs, telemetry charts, and control actions.
- Backend: A small agent service intended to run on the gateway (prplOS / OpenWrt). It collects telemetry, normalizes events, exposes REST endpoints for the UI, and bridges local protocols (HTTPS).
- Target runtime: Embedded Linux (prplOS / OpenWrt). The backend is developed with embedded constraints and packaging expectations in mind so it can be shipped inside a firmware image.

## Core functionalities

- Device & gateway overview
  - Consolidated views of connected gateways and edge devices with status badges (online/offline, signal, uptime).
  - Per-device metadata: firmware version, last seen, identifiers, and basic diagnostics.

- Telemetry ingestion & visualization
  - Capture short-term time-series telemetry (temperature, CPU, memory, throughput, etc.).
  - Trend charts and lightweight visualizations to track metrics over time.

- Logs & event stream
  - Centralized collection of device and gateway logs with filtering and timestamps.
  - Live-stream view for realtime debugging and monitoring.

- Real-time updates
  - Near-real-time state and telemetry delivery via WebSocket (or long-polling).
  - Optional MQTT bridging to subscribe to device topics and reflect messages in the UI.

- Control & management
  - Pluggable control endpoints for common actions (restart device/service, trigger OTA, update configuration).
  - Exposed REST endpoints to enable automation and integration with orchestration tools.

- Local-first hosting mindset
  - Intended to run locally on the gateway so dashboard functionality remains available when cloud connectivity is lost.
  - Small footprint and dependency awareness to fit constrained embedded images.

## Data flow (conceptual)

1. Devices publish telemetry/events locally.
2. Backend reads those streams, normalizes messages, and stores short-term telemetry.
3. Frontend subscribes to backend APIs to render live updates and historical queries.

## Extensibility & integration points

- Backend adapters: Add protocol adapters (LoRa, Zigbee, Serial, proprietary protocols) as modular backend hooks.
- UI modules: Swap visualizations, add device detail panels, or plug in third-party charting components.
- Packaging: Backend is intended to be packageable for OpenWrt/prplOS (ipk or included in image) and run as a local system service.

## Security considerations

- Minimize exposed network surface on the gateway.
- Use TLS and authentication for remote access.
- Keep service privileges and dependencies minimal to reduce attack surface.

## Who benefits / Typical use cases

- Edge integrators who need an onsite UI to monitor gateways and devices.
- Device developers debugging connectivity and telemetry during field trials.
- Operations teams who want a local fallback dashboard when cloud services are unreachable.
- Labs using QEMU/emulation to reproduce gateway behavior for testing.

## What this repository contains (conceptual)

- Frontend source (TypeScript, Vite + Tailwind) implementing the dashboard UI.
- Static assets and SPA bootstrap (index.html) for the frontend.
- backend/ — compact server-side agent code intended for embedded packaging.
- Tooling and config files (Vite, Tailwind, TypeScript configs) indicating a modern stack and packaging intent.

## Design benefits for embedded deployments

- Local-first reduces reliance on external connectivity and keeps basic management available on-site.
- Packaging backend into the image enables startup as a system service and inclusion in firmware workflows.
- Modular design lets you add protocol adapters, change storage/forwarding behavior, or replace UI components without reworking the whole system.

---

If you want a concise functional spec mapping UI screens to backend endpoints (API contract + event channels) or a packaging blueprint (what files and init scripts to include in an OpenWrt package), reach me and say which one and which target architecture (e.g., x86_64, arm, arm64, ramips), and I’ll draft it next.

By: Yassin Omri
