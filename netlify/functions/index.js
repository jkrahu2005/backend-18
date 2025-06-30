const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Dynamic import for node-fetch
const fetch = (...args) => 
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Rate limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    status: "healthy",
    version: "1.0.0",
    message: "✅ Swiggy Backend is live"
  });
});

// Restaurants endpoint with improved error handling
app.get("/restaurants", async (req, res) => {
  const { lat = "28.7040592", lng = "77.10249019999999" } = req.query;
  const url = `https://www.swiggy.com/dapi/restaurants/list/v5?lat=${lat}&lng=${lng}&is-seo-homepage-enabled=true`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      },
      timeout: 8000 // 8 second timeout
    });

    if (!response.ok) {
      throw new Error(`Swiggy API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Restaurants API Error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch restaurants",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Restaurant menu endpoint with validation
app.get("/restaurant-menu/:id", async (req, res) => {
  const { id } = req.params;
  const { lat = "28.7040592", lng = "77.10249019999999" } = req.query;

  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ 
      success: false,
      error: "Invalid restaurant ID format" 
    });
  }

  const url = `https://www.swiggy.com/mapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=${lat}&lng=${lng}&restaurantId=${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 8000
    });

    if (!response.ok) {
      throw new Error(`Swiggy API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json({
      success: true,
      data: data,
      restaurantId: id,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`Menu API Error for restaurant ${id}:`, err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch menu",
      restaurantId: id,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Endpoint not found" 
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ 
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Netlify function handler
module.exports.handler = serverless(app);