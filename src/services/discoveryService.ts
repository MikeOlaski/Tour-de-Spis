/**
 * Discovery Service for Spiš Bike Routes
 * Uses Overpass API to find real trail segments between villages
 */

export interface TrailSegment {
  id: number;
  name: string;
  surface: string;
  smoothness: string;
  source: 'osm' | 'discovery';
  coords: { lat: number, lng: number }[];
}

export async function findUniquePaths(bounds: google.maps.LatLngBoundsLiteral): Promise<TrailSegment[]> {
  const { south, west, north, east } = bounds;
  
  // Overpass QL query to find bikeable ways in the Spiš region
  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"path|track|cycleway|unclassified"]
      ["bicycle"!~"no"]
      (${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    if (!response.ok) throw new Error('Overpass API failed');
    
    const data = await response.json();
    
    // Convert OSM nodes and ways to our TrailSegment format
    const nodes: Record<number, { lat: number, lng: number }> = {};
    data.elements.forEach((el: any) => {
      if (el.type === 'node') {
        nodes[el.id] = { lat: el.lat, lng: el.lon };
      }
    });

    const segments: TrailSegment[] = data.elements
      .filter((el: any) => el.type === 'way' && el.nodes)
      .map((way: any) => ({
        id: way.id,
        name: way.tags?.name || 'Unnamed Path',
        surface: way.tags?.surface || 'unknown',
        smoothness: way.tags?.smoothness || 'unknown',
        source: 'osm',
        coords: way.nodes.map((nodeId: number) => nodes[nodeId]).filter(Boolean)
      }));

    return segments;
  } catch (error) {
    console.error('Path discovery failed:', error);
    return [];
  }
}
