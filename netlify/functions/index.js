const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fetch = require("node-fetch"); // node-fetch@2

const app = express();
const router = express.Router();

// Middlewares
router.use(cors());
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// ✅ Health check route
router.get("/", (req, res) => {
  res.json({ status: "healthy", version: "1.0.0", message: "✅ Swiggy Backend is live" });
});

// ✅ Restaurants API — now uses Mumbai location for consistent data
router.get("/restaurants", async (req, res) => {
  try {
    const response = await fetch(
      "https://www.swiggy.com/dapi/restaurants/list/v5?lat=19.0760&lng=72.8777&is-seo-homepage-enabled=true&page_type=DESKTOP_WEB_LISTING",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      }
    );

    const data = await response.json();

    // ✅ Log the outer structure to check actual keys and length
    console.log("💡 Swiggy keys:", Object.keys(data));
    console.log("💡 Cards Length:", data?.data?.cards?.length);
    if (Array.isArray(data?.data?.cards)) {
      console.log("💡 Sample card keys:", Object.keys(data.data.cards[0] || {}));
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("⚠️ Error fetching Swiggy data:", err);
    res.status(500).json({ success: false, error: "Failed to fetch restaurants" });
  }
});

// ✅ Restaurant menu by ID
router.get("/restaurant-menu/:id", async (req, res) => {
  const { id } = req.params;
  const url = `https://www.swiggy.com/mapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=19.0760&lng=72.8777&restaurantId=${id}`;

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

// ✅ VERY IMPORTANT for Netlify
app.use("/.netlify/functions/index", router);

module.exports.handler = serverless(app);
