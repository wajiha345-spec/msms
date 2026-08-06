import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listUsers,
  createUser,
  updateUserRole,
  setUserActive,
  listPermissions,
  updatePermission,
} from './users.service';

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listUsersHandler(req: AuthRequest, res: Response) {
  try {
    const users = await listUsers(req.user!.shopId);
    return ok(res, users);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createUserHandler(req: AuthRequest, res: Response) {
  try {
    const { username, password, role, email } = req.body;
    if (!username) return fail(res, 'username is required');
    if (!password) return fail(res, 'password is required');
    if (!role)     return fail(res, 'role is required');

    const user = await createUser(req.user!.shopId, { username, password, role, email });
    return ok(res, user);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function updateUserRoleHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { role } = req.body;
    if (!role) return fail(res, 'role is required');

    const user = await updateUserRole(req.user!.shopId, req.user!.userId, id, role);
    return ok(res, user);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function setUserActiveHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return fail(res, 'isActive (boolean) is required');

    const user = await setUserActive(req.user!.shopId, req.user!.userId, id, isActive);
    return ok(res, user);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function listPermissionsHandler(req: AuthRequest, res: Response) {
  try {
    const permissions = await listPermissions(req.user!.shopId);
    return ok(res, permissions);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function updatePermissionHandler(req: AuthRequest, res: Response) {
  try {
    const { role, permission, allowed } = req.body;
    if (!role)       return fail(res, 'role is required');
    if (!permission) return fail(res, 'permission is required');
    if (typeof allowed !== 'boolean') return fail(res, 'allowed (boolean) is required');

    const updated = await updatePermission(req.user!.shopId, role, permission, allowed);
    return ok(res, updated);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
