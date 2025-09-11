// CORS Configuration Options for Debugging

// Option 1: Current configuration (most secure)
const corsOptionsSecure = {
  origin: function (origin, callback) {
    console.log('CORS Request from origin:', origin);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const allowedOrigins = [
      "https://rvnbo.onrender.com",
      "http://10.10.20.29:3001",
      "http://10.10.20.45:3000",
      "http://localhost:3000",
      "http://localhost:3001"
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
};

// Option 2: Permissive for debugging (use temporarily)
const corsOptionsPermissive = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
};

// Option 3: Environment-based configuration
const corsOptionsEnvironment = {
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://rvnbo.onrender.com"] 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
};

export { corsOptionsSecure, corsOptionsPermissive, corsOptionsEnvironment };
