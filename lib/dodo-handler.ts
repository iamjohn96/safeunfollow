import { verifyDodoPayload, premiumEvent, type PremiumEvent } from './dodo-webhook';
export interface DodoDependencies {
  secret?: string;
  persist: (event: PremiumEvent, id: string) => Promise<string>;
  notify: (email: string, id: string, plan: 'subscription' | 'lifetime') => Promise<void>;
}
export async function handleDodoWebhook(request: Request, deps: DodoDependencies): Promise<Response> {
  if (!deps.secret) return Response.json({ error: 'Webhook secret not configured' }, { status: 503 });
  let body: unknown;
  try { body = verifyDodoPayload(await request.text(), request.headers, deps.secret); }
  catch { return Response.json({ error: 'Invalid webhook' }, { status: 401 }); }
  let event;
  try { event = premiumEvent(body); }
  catch { return Response.json({ error: 'Invalid event payload' }, { status: 422 }); }
  if (!event) return Response.json({ received: true, ignored: true });
  const id = request.headers.get('webhook-id')!;
  try {
    const result = await deps.persist(event, id);
    const welcomePlan = event.kind === 'lifetime-grant' ? 'lifetime'
      : event.kind === 'subscription' && event.type === 'subscription.active' ? 'subscription' : null;
    if (result === 'applied' && welcomePlan && 'email' in event) {
      try { await deps.notify(event.email, id, welcomePlan); }
      catch { console.error('[webhook/dodo] Welcome email unavailable'); }
    }
    return Response.json({ received: true, result });
  } catch {
    console.error('[webhook/dodo] Entitlement persistence failed');
    return Response.json({ error: 'Persistence unavailable' }, { status: 503 });
  }
}

