import { handleApiRequest } from './api-router.js';

export async function onRequest(context) {
  return handleApiRequest(context);
}
