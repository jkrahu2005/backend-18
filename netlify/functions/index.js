const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fetch = require("node-fetch"); // works with node-fetch@2

const app = express();
const router = express.Router(); // ✅ create a router

// Middlewares
router.use(cors());
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// Health check
router.get("/", (req, res) => {
  res.json({ status: "healthy", version: "1.0.0", message: "✅ Swiggy Backend is live" });
});

// Restaurants
router.get("/restaurants", async (req, res) => {
  try {
    const response = await fetch("https://www.swiggy.com/dapi/restaurants/list/v5?lat=28.7040592&lng=77.10249019999999&is-seo-homepage-enabled=true", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch restaurants" });
  }
});

// Restaurant Menu
router.get("/restaurant-menu/:id", async (req, res) => {
  const { id } = req.params;
  const url = `https://www.swiggy.com/mapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=28.7040592&lng=77.10249019999999&restaurantId=${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
});

// Mount router on /.netlify/functions/index
app.use("/.netlify/functions/index", router); // ✅ VERY IMPORTANT!

module.exports.handler = serverless(app);
