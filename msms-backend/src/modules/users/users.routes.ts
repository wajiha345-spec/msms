import { Router } from 'express';
import {
  listUsersHandler,
  createUserHandler,
  updateUserRoleHandler,
  setUserActiveHandler,
  listPermissionsHandler,
  updatePermissionHandler,
} from './users.controller';

const router = Router();

router.get('/',              listUsersHandler);
router.post('/',             createUserHandler);
router.patch('/:id/role',    updateUserRoleHandler);
router.patch('/:id/active',  setUserActiveHandler);

router.get('/permissions',        listPermissionsHandler);
router.patch('/permissions',      updatePermissionHandler);

export default router;
