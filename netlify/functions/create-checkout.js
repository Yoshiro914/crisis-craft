exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email = '';
  try {
    const body = JSON.parse(event.body || '{}');
    email = body.email || '';
  } catch (_) {}

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  const SITE_URL = 'https://crisiscraft.netlify.app';

  const params = new URLSearchParams();
  params.append('payment_method_types[]', 'card');
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][product_data][name]', 'The Crisis Craft Field Manual');
  params.append('line_items[0][price_data][product_data][description]', 'Digital PDF — Instant Download');
  params.append('line_items[0][price_data][unit_amount]', '1700');
  params.append('line_items[0][quantity]', '1');
  params.append('mode', 'payment');
  params.append('success_url', `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${SITE_URL}/`);
  if (email) params.append('customer_email', email);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await res.json();

  if (!res.ok) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: session.error?.message || 'Stripe error' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ url: session.url }),
  };
};
