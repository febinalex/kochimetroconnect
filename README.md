# 🚌 Kochi Metro Connect Feeder Bus Finder

<p align="center">
<picture>
<source media="(prefers-color-scheme:light)" srcset="https://raw.githubusercontent.com/febinalex/kochimetroconnect/main/assets/KMCFBF_dark.svg">
  <img src="https://raw.githubusercontent.com/febinalex/kochimetroconnect/main/assets/KMCFBF_light.svg" alt="Kochi Metro Connect Feeder Bus Finder" width="500">
  </picture>
</p>
<p align="center">
  <strong>Fast feeder bus timings, nearby stops, and route helpers for Kochi Metro Connect.</strong>
</p>

<p align="center">
  <a href="https://febinalex.github.io/kochimetroconnect/"><img src="https://img.shields.io/badge/Live%20Site-KMCFBF-0ea5e9?style=for-the-badge" alt="Live Site"></a>
  <a href="https://github.com/febinalex/kochimetroconnect/releases"><img src="https://img.shields.io/github/v/release/febinalex/kochimetroconnect?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://github.com/febinalex/kochimetroconnect"><img src="https://img.shields.io/github/stars/febinalex/kochimetroconnect?style=for-the-badge" alt="GitHub stars"></a>
  <a href="https://github.com/febinalex/kochimetroconnect/commits/main"><img src="https://img.shields.io/github/last-commit/febinalex/kochimetroconnect?style=for-the-badge" alt="Last commit"></a>
  <a href="https://github.com/febinalex/kochimetroconnect/blob/main/.github/workflows/deploy.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/febinalex/kochimetroconnect/deploy.yml?branch=main&style=for-the-badge" alt="CI status"></a>
</p>

## Overview

Kochi Metro Connect Feeder Bus Finder is a lightweight web utility built to make feeder bus lookup faster and easier for daily commuters. It focuses on the practical things people need most:

- the next departures from a selected stop
- the nearest supported stop from current location
- trip planning using a chosen time instead of only the current time
- optional route viewing when maps are needed

The interface is designed to stay fast on mobile devices by keeping heavier map functionality optional instead of forcing it on first load.

## Live utility

**Website:** https://febinalex.github.io/kochimetroconnect/

## What the utility does

- Search supported Metro Connect stops from a single searchable input
- Detect the nearest supported stop using current location
- Show upcoming departures for the selected stop
- Support trip planning from a selected date and time
- Display route maps only when the user enables maps
- Support multiple map providers, including Google Maps, OpenStreetMap, Apple Maps, and Mapillary
- Highlight selected routes and animate route movement where supported
- Persist user preferences locally on the device for a smoother repeat experience

## How this is built

This project is intentionally kept as a static web application so it remains easy to deploy, simple to maintain, and fast to open from mobile browsers.

### Core stack

- **React 19** for the user interface
- **TypeScript** for typed application logic
- **Vite** for development and production builds
- **MapLibre GL** for embedded OpenStreetMap-based rendering
- **Google Maps JavaScript API** for optional Google map rendering
- **GitHub Pages** for hosting
- **Google Analytics 4** for usage insights

## Data source and timetable notes

The timing data used in this utility is assembled from official Kochi Metro timetable references and official public update channels, including official social media announcements where route changes are communicated.

Primary reference:

- [Kochimetro.org Time table](https://kochimetro.org/feeder-service-time-table/)

For some Infopark-linked routes, official listings can be incomplete, outdated, or inconsistent. In those situations, the route and timing data included here has been cross-checked and corrected using the latest publicly available official information available at the time of update.

This is an independent informational utility and is **not** an official Kochi Metro website.

## Mapping and route behavior

The site supports both quick timetable lookup and optional route viewing.

- **Google Maps** and **OpenStreetMap** are available as embedded map experiences
- **Apple Maps** and **Mapillary** are exposed as external map options where embedding is not appropriate for the current setup
- Walking and route rendering can vary slightly by provider depending on browser support and available map services

## Analytics and privacy

This project uses **Google Analytics 4** to understand how the utility is being used and to improve the experience over time.

Only **non-personal usage information** is collected for further improvement of this utility, such as:

- selected stop interactions
- nearest stop detection events
- map enablement and provider preference usage
- selected route interactions

## Project approach

This project prioritizes:

- quick access to feeder bus timings
- minimal waiting before the timetable becomes usable
- optional map loading instead of forcing maps on first load
- mobile-friendly interaction for day-to-day commuter use
- simple static deployment without a heavy backend requirement

## Release highlights

- **v1.0.4** — Current release with the latest improvements and expanded functionality
- **v1.0.3** — Added more trip entries
- **v1.0.2** — Introduced map views
- **v1.0.1** — Refined the interface and expanded trip coverage
- **v1.0.0** — Initial release focused on feeder buses from and to Infopark

For complete change history, see [GitHub Releases](https://github.com/febinalex/kochimetroconnect/releases).

Created with love ❤️ with vibe 🤟
