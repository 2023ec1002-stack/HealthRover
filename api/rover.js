const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

function getDB() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }

  return getDatabase();
}

function authorized(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.substring(7)
    : "";

  return token === process.env.ROVER_DEVICE_TOKEN;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!authorized(req)) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {
    const db = getDB();

    // ESP32-S3 GET: read latest command
    if (req.method === "GET") {
      const snapshot = await db.ref("commands").once("value");
      const commands = snapshot.val() || {};

      return res.status(200).json({
        movement: commands.movement || "STOP",
        mode: commands.mode || "MANUAL",
        medicine: commands.medicine || "NONE",
        timestamp: Date.now()
      });
    }

    // ESP32-S3 POST: send rover status
    if (req.method === "POST") {
      let body = req.body || {};

      if (typeof body === "string") {
        body = JSON.parse(body);
      }

      await db.ref("rover").update({
        online: true,
        movement: body.movement || "STOP",
        mode: body.mode || "MANUAL",
        battery: body.battery ?? null,
        voltage: body.voltage ?? null,
        lastSeen: Date.now()
      });

      return res.status(200).json({
        success: true,
        timestamp: Date.now()
      });
    }

    return res.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
};
