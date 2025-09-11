// Shared CORS Configuration for Express and Socket.IO

export const allowedOrigins = [
  "https://rvnbo.onrender.com",
  "https://garyh-dashboard.netlify.app",
  "http://10.10.20.29:3001",
  "http://10.10.20.45:3000",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://localhost:3000",
  "https://localhost:3001",
];

// CORS function for both Express and Socket.IO
export const corsOriginHandler = (origin, callback) => {
  console.log("CORS Request from origin:", origin);
  console.log("NODE_ENV:", process.env.NODE_ENV);

  // Allow requests with no origin (like mobile apps, Postman, server-to-server)
  if (!origin) {
    console.log("No origin - allowing request");
    return callback(null, true);
  }

  // Allow if origin is in the allowed list
  if (allowedOrigins.indexOf(origin) !== -1) {
    console.log("Origin allowed:", origin);
    callback(null, true);
  } else {
    // In development, allow all origins
    if (process.env.NODE_ENV !== "production") {
      console.log("Development mode - allowing origin:", origin);
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  }
};

// Express CORS Options
export const corsOptionsSecure = {
  origin: corsOriginHandler,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
  ],
};

// Socket.IO CORS Options
export const socketCorsOptions = {
  origin: (origin, callback) => {
    console.log("Socket.IO CORS Request from origin:", origin);

    // Allow requests with no origin
    if (!origin) {
      return callback(null, true);
    }

    // Allow if origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log("Socket.IO Origin allowed:", origin);
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== "production") {
        console.log("Socket.IO Development mode - allowing origin:", origin);
        callback(null, true);
      } else {
        console.log("Socket.IO CORS blocked origin:", origin);
        callback(null, false);
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

// Option 2: Permissive for debugging (use temporarily)
export const corsOptionsPermissive = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
  ],
};

// Option 3: Environment-based configuration
export const corsOptionsEnvironment = {
  origin: process.env.NODE_ENV === "production" ? allowedOrigins : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
  ],
};
