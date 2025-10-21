const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json());

// In-memory storage (for demo purposes)
let items = [
  {
    id: 1,
    name: "iPhone 13",
    description: "Black iPhone 13 with blue case",
    category: "electronics",
    status: "found",
    location: "Library - 2nd floor",
    date: "2024-01-15",
    image_url: null,
    claim_status: "unclaimed",
    reporter_name: "John Doe",
    reporter_email: "john@example.com",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    name: "Red Backpack",
    description: "Nike red backpack with laptop compartment",
    category: "bags",
    status: "lost",
    location: "Cafeteria",
    date: "2024-01-14",
    image_url: null,
    claim_status: "unclaimed",
    reporter_name: "Jane Smith",
    reporter_email: "jane@example.com",
    created_at: "2024-01-14T14:20:00Z"
  },
  {
    id: 3,
    name: "Student ID Card",
    description: "CCIS student ID - Sarah Johnson",
    category: "accessories",
    status: "found",
    location: "Computer Lab A",
    date: "2024-01-13",
    image_url: null,
    claim_status: "unclaimed",
    reporter_name: "Mike Wilson",
    reporter_email: "mike@example.com",
    created_at: "2024-01-13T09:15:00Z"
  },
  {
    id: 4,
    name: "Laptop Charger",
    description: "Dell laptop charger, black cable",
    category: "electronics",
    status: "found",
    location: "Computer Lab B",
    date: "2024-01-12",
    image_url: null,
    claim_status: "unclaimed",
    reporter_name: "Alex Chen",
    reporter_email: "alex@example.com",
    created_at: "2024-01-12T16:45:00Z"
  },
  {
    id: 5,
    name: "Textbook - Data Structures",
    description: "Introduction to Algorithms textbook",
    category: "books",
    status: "lost",
    location: "Library - Study Room 3",
    date: "2024-01-11",
    image_url: null,
    claim_status: "unclaimed",
    reporter_name: "Emma Davis",
    reporter_email: "emma@example.com",
    created_at: "2024-01-11T09:20:00Z"
  }
];

let claims = [];
let nextItemId = 6;
let nextClaimId = 1;

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'FLIRT Server is running',
    timestamp: new Date().toISOString(),
    itemsCount: items.length,
    claimsCount: claims.length
  });
});

// Get items with optional filtering
app.get('/api/items', (req, res) => {
  const { claimStatus, category, status } = req.query;
  
  let filteredItems = [...items];
  
  if (claimStatus === 'unclaimed') {
    filteredItems = filteredItems.filter(item => item.claim_status === 'unclaimed');
  }
  
  if (category && category !== 'all') {
    filteredItems = filteredItems.filter(item => item.category === category);
  }
  
  if (status && status !== 'all') {
    filteredItems = filteredItems.filter(item => item.status === status);
  }
  
  res.json({
    success: true,
    data: filteredItems,
    total: filteredItems.length
  });
});

// Create new item
app.post('/api/items', (req, res) => {
  const { name, description, category, status, location, date } = req.body;
  
  if (!name || !description || !category || !status || !location || !date) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
  
  const newItem = {
    id: nextItemId++,
    name: name.trim(),
    description: description.trim(),
    category,
    status,
    location: location.trim(),
    date,
    image_url: null,
    claim_status: 'unclaimed',
    reporter_name: 'Demo User',
    reporter_email: 'demo@example.com',
    created_at: new Date().toISOString()
  };
  
  items.push(newItem);
  
  res.status(201).json({
    success: true,
    data: newItem,
    message: 'Item reported successfully'
  });
});

// Get claims
app.get('/api/claims', (req, res) => {
  res.json({
    success: true,
    data: claims,
    total: claims.length
  });
});

// Create new claim
app.post('/api/claims', (req, res) => {
  const { itemId, verificationMessage } = req.body;
  
  if (!itemId || !verificationMessage) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
  
  // Check if item exists
  const item = items.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }
  
  // Check if item is already claimed
  if (item.claim_status !== 'unclaimed') {
    return res.status(400).json({
      success: false,
      message: 'Item is already claimed'
    });
  }
  
  const newClaim = {
    id: nextClaimId++,
    item_id: itemId,
    status: 'pending',
    verification_message: verificationMessage.trim(),
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  claims.push(newClaim);
  
  // Update item claim status
  item.claim_status = 'claimed';
  
  res.status(201).json({
    success: true,
    data: newClaim,
    message: 'Claim submitted successfully'
  });
});

// Update claim status (admin function)
app.patch('/api/claims/:id', (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;
  
  const claim = claims.find(c => c.id === parseInt(id));
  if (!claim) {
    return res.status(404).json({
      success: false,
      message: 'Claim not found'
    });
  }
  
  claim.status = status;
  claim.admin_notes = admin_notes;
  claim.updated_at = new Date().toISOString();
  
  res.json({
    success: true,
    data: claim,
    message: 'Claim updated successfully'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FLIRT Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 Items API: http://localhost:${PORT}/api/items`);
  console.log(`🎯 Claims API: http://localhost:${PORT}/api/claims`);
  console.log(`📝 Sample items loaded: ${items.length}`);
});
