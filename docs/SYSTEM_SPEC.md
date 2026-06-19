# System Specification: Spiš Route Explorer

## 1. Tech Stack
- **Frontend:** React 19, TypeScript, Vite.
- **Styling:** Tailwind CSS (Custom "High Density" theme).
- **Maps Foundation:** `@vis.gl/react-google-maps`.
- **Data Discovery:** Overpass API (OpenStreetMap).
- **Animations:** `motion`.
- **AI & Voice:** WebRTC / Web Audio API, Gemini Live API (Multimodal functionality).

## 2. API Integrations
### AI & Conversational
- **Gemini Multimodal Live API:** Powers the Realtime Voice interaction. Receives user voice input detailing destinations/goals, performs visual analysis of the map/satellite imagery, and streams back synthesized speech describing the optimal or unique routes.
- **WebRTC/WebSockets:** Allows low-latency, bidirectional audio streaming between the browser and the AI model.

### Google Maps Platform
- **Maps JavaScript API:** Rendering the base map and custom segments.
- **Directions API:** Calculating standard biking routes (BICYCLING mode).
- **Places Library:** (Planned) Destination autocomplete and discovery of localized lodging, such as "penzions", for endpoint waypoints in multi-day tours.

### Overpass API (OSM)
- **Endpoint:** `https://overpass-api.de/api/interpreter`
- **Usage:** Dynamic querying of `way["highway"~"path|track|cycleway"]` within the current map viewport.
- **Role:** Provides the "Grounding Data" to verify path metadata like `surface` and `smoothness`.

## 3. Data Schema (Internal)
### TrailSegment
```typescript
interface TrailSegment {
  id: number;
  name: string;
  surface: string;
  smoothness: string;
  source: 'osm' | 'discovery';
  coords: { lat: number, lng: number }[];
}
```

## 4. Key Components
- `App.tsx`: Main layout and state management for search vs. discovery.
- `discoveryService.ts`: Logic for interfacing with Overpass QL.
- `Directions`: Wrapper for the Google Maps Directions Service hooks.

## 5. Deployment & Security
- API Keys stored in `.env` and managed via platform secrets.
- Client-side filtering of segments to maintain performance during viewport shifts.
