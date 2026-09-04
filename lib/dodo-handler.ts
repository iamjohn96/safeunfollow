import { verifyDodoPayload, premiumEvent, type PremiumEvent } from './dodo-webhook';
export interface DodoDependencies {
  secret?: string;
  persist: (event: PremiumEvent, id: string) => Promise<string>;
  notify: (email: string, id: string) => Promise<void>;
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
    if (result === 'applied' && event.type === 'subscription.active') {
      try { await deps.notify(event.email, id); }
      catch { console.error('[webhook/dodo] Welcome email unavailable'); }
    }
    return Response.json({ received: true, result });
  } catch {
    console.error('[webhook/dodo] Entitlement persistence failed');
    return Response.json({ error: 'Persistence unavailable' }, { status: 503 });
  }
}

