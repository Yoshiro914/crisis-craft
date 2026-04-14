exports.handler = async (event) => {
  const { session_id } = event.queryStringParameters || {};

  if (!session_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
  }

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const PDF_URL = process.env.PDF_URL;

  // Verify payment with Stripe
  const stripeRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`,
    { headers: { 'Authorization': `Bearer ${STRIPE_KEY}` } }
  );
  const session = await stripeRes.json();

  if (!stripeRes.ok) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not retrieve session' }) };
  }

  if (session.payment_status !== 'paid') {
    return { statusCode: 402, body: JSON.stringify({ error: 'Payment not completed' }) };
  }

  const email = session.customer_details?.email;
  const name = session.customer_details?.name || '';
  const firstName = name.split(' ')[0] || 'there';

  // Send PDF link via Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Crisis Craft <orders@crisiscraft.store>',
      reply_to: 'support@crisiscraft.com',
      to: email,
      subject: 'Your Crisis Craft Field Manual — Download Inside',
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0e0e1f;color:#f0eee8;padding:40px 32px;border-radius:12px;">
          <h1 style="font-family:Georgia,serif;font-size:28px;color:#c8a84b;margin:0 0 16px;">You're in, ${firstName}.</h1>
          <p style="font-size:15px;line-height:1.6;margin:0 0 28px;">
            Thank you for your purchase. Your copy of <strong>The Crisis Craft Field Manual</strong> is ready for download.
          </p>
          <a href="${PDF_URL}"
             style="display:inline-block;background:#c8a84b;color:#0e0e1f;font-weight:700;font-size:16px;padding:16px 36px;border-radius:8px;text-decoration:none;margin-bottom:32px;">
            Download Your Manual →
          </a>
          <p style="font-size:13px;color:#8f8faa;line-height:1.65;margin:0 0 8px;">
            This link will always work — bookmark it or save this email. If you have any trouble, just reply here.
          </p>
          <hr style="border:none;border-top:1px solid #1e1e3a;margin:28px 0 16px;">
          <p style="font-size:11px;color:#555570;margin:0;">
            © 2026 Crisis Craft &nbsp;·&nbsp; 21-Day Money-Back Guarantee
          </p>
        </div>
      `,
    }),
  });

  const emailData = await emailRes.json();

  if (!emailRes.ok) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: emailData.message || 'Email failed to send' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, sent_to: email }),
  };
};
