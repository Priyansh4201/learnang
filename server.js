// server.js

const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = 3001; // We'll run this on a different port than your Angular app

// --- Middleware ---
// Enable CORS to allow requests from your Angular app (e.g., http://localhost:4200)
app.use(cors({
  origin: 'http://localhost:4200', // IMPORTANT: Change this if your Angular app runs on a different port
  credentials: true,
}));
// Enable the express server to parse JSON bodies in requests
app.use(express.json());


// --- FAKE DATABASE ---
// This section simulates our MongoDB database with hardcoded data.

const users = {
  "customer@carshop.com": { id: "user-1", name: "John Customer", email: "customer@carshop.com", role: "CUSTOMER", profileId: "cust-1" },
  "employee@carshop.com": { id: "user-2", name: "Jane Doe", email: "employee@carshop.com", role: "EMPLOYEE", profileId: "emp-1" },
  "owner@carshop.com": { id: "user-3", name: "Shop Owner", email: "owner@carshop.com", role: "OWNER", profileId: "owner-1" },
};

const cars = {
  "car-1": { id: "car-1", make: "Honda", model: "City", year: 2023, color: "White", licensePlate: "MH14XY5678", carType: "SEDAN" },
  "car-2": { id: "car-2", make: "Maruti", model: "Swift", year: 2022, color: "Red", licensePlate: "MH12AB1234", carType: "HATCHBACK" },
};

const customers = {
  "cust-1": { id: "cust-1", name: "John Customer", email: "customer@carshop.com", phone: "9876543210", address: "123 Main St, Pune", cars: [cars["car-1"], cars["car-2"]] },
};

const offerings = [
  { id: "offering-1", name: "Premium Wash", description: "Full exterior and interior cleaning.", durationMins: 45, prices: { HATCHBACK: 300, SEDAN: 350, SUV: 400 } },
  { id: "offering-2", name: "Ceramic Coating (3 Year)", description: "Full body ceramic coating.", durationMins: 2880, prices: { HATCHBACK: 20000, SEDAN: 25000, SUV: 30000 } },
  { id: "offering-3", name: "PPF - Full Front", description: "Paint Protection Film.", durationMins: 600, prices: { HATCHBACK: 35000, SEDAN: 40000, SUV: 45000 } },
];

const appointments = [
    { id: "appt-1", scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), status: "SCHEDULED", totalCost: 350, customer: customers["cust-1"], car: cars["car-1"], offering: offerings[0] }
];

// --- FAKE AUTHENTICATION MIDDLEWARE ---
// This function simulates checking for a logged-in user.
// In a real app, this would involve validating a JWT or session cookie.
// Here, we'll use a simple "x-user-email" header to fake the user.
const fakeAuth = (req, res, next) => {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail || !users[userEmail]) {
    // If no user email is provided, or the user doesn't exist, return 401 Unauthorized
    return res.status(401).json({ message: "Unauthorized: Please provide a valid 'x-user-email' header." });
  }
  // If the user exists, attach their data to the request object for other routes to use
  req.user = users[userEmail];
  next();
};


// =================================================================
// --- API ENDPOINTS ---
// =================================================================

// --- Profile Endpoints (Simulates /api/profile) ---

/**
 * GET /api/profile
 * Description: Fetches the customer profile of the currently authenticated user.
 * Auth: Required. Send 'x-user-email' header with 'customer@carshop.com'.
 * Response: 200 OK with the customer's profile object.
 */
app.get('/api/profile', fakeAuth, (req, res) => {
  if (req.user.role !== 'CUSTOMER') {
    return res.status(403).json({ message: "Forbidden: Only customers can access this profile." });
  }
  const customerProfile = customers[req.user.profileId];
  if (!customerProfile) {
    return res.status(404).json({ message: "Customer profile not found." });
  }
  res.json(customerProfile);
});

/**
 * GET /api/profile/appointments
 * Description: Fetches the appointments for the currently authenticated user.
 * Auth: Required. Send 'x-user-email' header with 'customer@carshop.com'.
 * Response: 200 OK with an array of appointment objects.
 */
app.get('/api/profile/appointments', fakeAuth, (req, res) => {
    // In this fake server, we just return all appointments for simplicity.
    res.json(appointments);
});


// --- Offerings Endpoint (Simulates /api/offerings) ---

/**
 * GET /api/offerings
 * Description: Fetches the list of all available services/offerings.
 * Auth: Required. Any valid 'x-user-email' will work.
 * Response: 200 OK with an array of offering objects.
 */
app.get('/api/offerings', fakeAuth, (req, res) => {
  res.json(offerings);
});


// --- Car Management Endpoints (Simulates /api/profile/cars) ---

/**
 * POST /api/profile/cars
 * Description: Adds a new car to the current user's profile.
 * Auth: Required. Send 'x-user-email' header with 'customer@carshop.com'.
 * Validation: Checks for make, model, year, color, and licensePlate.
 * Response: 
 *   - 201 Created with the new car object if validation passes.
 *   - 400 Bad Request with an array of errors if validation fails.
 */
app.post(
  '/api/profile/cars',
  fakeAuth,
  // Validation rules
  body('make').notEmpty().withMessage('Make is required'),
  body('model').notEmpty().withMessage('Model is required'),
  body('year').isInt({ min: 1980, max: new Date().getFullYear() + 1 }).withMessage('Please enter a valid year'),
  body('color').notEmpty().withMessage('Color is required'),
  body('licensePlate').notEmpty().withMessage('License plate is required'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, return a 400 response with the errors
      return res.status(400).json({ errors: errors.array() });
    }
    
    // If validation passes, we simulate creating the car.
    // We don't actually save it to our hardcoded `cars` object.
    const newCar = {
      id: `car-${Date.now()}`, // Generate a fake unique ID
      ...req.body,
      carType: null, // New cars don't have a type yet
    };
    
    console.log('Simulated adding new car:', newCar);
    res.status(201).json(newCar);
  }
);


// --- Appointments Endpoint (Simulates /api/appointments) ---

/**
 * POST /api/appointments
 * Description: Creates a new appointment.
 * Auth: Required. Send 'x-user-email' header with 'customer@carshop.com'.
 * Validation: Checks for carId, offeringId, and scheduledTime.
 * Response:
 *   - 201 Created with a success message if validation passes.
 *   - 400 Bad Request with an array of errors if validation fails.
 */
app.post(
    '/api/appointments',
    fakeAuth,
    body('carId').notEmpty().withMessage('Car selection is required'),
    body('offeringId').notEmpty().withMessage('Service selection is required'),
    body('scheduledTime').isISO8601().withMessage('A valid date and time is required'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Simulate a scheduling conflict
        if (req.body.offeringId === "offering-1") { // Let's pretend Premium Wash is very popular
            const hour = new Date(req.body.scheduledTime).getHours();
            if (hour >= 10 && hour <= 12) {
                return res.status(400).json({ message: "The selected time slot is unavailable. Please choose another time." });
            }
        }
        
        console.log('Simulated creating new appointment:', req.body);
        res.status(201).json({ message: 'Appointment booked successfully!' });
    }
);


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Fake CarShop API server is running on http://localhost:${PORT}`);
  console.log('\n--- Available Endpoints ---');
  console.log('GET    /api/profile             (Requires header: x-user-email: customer@carshop.com)');
  console.log('GET    /api/profile/appointments (Requires header: x-user-email: customer@carshop.com)');
  console.log('GET    /api/offerings           (Requires any valid x-user-email header)');
  console.log('POST   /api/profile/cars        (Requires header & validates body)');
  console.log('POST   /api/appointments        (Requires header & validates body)');
  console.log('\nTo simulate a logged-in user, send a request with the header:');
  console.log("x-user-email: 'customer@carshop.com'");
});