@@ .. @@
 const express = require('express');
 const { body, validationResult, param } = require('express-validator');
-const Triage = require('../models/Triage');
-const Patient = require('../models/Patient');
+const Triage = require('../models/mysql/Triage');
+const Patient = require('../models/mysql/Patient');
 const { auth, authorize } = require('../middleware/auth');

 const router = express.Router();

+// @route   GET /api/triage/search/:id
+// @desc    Search triages by patient ID (cedula)
+// @access  Private
+router.get('/search/:id', [
+  auth,
+  param('id').notEmpty().withMessage('Search term is required')
+], async (req, res) => {
+  try {
+    const errors = validationResult(req);
+    if (!errors.isEmpty()) {
+      return res.status(400).json({ errors: errors.array() });
+    }

+    const triages = await Triage.searchByPatientId(req.params.id);

+    res.json({
+      triages,
+      total: triages.length,
+      searchTerm: req.params.id
+    });
+  } catch (error) {
+    console.error('Search triages error:', error);
+    res.status(500).json({ message: 'Server error' });
+  }
+});

 // @route   GET /api/triage
@@ .. @@
   try {
     const { 
       page = 1, 
       limit = 50, 
       fecha, 
       prioridad, 
       estado,
-      enfermeroId 
+      enfermeroId,
+      search_id
     } = req.query;
     
-    let query = {};
-    
-    // Filter by date
-    if (fecha) {
-      const startDate = new Date(fecha);
-      const endDate = new Date(fecha);
-      endDate.setDate(endDate.getDate() + 1);
-      
-      query.fechaHora = {
-        $gte: startDate,
-        $lt: endDate
-      };
-    }
-    
-    // Filter by priority
-    if (prioridad) {
-      query.prioridad = prioridad;
-    }
-    
-    // Filter by status
-    if (estado) {
-      query.estado = estado;
-    }
-    
-    // Filter by nurse
-    if (enfermeroId) {
-      query.enfermeroId = enfermeroId;
-    }

-    const triages = await Triage.find(query)
-      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
-      .populate('enfermeroId', 'name')
-      .populate('asignadoA', 'name')
-      .sort({ fechaHora: -1, prioridad: 1 })
-      .limit(limit * 1)
-      .skip((page - 1) * limit);
+    const filters = {
+      fecha,
+      prioridad,
+      estado,
+      enfermero_id: enfermeroId,
+      search_id,
+      limit: limit * 1
+    };

-    const total = await Triage.countDocuments(query);
+    const triages = await Triage.getAll(filters);
+    const total = triages.length;

     res.json({
@@ .. @@
     const { pacienteId } = req.body;

     // Verify patient exists
-    const patient = await Patient.findById(pacienteId);
+    const patient = await Patient.findById(pacienteId);
     if (!patient) {
       return res.status(404).json({ message: 'Patient not found' });
     }

     // Check if patient already has a pending triage today
-    const today = new Date();
-    today.setHours(0, 0, 0, 0);
-    const tomorrow = new Date(today);
-    tomorrow.setDate(tomorrow.getDate() + 1);
+    const today = new Date().toISOString().split('T')[0];

-    const existingTriage = await Triage.findOne({
-      pacienteId,
-      fechaHora: { $gte: today, $lt: tomorrow },
-      estado: { $in: ['pendiente', 'en_proceso'] }
-    });
+    const existingTriages = await Triage.getAll({
+      paciente_id: pacienteId,
+      fecha: today
+    });
+    
+    const pendingTriage = existingTriages.find(t => 
+      t.estado === 'pendiente' || t.estado === 'en_proceso'
+    );

-    if (existingTriage) {
+    if (pendingTriage) {
       return res.status(400).json({ 
         message: 'Patient already has a pending triage today' 
       });
     }

-    const triage = new Triage({
+    const triageData = {
       ...req.body,
-      enfermeroId: req.user._id
-    });
+      paciente_id: pacienteId,
+      enfermero_id: req.user.id
+    };

-    await triage.save();
+    const triage = await Triage.create(triageData);

-    const populatedTriage = await Triage.findById(triage._id)
-      .populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
-      .populate('enfermeroId', 'name');

     res.status(201).json({
       message: 'Triage created successfully',
-      triage: populatedTriage
+      triage
     });
@@ .. @@
     }

-    const triage = await Triage.findById(req.params.id);
+    const triage = await Triage.findById(req.params.id);
     if (!triage) {
       return res.status(404).json({ message: 'Triage not found' });
     }

     // Check permissions
     const canEdit = req.user.role === 'enfermeria' || 
                    req.user.role === 'empresa' ||
-                   triage.enfermeroId.toString() === req.user._id.toString();
+                   triage.enfermero_id === req.user.id;

     if (!canEdit) {
       return res.status(403).json({ message: 'Not authorized to edit this triage' });
     }

-    const updatedTriage = await Triage.findByIdAndUpdate(
-      req.params.id,
-      req.body,
-      { new: true, runValidators: true }
-    ).populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
-     .populate('enfermeroId', 'name')
-     .populate('asignadoA', 'name');
+    const updatedTriage = await Triage.update(req.params.id, req.body);

     res.json({
@@ .. @@
     }

-    const triage = await Triage.findById(req.params.id);
+    const triage = await Triage.findById(req.params.id);
     if (!triage) {
       return res.status(404).json({ message: 'Triage not found' });
     }

-    if (triage.estado === 'completado') {
+    if (triage.estado === 'completado') {
       return res.status(400).json({ message: 'Cannot assign completed triage' });
     }

-    const updatedTriage = await Triage.findByIdAndUpdate(
-      req.params.id,
-      {
-        asignadoA: req.body.asignadoA,
-        fechaAsignacion: new Date(),
-        estado: 'en_proceso'
-      },
-      { new: true, runValidators: true }
-    ).populate('pacienteId', 'nombre apellido cedula telefono fechaNacimiento genero')
-     .populate('enfermeroId', 'name')
-     .populate('asignadoA', 'name');
+    const updatedTriage = await Triage.assignToDoctor(req.params.id, req.body.asignadoA);

     res.json({
@@ .. @@
     }

-    const triage = await Triage.findById(req.params.id);
+    const triage = await Triage.findById(req.params.id);
     if (!triage) {
       return res.status(404).json({ message: 'Triage not found' });
     }

-    if (triage.estado !== 'pendiente') {
+    if (triage.estado !== 'pendiente') {
       return res.status(400).json({ 
         message: 'Can only delete pending triages' 
       });
     }

     // Check permissions
     const canDelete = req.user.role === 'empresa' ||
-                     triage.enfermeroId.toString() === req.user._id.toString();
+                     triage.enfermero_id === req.user.id;

     if (!canDelete) {
       return res.status(403).json({ message: 'Not authorized to delete this triage' });
     }

-    await Triage.findByIdAndDelete(req.params.id);
+    await Triage.delete(req.params.id);

     res.json({ message: 'Triage deleted successfully' });
@@ .. @@