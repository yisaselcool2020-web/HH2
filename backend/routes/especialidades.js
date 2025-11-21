@@ .. @@
 const express = require('express');
 const { body, validationResult, param } = require('express-validator');
-const Especialidad = require('../models/Especialidad');
+const Especialidad = require('../models/mysql/Especialidad');
 const { auth, authorize } = require('../middleware/auth');

 const router = express.Router();
@@ .. @@
   body('codigo').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Code must be between 2 and 10 characters'),
-  body('configuracion.duracionConsultaMinutos').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes'),
-  body('configuracion.requiereTriaje').optional().isBoolean().withMessage('Requires triage must be boolean'),
-  body('configuracion.color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
+  body('precio_contributivo').optional().isFloat({ min: 0 }).withMessage('Contributivo price must be positive'),
+  body('precio_subsidiado').optional().isFloat({ min: 0 }).withMessage('Subsidiado price must be positive'),
+  body('duracion_consulta_minutos').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes'),
+  body('requiere_triaje').optional().isBoolean().withMessage('Requires triage must be boolean'),
+  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
 ], async (req, res) => {
@@ .. @@
     const { nombre, codigo } = req.body;

     // Check if specialty already exists
-    const existingEspecialidad = await Especialidad.findOne({ 
-      $or: [{ nombre }, ...(codigo ? [{ codigo }] : [])]
-    });
+    const existingByName = await Especialidad.findByNombre(nombre);
+    if (existingByName) {
+      return res.status(400).json({ 
+        message: 'Specialty already exists with this name' 
+      });
+    }

-    if (existingEspecialidad) {
+    if (codigo) {
+      const [existing] = await require('../config/database').getConnection().execute(
+        'SELECT id FROM especialidades WHERE codigo = ? AND is_active = TRUE',
+        [codigo]
+      );
+      if (existing.length > 0) {
+        return res.status(400).json({ 
+          message: 'Specialty already exists with this code' 
+        });
+      }
+    }

-      return res.status(400).json({ 
-        message: 'Specialty already exists with this name or code' 
-      });
-    }

-    const especialidad = new Especialidad(req.body);
-    await especialidad.save();
+    const especialidad = await Especialidad.create(req.body);

     res.status(201).json({
@@ .. @@
   body('codigo').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Code must be between 2 and 10 characters'),
-  body('configuracion.duracionConsultaMinutos').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes'),
-  body('configuracion.requiereTriaje').optional().isBoolean().withMessage('Requires triage must be boolean'),
-  body('configuracion.color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
+  body('precio_contributivo').optional().isFloat({ min: 0 }).withMessage('Contributivo price must be positive'),
+  body('precio_subsidiado').optional().isFloat({ min: 0 }).withMessage('Subsidiado price must be positive'),
+  body('duracion_consulta_minutos').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes'),
+  body('requiere_triaje').optional().isBoolean().withMessage('Requires triage must be boolean'),
+  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
 ], async (req, res) => {
@@ .. @@
     }

-    const especialidad = await Especialidad.findById(req.params.id);
+    const especialidad = await Especialidad.findById(req.params.id);
     if (!especialidad) {
       return res.status(404).json({ message: 'Specialty not found' });
     }

     // Check for duplicate name or code (excluding current record)
-    if (req.body.nombre || req.body.codigo) {
-      const duplicateQuery = {
-        _id: { $ne: req.params.id },
-        $or: []
-      };
-
-      if (req.body.nombre) {
-        duplicateQuery.$or.push({ nombre: req.body.nombre });
-      }
-
-      if (req.body.codigo) {
-        duplicateQuery.$or.push({ codigo: req.body.codigo });
+    if (req.body.nombre) {
+      const existingByName = await Especialidad.findByNombre(req.body.nombre);
+      if (existingByName && existingByName.id != req.params.id) {
+        return res.status(400).json({ 
+          message: 'Specialty already exists with this name' 
+        });
       }
+    }

-      const existingEspecialidad = await Especialidad.findOne(duplicateQuery);
-      if (existingEspecialidad) {
+    if (req.body.codigo) {
+      const [existing] = await require('../config/database').getConnection().execute(
+        'SELECT id FROM especialidades WHERE codigo = ? AND id != ? AND is_active = TRUE',
+        [req.body.codigo, req.params.id]
+      );
+      if (existing.length > 0) {
         return res.status(400).json({ 
-          message: 'Specialty already exists with this name or code' 
+          message: 'Specialty already exists with this code' 
         });
       }
     }

-    const updatedEspecialidad = await Especialidad.findByIdAndUpdate(
-      req.params.id,
-      req.body,
-      { new: true, runValidators: true }
-    );
+    const updatedEspecialidad = await Especialidad.update(req.params.id, req.body);

     res.json({
@@ .. @@
     }

-    const especialidad = await Especialidad.findById(req.params.id);
+    const especialidad = await Especialidad.findById(req.params.id);
     if (!especialidad) {
       return res.status(404).json({ message: 'Specialty not found' });
     }

     // Check if specialty is being used by any doctor
-    const Doctor = require('../models/Doctor');
-    const doctorsUsingSpecialty = await Doctor.countDocuments({ 
-      especialidadId: req.params.id,
-      isActive: true 
-    });
+    const [doctorsUsing] = await require('../config/database').getConnection().execute(
+      'SELECT COUNT(*) as count FROM doctors WHERE especialidad_id = ? AND is_active = TRUE',
+      [req.params.id]
+    );

-    if (doctorsUsingSpecialty > 0) {
+    if (doctorsUsing[0].count > 0) {
       return res.status(400).json({ 
-        message: `Cannot deactivate specialty. ${doctorsUsingSpecialty} active doctor(s) are using this specialty.` 
+        message: `Cannot deactivate specialty. ${doctorsUsing[0].count} active doctor(s) are using this specialty.` 
       });
     }

-    especialidad.isActive = false;
-    await especialidad.save();
+    await Especialidad.deactivate(req.params.id);

     res.json({ message: 'Specialty deactivated successfully' });
@@ .. @@