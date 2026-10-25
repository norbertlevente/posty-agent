import { PostyAPI } from '../api';
import { getConfig } from '../config';
import { openBrowser } from './auth';
import { result, status, fail } from '../output';

/*
  SUBSCRIBING FROM A SHELL, WITH THE ONE STEP THAT STAYS HUMAN.

  An agent driving this CLI can show the plans, ask for a checkout link and
  confirm afterwards that the plan is live. It cannot pay, and it must not
  try: the link is Stripe's Managed Payments Checkout, the person opens it
  and pays with their own Link wallet or card. A one-time or agent-issued
  card would fail at the first renewal and end the plan, so `billing:subscribe`
  says so on stderr every time it prints a link.
*/

/** `posty billing:plans` — the four plans, prices in forint, and the current tier. */
export async function billingPlans() {
  const api = new PostyAPI(getConfig());
  try {
    result(await api.getPlans());
  } catch (error: any) {
    fail('Failed to read the plans', error);
  }
}

/**
 * `posty billing:subscribe --tier pro --period yearly [--open]` — a Stripe
 * Checkout link for the plan. Printed as JSON on stdout; `--open` also opens
 * it in the browser of the machine the CLI runs on, which is only useful when
 * that machine is the person's own.
 */
export async function billingSubscribe(args: any) {
  const tier = String(args.tier || '').trim();
  const period = String(args.period || '').trim().toLowerCase();

  if (!tier) {
    fail(
      'Failed to start the subscription',
      new Error('Give the plan with --tier (alap, pro, kreator or csapat; see "posty billing:plans")')
    );
  }
  if (period !== 'monthly' && period !== 'yearly') {
    fail(
      'Failed to start the subscription',
      new Error('Give the period with --period monthly or --period yearly')
    );
  }

  const api = new PostyAPI(getConfig());
  try {
    const checkout = await api.createSubscriptionCheckout(tier, period);
    status(
      `Checkout link for ${checkout.plan} (${checkout.period.toLowerCase()}, ${checkout.amount} ${checkout.currency}${
        checkout.trial ? `, ${checkout.trialDays}-day free trial` : ''
      }). The link expires at ${checkout.expiresAt}.`
    );
    status(
      'The subscriber opens this link and pays in Stripe Checkout with their own Link wallet or card. Do not pay with a one-time or agent-issued card: the subscription renews and a one-time card fails at the first renewal. After paying, run "posty billing:status" to confirm.'
    );
    /*
      The note goes to stderr ONCE, in the CLI's own words: the server's text
      is shared with the MCP tools, and the JSON on stdout carries
      `apiAndMcpAccess: false` for a script to act on. Printing `note` in both
      streams showed the person the same warning twice.
    */
    const { note: _note, ...json } = checkout;
    if (checkout.apiAndMcpAccess === false) {
      status(
        `The ${checkout.plan} plan has no API or MCP access: after the payment this key still reaches only the billing commands, and the person uses Posty in the web app. Tell the person before they pay; a plan with apiAndMcpAccess: true in "posty billing:plans" keeps the CLI working.`
      );
    }
    if (args.open) {
      openBrowser(checkout.checkoutUrl);
      status('Opened the checkout in the browser.');
    }
    result(json);
  } catch (error: any) {
    fail('Failed to start the subscription', error);
  }
}

/** `posty billing:status` — the subscription state and any unpaid checkout. */
export async function billingStatus() {
  const api = new PostyAPI(getConfig());
  try {
    const subscription = await api.getSubscription();
    if (subscription.pendingCheckout) {
      const pending = subscription.pendingCheckout;
      const when = (iso: string) =>
        iso ? new Date(iso).toLocaleString() : 'an unknown time';
      status(
        `A checkout for ${pending.plan}${
          pending.period ? ` (${pending.period.toLowerCase()})` : ''
        } started at ${when(pending.startedAt)} has not been paid yet. The link is in pendingCheckout.checkoutUrl and expires at ${when(pending.expiresAt)}.`
      );
    }
    result(subscription);
  } catch (error: any) {
    fail('Failed to read the subscription', error);
  }
}

/** `posty billing:manage [--open]` — a link to the Stripe billing portal. */
export async function billingManage(args: any) {
  const api = new PostyAPI(getConfig());
  try {
    const portal = await api.getSubscriptionPortal();
    // Once, on stderr; the JSON keeps only what a script acts on.
    const { note, ...json } = portal;
    status(note);
    if (args.open) {
      openBrowser(portal.portalUrl);
      status('Opened the billing portal in the browser.');
    }
    result(json);
  } catch (error: any) {
    fail('Failed to open the billing portal', error);
  }
}
