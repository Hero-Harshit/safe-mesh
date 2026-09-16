const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { Groq } = require('groq-sdk');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('WARNING: MONGO_URI is not defined in .env');
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Mount incident routes
const incidentRoutes = require('./routes/incidents');
app.use('/api/incidents', incidentRoutes);

// Mount uber routes
const uberRoutes = require('./routes/uber');
app.use('/api/uber', uberRoutes);

// Category priority mapping
const CATEGORY_PRIORITY = {
  7392: 100, // Police Station
  7321: 90,  // Hospital/Polyclinic
  7393: 80,  // Fire Station
  7322: 60,  // Pharmacy
  7332: 60,  // Transit Station
  7372: 45,  // Supermarket
  9361: 40,  // Convenience Store
  7311: 35   // Petrol Station
};

app.post('/api/safety/escape-route', async (req, res) => {
  const { latitude, longitude, timestamp } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, reason: 'MISSING_COORDINATES' });
  }

  try {
    // 1. Fetch Candidates from TomTom (Radius: 1000m)
    // Categories: Police (7392), Hospital (7321), Fire (7393), Pharmacy (7322), Transit (7332), Supermarket (7372), Convenience (9361), Petrol (7311)
    const categorySet = '7392,7321,7393,7322,7332,7372,9361,7311';
    const tomtomSearchUrl = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${TOMTOM_API_KEY}&lat=${latitude}&lon=${longitude}&radius=1000&categorySet=${categorySet}&limit=20`;

    const searchResponse = await axios.get(tomtomSearchUrl);
    const results = searchResponse.data.results || [];

    if (results.length === 0) {
      return res.status(200).json({ success: false, reason: 'NO_SAFE_DESTINATION_WITHIN_1KM' });
    }

    // 2. Normalize and Deterministic Scoring
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 20 || currentHour < 6;

    const candidates = results.map((place) => {
      const catCode = place.poi?.categorySet?.[0]?.id || 0;
      let baseScore = CATEGORY_PRIORITY[catCode] || 30;
      
      const distance = place.dist || 1000;
      // Closer is slightly better (+ up to 10 points for being very close)
      baseScore += Math.max(0, 10 - (distance / 100));

      const openingHours = place.poi?.openingHours;
      const isOpen = openingHours ? (openingHours.timeRanges?.length > 0) : null;
      let is247 = false;
      
      if (openingHours && openingHours.timeRanges) {
        // Very basic 24/7 check
        is247 = openingHours.timeRanges.some(tr => 
          tr.startTime && tr.startTime.minutes === 0 && 
          tr.endTime && tr.endTime.minutes === 0
        );
      }

      if (isNight) {
        if (is247) baseScore += 30;
        else if (isOpen === true) baseScore += 15;
        else if (isOpen === false) baseScore -= 40;
      }

      // Police and Hospitals get massive priority regardless of standard opening hour fields
      if (catCode === 7392 || catCode === 7321) {
          baseScore += 50; 
      }

      return {
        id: place.id,
        name: place.poi?.name || 'Unknown Destination',
        category: place.poi?.categories?.[0] || 'Unknown',
        latitude: place.position.lat,
        longitude: place.position.lon,
        distanceMeters: place.dist,
        address: place.address?.freeformAddress || '',
        score: baseScore,
        isOpen: isOpen,
        is247: is247
      };
    });

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Keep top 5 for Groq reasoning
    const topCandidates = candidates.slice(0, 5);

    let recommendedPlace = null;
    let groqReason = "";
    
    // 3. Groq Reasoning
    try {
      const prompt = `
You are an emergency safety assistant evaluating destinations for someone in an SOS situation.
Here are the top candidates within 1km:
${JSON.stringify(topCandidates, null, 2)}

Instructions:
1. Select the absolute best place for immediate physical safety.
2. Prefer police stations, fire stations, or hospitals over commercial locations.
3. Consider distance and whether it is open (especially if it is night).
4. Return ONLY a strict JSON object with this exact format:
{
  "recommendedPlaceId": "id-of-selected-place",
  "reason": "Clear, concise reason why this is the safest option."
}
`;

      const groqCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a critical emergency routing assistant. Output ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const groqResult = JSON.parse(groqCompletion.choices[0].message.content);
      
      recommendedPlace = candidates.find(c => c.id === groqResult.recommendedPlaceId);
      groqReason = groqResult.reason;

    } catch (groqError) {
      console.error("Groq Reasoning Failed:", groqError);
    }

    // 4. Fallback if Groq failed or returned invalid ID
    if (!recommendedPlace) {
      recommendedPlace = topCandidates[0]; // Highest deterministic score
      groqReason = "Recommended based on safety priority and distance (Automated Fallback).";
    }

    // 5. TomTom Routing
    let routeResult = null;
    try {
      const routingUrl = `https://api.tomtom.com/routing/1/calculateRoute/${latitude},${longitude}:${recommendedPlace.latitude},${recommendedPlace.longitude}/json?key=${TOMTOM_API_KEY}&travelMode=pedestrian`;
      const routeResponse = await axios.get(routingUrl);
      
      const route = routeResponse.data.routes[0];
      if (route) {
        routeResult = {
          distanceMeters: route.summary.lengthInMeters,
          durationSeconds: route.summary.travelTimeInSeconds,
          geometry: route.legs[0].points
        };
      }
    } catch (routeError) {
      console.error("TomTom Routing Failed:", routeError);
      // Route calculation failed, but we still have a destination
    }

    res.json({
      success: true,
      destination: {
        id: recommendedPlace.id,
        name: recommendedPlace.name,
        latitude: recommendedPlace.latitude,
        longitude: recommendedPlace.longitude,
        address: recommendedPlace.address
      },
      reason: groqReason,
      route: routeResult
    });

  } catch (error) {
    console.error("Escape Route Error:", error);
    res.status(500).json({ success: false, reason: 'SERVER_ERROR' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
