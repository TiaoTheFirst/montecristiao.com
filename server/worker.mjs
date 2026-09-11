import { worldAt } from './world.mjs';
import { household } from './household.mjs';
const reply = (data, status = 200, head = false) => new Response(head ? null : JSON.stringify(data), {
  status, headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
});
export default {
  async fetch(req, env) {
    const url = new URL(req.url), head = req.method === 'HEAD';
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (!['GET','HEAD'].includes(req.method)) return reply({error:'SERVICE_NOT_OPEN'},503);
    if (url.pathname === '/api/daily') return reply({edition:household().current},200,head);
    if (url.pathname === '/api/world') {
      if (url.search) return reply({error:'TIME_OVERRIDE_NOT_ALLOWED'},400,head);
      return reply(worldAt(),200,head);
    }
    if (url.pathname === '/api/auth/get-session') return reply(null,200,head);
    if (url.pathname === '/api/config') return reply({mode:'public-visit',realService:false,mail:'closed'},200,head);
    if (url.pathname === '/api/health') return reply({app:'montecristiao-v4',release:'2026-09-11',mode:'public-visit'},200,head);
    return reply({error:'SERVICE_NOT_OPEN'},503,head);
  }
};
