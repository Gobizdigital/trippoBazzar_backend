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

// Enhanced CORS configuration to fix the issue
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)

      const allowedOrigins = [
        "https://trippobazaar.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
      ]

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        console.log(`CORS blocked origin: ${origin}`)
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "X-Worker-ID",
    ],
    exposedHeaders: ["X-Worker-ID"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  }),
)

// Handle preflight requests explicitly
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*")
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-Worker-ID",
  )
  res.header("Access-Control-Allow-Credentials", "true")
  res.sendStatus(200)
})

// Add worker identification middleware AFTER CORS
app.use((req, res, next) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  res.setHeader("X-Worker-ID", workerId)
  next()
})

// Compression and body parsing middleware
app.use(compression())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Request logging middleware for debugging
app.use((req, res, next) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  console.log(`Worker ${workerId}: ${req.method} ${req.path} - Origin: ${req.headers.origin}`)
  next()
})

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
    cors: {
      origin: req.headers.origin,
      userAgent: req.headers["user-agent"],
    },
  })
})

app.get("/", (req, res) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  res.json({
    message: `API is running on worker ${workerId} (PID: ${process.pid})`,
    worker: workerId,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  })
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

// 404 handler
app.use("*", (req, res) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  res.status(404).json({
    message: "Route not found",
    worker: workerId,
    path: req.originalUrl,
    method: req.method,
  })
})

// Global error handler
app.use((err, req, res, next) => {
  const workerId = cluster.worker ? cluster.worker.id : "single"
  console.error(`Worker ${workerId} Error: ${err.message}`)
  console.error(err.stack)

  // Ensure CORS headers are set even in error responses
  if (req.headers.origin) {
    res.header("Access-Control-Allow-Origin", req.headers.origin)
    res.header("Access-Control-Allow-Credentials", "true")
  }

  res.status(err.status || 500).json({
    message: "Something went wrong on the server",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    worker: workerId,
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
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
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

  // Set server timeout
  server.timeout = 30000

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

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    const workerId = cluster.worker ? cluster.worker.id : "single"
    console.error(`Worker ${workerId} Uncaught Exception:`, error)
    process.exit(1)
  })
})
