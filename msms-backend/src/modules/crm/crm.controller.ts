import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ok, fail } from '../../utils/response';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerProfile,
  addInteraction,
  updateInteraction,
  deleteInteraction,
  listUpcomingFollowUps,
} from './crm.service';

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function getParamValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  throw new Error('Valid id is required');
}

export async function listCustomersHandler(req: AuthRequest, res: Response) {
  try {
    const customers = await listCustomers(req.user!.shopId, {
      search: getQueryValue(req.query.search),
      status: getQueryValue(req.query.status),
      tag:    getQueryValue(req.query.tag),
    });
    return ok(res, customers);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function createCustomerHandler(req: AuthRequest, res: Response) {
  try {
    const { name, phone, email, cnic, address, tags, status, source, notes } = req.body;
    const customer = await createCustomer(req.user!.shopId, {
      name, phone, email, cnic, address, tags, status, source, notes,
    });
    return ok(res, customer);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function getCustomerProfileHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const profile = await getCustomerProfile(req.user!.shopId, id);
    return ok(res, profile);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function updateCustomerHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { name, email, cnic, address, tags, status, source, notes } = req.body;
    const customer = await updateCustomer(req.user!.shopId, id, {
      name, email, cnic, address, tags, status, source, notes,
    });
    return ok(res, customer);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function deleteCustomerHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    await deleteCustomer(req.user!.shopId, id);
    return ok(res, { deleted: true });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function addInteractionHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { type, text, followUpDate } = req.body;
    const interaction = await addInteraction(req.user!.shopId, id, {
      type, text, followUpDate, userId: req.user!.userId,
    });
    return ok(res, interaction);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function updateInteractionHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    const { text, completed } = req.body;
    const interaction = await updateInteraction(req.user!.shopId, id, { text, completed });
    return ok(res, interaction);
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function deleteInteractionHandler(req: AuthRequest, res: Response) {
  try {
    const id = getParamValue(req.params.id);
    await deleteInteraction(req.user!.shopId, id);
    return ok(res, { deleted: true });
  } catch (e: any) {
    return fail(res, e.message);
  }
}

export async function listFollowUpsHandler(req: AuthRequest, res: Response) {
  try {
    const followUps = await listUpcomingFollowUps(req.user!.shopId);
    return ok(res, followUps);
  } catch (e: any) {
    return fail(res, e.message);
  }
}
