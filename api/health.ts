import { handle } from 'hono/vercel';
import { app } from '../apps/server/src/index';

export const GET = handle(app);
export default handle(app);
