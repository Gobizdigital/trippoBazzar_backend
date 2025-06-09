const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const cors = require("cors");
const cluster = require("cluster");
const os = require("os");
require("dotenv").config(); // Ensure environment variables are loaded

// Determine the number of CPU cores
const numCPUs = os.cpus().length;

// Clustering implementation
if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  console.log(`Setting up ${numCPUs} workers...`);

  // Fork workers based on CPU count
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker events
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code: ${code} and signal: ${signal}`);
    console.log("Starting a new worker");
    cluster.fork(); // Replace the dead worker
  });
} else {
  // Workers share the same port
  const app = express();
  const PORT = process.env.PORT || 4000; // Use environment variable for port

  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: ["https://trippobazaar.com", "http://localhost:5173"], // Pass an array of allowed origins
    })
  );

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
    res.send(`API is running... Worker PID: ${process.pid}`);
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
        console.log(`Retries left: ${retries}`);
        await new Promise((res) => setTimeout(res, 5000)); // Wait 5 seconds before retrying
      }
    }

    if (retries === 0) {
      console.error(`Worker ${process.pid} could not connect to MongoDB after multiple attempts.`);
      process.exit(1); // Exit process if connection fails
    }
  };

  connectDB();

  // Server creation
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} is running on port ${PORT}`);
  });

  console.log(`Worker ${process.pid} started`);
}