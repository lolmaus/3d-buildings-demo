import { useEffect, useRef, useState } from "react";
import maplibregl, {
  Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";

export const MapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Capture the ref value here to ensure type safety without '!' later
    const container = mapContainer.current;
    if (map.current || !container) return;

    // 1. Setup PMTiles Protocol
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    // 2. Load the Style JSON and patch it with local paths
    const initMap = async () => {
      // FIX: Use Vite's BASE_URL environment variable.
      // In dev, this is '/'. On GitHub Pages, this is '/your-repo-name/'.
      // We combine origin (https://domain.com) + base path (/repo/) to get the full root.
      const fullBaseUrl = `${window.location.origin}${
        import.meta.env.BASE_URL
      }`;

      // Ensure we don't end up with double slashes if BASE_URL is just '/'
      // (Though browsers generally handle double slashes in paths fine, it's cleaner to be precise)
      const cleanBaseUrl = fullBaseUrl.endsWith("/")
        ? fullBaseUrl
        : `${fullBaseUrl}/`;

      const pmtilesUrl = `pmtiles://https://tileserver-hermes.itsai.ru/vector`;
      const glyphsUrl = `${cleanBaseUrl}fonts/{fontstack}/{range}.pbf`;

      try {
        // Fetch the style JSON from public folder
        const response = await fetch(`${cleanBaseUrl}bright-style.json`);
        const styleJson: StyleSpecification = await response.json();

        // PATCH: Inject our local PMTiles URL into the style
        if (styleJson.sources && styleJson.sources["protomaps"]) {
          styleJson.sources["protomaps"] = {
            type: "vector",
            url: pmtilesUrl,
            attribution: "© OpenStreetMap",
          };
        }

        // PATCH: Inject our local Fonts URL
        styleJson.glyphs = glyphsUrl;

        // 3. Initialize Map
        map.current = new maplibregl.Map({
          container: container, // Use the captured 'container' variable (no '!' needed)
          style: styleJson,
          center: [39.594383, 52.593246],
          zoom: 15.5,
          pitch: 45,
          bearing: -17.6,
        });

        map.current.on("load", () => {
          setIsLoaded(true);

          // DEBUG: Click anywhere on the map to see what data exists there
          map.current?.on("click", (e) => {
            const features = map.current?.queryRenderedFeatures(e.point);
            console.log("Features under mouse:", features);

            const roads = features?.filter((f) => f.sourceLayer === "roads");
            if (roads && roads.length > 0) {
              console.log("First road properties:", roads[0].properties);
            }
          });
        });
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }
    };

    initMap();

    return () => {
      maplibregl.removeProtocol("pmtiles");
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100vh",
        left: 0,
        top: 0,
      }}
    >
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {!isLoaded && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "white",
            padding: "10px",
            zIndex: 10,
          }}
        >
          Loading self-hosted map...
        </div>
      )}
    </div>
  );
};
