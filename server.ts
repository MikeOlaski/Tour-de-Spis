import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parsing middleware with a larger limit for base64 images
  app.use(express.json({ limit: "15mb" }));

  // Initialize Gemini API client on the server
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });

  // API Route for Vision Route Analysis
  app.post("/api/vision/analyze", async (req, res) => {
    try {
      const { image, region, surfacePref, effortLevel, tourType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image data for map analysis." });
      }

      // Check if Gemini API key exists
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is not configured on the server. Please define it in the Settings > Secrets panel." 
        });
      }

      // The image is base64 encoded, e.g. "data:image/png;base64,..."
      // Extract the raw base64 data and mimeType
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      let mimeType = "image/png";
      let base64Data = image;

      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }

      const prompt = `
        You are an elite topographical route planner and outdoor computer vision expert specializing in the Spiš region of Slovakia.
        You are analyzing an outdoor map screenshot from Freemap.sk (Hiking/Outdoor layer with trail markers, contour lines, forestry tracks, rivers, peaks).

        Selected region/context: ${region || "Spiš Trail Region"}
        User route preferences:
        - Surface: ${surfacePref || "Mixed"}
        - Effort: ${effortLevel || "Moderate"}
        - Tour Type: ${tourType || "Single Day"}

        Your task:
        1. Examine the topographic features, contour density (elevations), forests, valleys, peaks, streams, and trail markers (e.g., color-coded hiking/cycle paths) shown in this map screenshot.
        2. Identify and trace an "Interesting Route" of outstanding natural beauty or historic/scenic interest (such as approach valleys, ridge hikes, or castle meadows).
        3. Formulate a structured route report including a route name, key statistics (estimated distance, total climb, difficulty, safety rating), visual highlights seen on the map, a descriptive overview of the landscape, and a step-by-step itinerary.
        4. Recommend 3 local points of interest that are visible or implied on this map section.
        5. For visual rendering on the frontend, generate a list of approximate relative coordinates (coordinates as percentages [x, y] from 0 to 100 within the screenshot boundaries, where x=0 is left, x=100 is right, y=0 is top, y=100 is bottom) that represent the sequential path of this route so we can draw a beautiful polyline on top of the image container.

        Provide your response in JSON format.
      `;

      // Call Gemini 3.5 Flash Model (perfect for fast multimodal text+image processing)
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              routeName: { type: Type.STRING, description: "Name of the proposed route" },
              description: { type: Type.STRING, description: "Detailed narrative describing the landscape, forest tracks, and topographic elements visible in the map" },
              distanceKm: { type: Type.NUMBER, description: "Estimated route distance in kilometers" },
              climbMeters: { type: Type.NUMBER, description: "Estimated total elevation gain in meters" },
              difficulty: { type: Type.STRING, description: "Difficulty rating (Easy, Moderate, Challenging, Demanding)" },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of visual landscape features or highlights identified on the map"
              },
              pointsOfInterest: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "POI name" },
                    description: { type: Type.STRING, description: "Brief description of the POI" },
                    icon: { type: Type.STRING, description: "Keyword for icon: 'castle', 'mountain', 'water', 'forest', 'church', 'camp', 'crossroad'" }
                  },
                  required: ["name", "description", "icon"]
                }
              },
              safetyWarnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Safety advisories based on contour density, cliffs, water bodies or steep drops"
              },
              itinerary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    segment: { type: Type.STRING, description: "Segment name or step instruction" },
                    details: { type: Type.STRING, description: "Detailed description of trail markings, color tracks, or topographic directions to follow" },
                    elevation: { type: Type.STRING, description: "Elevation trend: climbing, flat, descending, rolling" }
                  },
                  required: ["segment", "details", "elevation"]
                }
              },
              // Relative path points to overlay on the image
              pathPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "X percentage from left (0 to 100)" },
                    y: { type: Type.NUMBER, description: "Y percentage from top (0 to 100)" }
                  },
                  required: ["x", "y"]
                },
                description: "List of 8-15 sequential relative coordinate points [x, y] tracing the route on the map screenshot"
              }
            },
            required: [
              "routeName",
              "description",
              "distanceKm",
              "climbMeters",
              "difficulty",
              "highlights",
              "pointsOfInterest",
              "safetyWarnings",
              "itinerary",
              "pathPoints"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text returned from the Gemini vision model.");
      }

      res.json(JSON.parse(responseText));

    } catch (error: any) {
      console.error("Vision route analyze error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze map screenshot with vision model" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
