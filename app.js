const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const cors = require("cors");
require("dotenv").config(); // Ensure environment variables are loaded

// Import the cluster utility
const { setupCluster } = require("./clusterConfig"); // Adjust path as needed

// Setup clustering - if this returns true, we're in the master process
const isMaster = setupCluster();

// Only run the Express app if we're in a worker process or clustering is disabled
if (!isMaster) {
  const app = express();
  const PORT = process.env.PORT || 4000; // Use environment variable for port

  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Enhanced CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "https://trippobazaar.com",
        /^https:\/\/.*\.trippobazaar\.com$/,
        "https://www.trippobazaar.com", // Add www version
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
      ];

      // Check if the origin is in the allowed list
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // For development, you might want to allow all origins
        if (process.env.NODE_ENV === "development") {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  };

  app.use(cors(corsOptions));

  // Handle preflight requests
  app.options("*", cors(corsOptions));

  // Require Routes
  const userRoutes = require("./routes/UserRoutes");
  const continentRoutes = require("./routes/ContinentRoutes");
  const countryRoutes = require("./routes/CountryRoutes");
  const stateRoutes = require("./routes/StateRoutes");
  const packageRoutes = require("./routes/PackageRoutes");
  const hotelRoutes = require("./routes/HotelRoutes");
  const couponRoutes = require("./routes/CouponRoutes");
  const contactRoutes = require("./routes/ContactRoutes");
  const bookingRoutes = require("./routes/BookingRoutes");
  const googleRoutes = require("./routes/GoogleRoutes");

  app.get("/", (req, res) => {
    res.json({
      message: "API is running...",
      worker: process.pid,
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      worker: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  // Define API Endpoints with prefixes
  app.use("/api/users", userRoutes);
  app.use("/api/continent", continentRoutes);
  app.use("/api/country", countryRoutes);
  app.use("/api/state", stateRoutes);
  app.use("/api/package", packageRoutes);
  app.use("/api/hotel", hotelRoutes);
  app.use("/api/coupon", couponRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/booking", bookingRoutes);
  app.use("/api/google", googleRoutes);

  // Error handling middleware for CORS
  app.use((err, req, res, next) => {
    if (err.message === "Not allowed by CORS") {
      res.status(403).json({
        error: "CORS Error",
        message: "Origin not allowed",
        origin: req.headers.origin,
        worker: process.pid,
      });
    } else {
      console.error(`Worker ${process.pid} error:`, err);
      res.status(500).json({
        error: "Internal Server Error",
        worker: process.pid,
        message:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong",
      });
    }
  });

  // DATABASE CONNECTION
  const connectDB = async (retries = 5) => {
    while (retries) {
      try {
        await mongoose.connect(process.env.DB_URL, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 10, // Maximum connections in the pool
          minPoolSize: 2,
        });
        console.log(`Worker ${process.pid} connected to MongoDB`);
        break; // Exit the loop on successful connection
      } catch (err) {
        console.error(`Worker ${process.pid} failed to connect to DB`, err);
        retries -= 1;
        console.log(`Worker ${process.pid} retries left: ${retries}`);
        await new Promise((res) => setTimeout(res, 5000)); // Wait 5 seconds before retrying
      }
    }

    if (retries === 0) {
      console.error(
        `Worker ${process.pid} could not connect to MongoDB after multiple attempts.`
      );
      process.exit(1); // Exit process if connection fails
    }
  };

  connectDB();

  // Graceful shutdown for worker processes
  process.on("SIGTERM", () => {
    console.log(
      `Worker ${process.pid} received SIGTERM, shutting down gracefully`
    );
    mongoose.connection.close(() => {
      console.log(`Worker ${process.pid} MongoDB connection closed`);
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log(
      `Worker ${process.pid} received SIGINT, shutting down gracefully`
    );
    mongoose.connection.close(() => {
      console.log(`Worker ${process.pid} MongoDB connection closed`);
      process.exit(0);
    });
  });

  // Server creation
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} is running on port ${PORT}`);
  });

  console.log(`Worker ${process.pid} started`);
}
