@@ .. @@
 const express = require('express');
-const mongoose = require('mongoose');
+const { connectDB } = require('./config/database');
 const cors = require('cors');
 const helmet = require('helmet');
 const rateLimit = require('express-rate-limit');
@@ .. @@
 app.use('/api/patient-assignments', require('./routes/patientAssignments'));
 app.use('/api/dashboard', require('./routes/dashboard'));
 app.use('/api/especialidades', require('./routes/especialidades'));
 app.use('/api/consultorios', require('./routes/consultorios'));
+app.use('/api/financial', require('./routes/financial'));

 // Health check endpoint
@@ .. @@
 });

 // Database connection
-mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saviser', {
-  useNewUrlParser: true,
-  useUnifiedTopology: true,
-})
-.then(() => {
-  console.log('✅ Connected to MongoDB');
-})
-.catch((error) => {
-  console.error('❌ MongoDB connection error:', error);
-  process.exit(1);
-});
+connectDB();

 const PORT = process.env.PORT || 3000;
@@ .. @@