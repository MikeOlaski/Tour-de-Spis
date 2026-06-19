# API Research & Grounding Strategy

## 1. Competitive API Analysis

### Strava API
- **Strength:** Real-world activity density (Heatmaps).
- **Opportunity:** Use the "Routes" and "Segments" APIs to determine which OSM-discovered paths are actually used and at what frequency.
- **Limitation:** Rate limits and requirement for user OAuth.

### Trailforks API
- **Strength:** Mountain bike specific quality data, difficulty ratings, and user-contributed trail status.
- **Opportunity:** Grounding "MTB Intent" for paths in the Slovak Paradise (Slovenský raj) area.
- **Limitation:** Strict commercial terms for API access.

### OpenStreetMap (OSM) / Overpass
- **Strength:** Completely open, rich in infrastructure metadata (surface, grade, width).
- **Opportunity:** The primary source for "Infrastructure Grounding." Unlike user-submitted routes, OSM maps actual physical reality.

### Waze (Partner Hub)
- **Strength:** Real-time user-contributed road conditions.
- **Opportunity:** While mostly focused on vehicles, user reports of "road closed" or "unpaved" often impact cycling accessibility.

## 2. Grounding Methodology

### Problem: "The Ghost Path"
Satellite imagery might show a line that looks like a path, but it could be a dry creek bed or private livestock track.

### Solution: Multi-Layer Verification (AI-Driven)
1. **Visual-First AI Scan (Primary):** The AI Agent evaluates satellite imagery of a given region to locate linear features, specifically seeking out visually prominent but non-standard trails that match the user's verbally stated intent.
2. **OSM Grounding (Secondary):** The AI cross-references visual findings with Overpass queries. If a `way` exists, the path is "Infrastructure Verified" (grounded).
3. **Activity Grounding (Tertiary):** Query Strava/Waze APIs where available. If activity exists, the path is "Usage Verified."
4. **Exercise Quality & Audio Narration:** Calculate Slope (from Mapbox/Google Elevation) + Surface Resistance (from OSM) = Effort Index. The AI interprets these metrics and synthesizes a voice description of the route's difficulty and characteristics for the user.

## 3. Findings: Spiš Region
The Spiš region has high "Discovery Potential" due to the density of old forestry tracks between villages that are often mapped in OSM but not utilized by commercial routing algorithms (which prefer the main road via Kežmarok/Poprad).

## 4. Multi-Day Lodging Integration
### "Penzion-to-Penzion" Planning
- **The Constraint:** To facilitate 2-7+ day bike tours, the route generation must be bounded by the availability of overnight accommodations (penzions) spaced safely apart.
- **The Variable:** A "day's ride" boundary is dynamic, driven by the AI's assessment of user fitness, terrain types, and calculated Effort Index. For example, 40km of paved rolling hills vs. 25km of technical MTB climbing.
- **AI Task:** The AI Agent will query regional housing options (via APIs), intersect them with high-quality discovered trails, and generate a contiguous string of day-segments that purposefully land the rider at a bed-and-breakfast each afternoon.
