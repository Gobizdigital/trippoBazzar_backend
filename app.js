const { setupCluster } = require("./utils/clusterConfig")

// Setup clustering
if (setupCluster()) {
  // Master process - clustering is handled in cluster-config.js
  return;
}

// Worker process or single process mode
const express = require("express")
const mongoose = require("mongoose")
const compression = require("compression")
const cors = require("cors")
const cluster = require("cluster")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 4000

// Add worker identification middleware
app.use((req, res, next) => {
  res.setHeader("X-Worker-ID", cluster.worker ? cluster.worker.id : "single")
  next()
})

app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  cors({
    origin: ["https://trippobazaar.com", "http://localhost:5173"],
  })
)

// Require Routes
const userRoutes = require("./routes/UserRoutes")
const continentRoutes = require("./routes/ContinentRoutes")
const countryRoutes = require("./routes/CountryRoutes")
const stateRoutes = require("./routes/StateRoutes")
const packageRoutes = require("./routes/PackageRoutes")
const hotelRoutes = require("./routes/HotelRoutes")
const couponRoutes = require("./routes/CouponRoutes")
const contactRoutes = require("./routes/ContactRoutes")
const bookingRoutes = require("./routes/BookingRoutes")
const googleRoutes = require("./routes/GoogleRoutes")

// Health check endpoint
app.get("/health", (req, res) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  res.json({
    status: "healthy",
    worker: workerId,
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
})

app.get("/", (req, res) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  res.send(`API is running on worker ${workerId} (PID: ${process.pid})...`)
})

// Define API Endpoints with prefixes
app.use("/api/users", userRoutes)
app.use("/api/continent", continentRoutes)
app.use("/api/country", countryRoutes)
app.use("/api/state", stateRoutes)
app.use("/api/package", packageRoutes)
app.use("/api/hotel", hotelRoutes)
app.use("/api/coupon", couponRoutes)
app.use("/api/contact", contactRoutes)
app.use("/api/booking", bookingRoutes)
app.use("/api/google", googleRoutes)

// Global error handler
app.use((err, req, res, next) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  console.error(`Worker ${workerId} Error: ${err.message}`)
  console.error(err.stack)
  res.status(500).json({
    message: "Something went wrong on the server",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// DATABASE CONNECTION
const connectDB = async (retries = 5) => {
  const os = require("os")
  const totalWorkers = process.env.CLUSTER_WORKERS || os.cpus().length
  const poolSize = Math.ceil(10 / totalWorkers) // Distribute the 10 connections across workers

  while (retries) {
    try {
      await mongoose.connect(process.env.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: poolSize,
        minPoolSize: 1,
      })
      const workerId = cluster.worker ? cluster.worker.id : "single"
      console.log(`Worker ${workerId}: Connected to MongoDB`)
      break
    } catch (err) {
      const workerId = cluster.worker ? cluster.worker.id : "single"
      console.error(`Worker ${workerId}: Failed to connect to DB`, err)
      retries -= 1
      console.log(`Worker ${workerId}: Retries left: ${retries}`)
      await new Promise((res) => setTimeout(res, 5000))
    }
  }

  if (retries === 0) {
    const workerId = cluster.worker ? cluster.worker.id : "single"
    console.error(`Worker ${workerId}: Could not connect to MongoDB after multiple attempts.`)
    process.exit(1)
  }
}

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    const workerId = cluster.worker ? cluster.worker.id : "single"
    console.log(`Worker ${workerId} (PID: ${process.pid}) is running on port ${PORT}`)
  })

  // Graceful shutdown
  const shutdown = () => {
    const workerId = cluster.worker ? cluster.worker.id : "single"
    console.info(`Worker ${workerId}: Shutting down gracefully...`)

    server.close(() => {
      console.log(`Worker ${workerId}: HTTP server closed.`)
      mongoose.connection.close(false, () => {
        console.log(`Worker ${workerId}: MongoDB connection closed.`)
        process.exit(0)
      })
    })
  }

  process.on("SIGTERM", shutdown)
  process.on("SIGINT", shutdown)

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    const workerId = cluster.worker ? cluster.worker.id : "single"
    console.error(`Worker ${workerId} Unhandled Rejection at:`, promise, "reason:", reason)
  })
})
