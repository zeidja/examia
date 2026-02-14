import express from 'express';
import * as userController from '../controllers/userController.js';
import * as importController from '../controllers/importController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('super_admin', 'school_admin'), userController.getUsers);
router.get('/import/template', authorize('super_admin', 'school_admin'), importController.getImportTemplate);
router.post('/import', authorize('super_admin', 'school_admin'), uploadExcel, importController.importUsers);
router.get('/:id', userController.getUserById);
router.post('/', authorize('super_admin', 'school_admin'), userController.createUser);
router.put('/:id', authorize('super_admin', 'school_admin'), userController.updateUser);

export default router;
