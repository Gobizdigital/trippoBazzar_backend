const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const cors = require("cors");
require("dotenv").config(); // Ensure environment variables are loaded

const app = express();
const PORT = process.env.PORT || 4000; // Use environment variable for port

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "https://trippobazaar.com" || "http://localhost:5173", // Replace with your actual frontend URL
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
const googleRoutes = require("./routes/GoogleRoutes");

app.get("/", (req, res) => {
  res.send("API is running...");
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
      console.log("Connected to MongoDB");
      break; // Exit the loop on successful connection
    } catch (err) {
      console.error("Failed to connect to DB", err);
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      await new Promise((res) => setTimeout(res, 5000)); // Wait 5 seconds before retrying
    }
  }

  if (retries === 0) {
    console.error("Could not connect to MongoDB after multiple attempts.");
    process.exit(1); // Exit process if connection fails
  }
};

connectDB();

// Server creation
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
