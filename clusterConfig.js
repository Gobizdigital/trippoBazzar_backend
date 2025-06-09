const cluster = require("cluster")
const os = require("os")

// Configuration for clustering
const clusterConfig = {
  // Number of workers to spawn (default: number of CPU cores)
  workers: process.env.CLUSTER_WORKERS || os.cpus().length,

  // Whether to enable clustering (can be disabled for development)
  enabled: process.env.CLUSTER_ENABLED !== "false",

  // Restart delay when a worker dies
  restartDelay: 1000,

  // Maximum number of restart attempts
  maxRestarts: 10,

  // Time window for restart attempts (in milliseconds)
  restartWindow: 60000,
}

// Track restart attempts
const restartAttempts = new Map()

function shouldRestart(workerId) {
  const now = Date.now()
  const attempts = restartAttempts.get(workerId) || []

  // Remove old attempts outside the time window
  const recentAttempts = attempts.filter((time) => now - time < clusterConfig.restartWindow)

  if (recentAttempts.length >= clusterConfig.maxRestarts) {
    console.error(`Worker ${workerId} has exceeded maximum restart attempts`)
    return false
  }

  recentAttempts.push(now)
  restartAttempts.set(workerId, recentAttempts)
  return true
}

function setupCluster() {
  if (!clusterConfig.enabled || !cluster.isMaster) {
    return false
  }

  console.log(`Master ${process.pid} is running`)
  console.log(`Spawning ${clusterConfig.workers} workers...`)

  // Fork workers
  for (let i = 0; i < clusterConfig.workers; i++) {
    cluster.fork()
  }

  // Listen for worker events
  cluster.on("online", (worker) => {
    console.log(`Worker ${worker.process.pid} is online`)
  })

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`)

    if (shouldRestart(worker.id)) {
      console.log(`Restarting worker ${worker.id} in ${clusterConfig.restartDelay}ms...`)
      setTimeout(() => {
        cluster.fork()
      }, clusterConfig.restartDelay)
    } else {
      console.error(`Not restarting worker ${worker.id} due to too many failures`)
    }
  })

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("Master shutting down gracefully...")

    for (const id in cluster.workers) {
      cluster.workers[id].kill("SIGTERM")
    }

    // Force kill after timeout
    setTimeout(() => {
      for (const id in cluster.workers) {
        if (!cluster.workers[id].isDead()) {
          cluster.workers[id].kill("SIGKILL")
        }
      }
      process.exit(0)
    }, 10000)
  }

  process.on("SIGTERM", shutdown)
  process.on("SIGINT", shutdown)

  return true
}

module.exports = {
  clusterConfig,
  setupCluster,
}
