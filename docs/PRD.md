# Product Requirements Document (PRD): Spiš Route Explorer

## 1. Overview
Spiš Route Explorer is an AI-driven geospatial discovery platform designed to find and qualify unique bikeable, hikeable, and walkable paths in the Spiš region of Slovakia. Unlike traditional apps that rely solely on user-submitted loops, this project centers on an **AI Agent with Realtime Voice**. The agent interprets users' spoken destinations or goals, visually locates non-standard tracks via satellite-first analysis, and grounds these visual findings with open data APIs.

## 2. Problem Statement
Most map-sharing apps (Strava, Komoot, AllTrails) are biased towards existing user-submitted routes, which often prioritize "loops" for exercise rather than efficient or culturally significant routes between destinations. There is a lack of automated segment qualification based on "exercise quality" and "intention."

## 3. Goals
- **Objective Grounding:** Use OpenStreetMap (OSM) and other vector data to verify paths visible in satellite imagery.
- **Intention-Based Routing:** Prioritize routes based on the goal (e.g., "Transit between villages" vs "Scenic MTB climb").
- **Quality Analysis:** Classify segments by surface, smoothness, and "exercise quality" indices.
- **Regional Focus:** Initially optimize for the Spiš region (Poprad, Levoča, Spišské Podhradie).
- **Multi-Day Tour Planning:** Generate 2-7+ day itineraries connecting village penzions (guesthouses) spaced a manageable "day's ride" apart.

## 4. Target Audience
- Trekking cyclists looking for non-commercialized routes.
- Regional tourism planners.
- Outdoor enthusiasts interested in "ground truthing" satellite discoveries.

## 5. Key Features
- **Realtime Voice AI Agent:** Users speak their destinations or fitness goals, and the AI interactively analyzes the map to plot a course and verbally describe the route.
- **Visual-First Pathfinding:** AI evaluates the region visually to find non-standard paths, prioritizing terrain and intent over commercially popular routes.
- **Multi-Day Itinerary Planner:** Dynamically plans 2-7+ day point-to-point tours, automatically segmenting routes by daily achievable distances and booking/locating accommodations (penzions) for overnight stays.
- **Primary Routing:** Reliable turn-by-turn biking directions using Google Maps API.
- **Discovery Mode:** Real-time extraction of raw trail data from the Overpass API (OSM) to expose hidden infrastructure and ground AI discoveries.
- **Segment Inspector:** Detailed metadata for specific paths (surface, smoothness, type).
- **High-Density UI:** A professional, information-rich interface optimized for analysis.

## 6. Future Roadmap
- Integration with Strava/Trailforks APIs for human-activity grounding.
- Automated exercise quality scoring (Elevation gain vs Surface resistance).
- Satellite imagery overlay for visual verification of unmapped paths.
