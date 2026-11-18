/**
 * Email service using Zoho CPaaS / ZeptoMail HTTP API
 */

const getZohoAuthHeader = (apiKey) => {
  if (!apiKey) return '';
  const trimmed = apiKey.trim();
  return trimmed.startsWith('Zoho-enczapikey') ? trimmed : `Zoho-enczapikey ${trimmed}`;
};

/**
 * Sends an email using the Zoho CPaaS HTTP POST API
 *
 * @param {Object} options
 * @param {string|Array<string|Object>} options.to - Recipient email or array of recipients
 * @param {string} [options.toName] - Recipient name
 * @param {string} options.subject - Subject line
 * @param {string} [options.htmlbody] - HTML body
 * @param {string} [options.html] - Alias for htmlbody
 * @returns {Promise<Object>} Response from Zoho API
 */
const sendEmail = async ({ to, toName, subject, htmlbody, html }) => {
  const apiUrl = process.env.ZOHO_API_URL || 'https://cpaas.zoho.in/v1.1/email';
  const apiKey = process.env.ZOHO_API_KEY;
  const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.MAIL_FROM || process.env.ADMIN_EMAIL;
  const fromName = process.env.ZOHO_FROM_NAME;

  if (!apiKey) {
    throw new Error('Zoho API key is not configured (missing ZOHO_API_KEY)');
  }
  if (!fromEmail) {
    throw new Error('Zoho sender email is not configured (missing ZOHO_FROM_EMAIL/ADMIN_EMAIL)');
  }

  // Format recipient list to match Zoho CPaaS schema:
  // "to": [{ "email_address": { "address": "...", "name": "..." } }]
  let recipients = [];
  if (Array.isArray(to)) {
    recipients = to.map((item) => {
      if (typeof item === 'string') {
        return { email_address: { address: item, name: item } };
      }
      return {
        email_address: {
          address: item.address || item.email,
          name: item.name || item.address || item.email,
        },
      };
    });
  } else if (typeof to === 'string') {
    recipients = [
      {
        email_address: {
          address: to,
          name: toName || to,
        },
      },
    ];
  } else if (to && typeof to === 'object') {
    recipients = [
      {
        email_address: {
          address: to.address || to.email,
          name: to.name || toName || to.address || to.email,
        },
      },
    ];
  } else {
    throw new Error('Invalid recipient email address');
  }

  const payload = {
    from: {
      address: fromEmail,
      ...(fromName ? { name: fromName } : {}),
    },
    to: recipients,
    subject: subject || 'No Subject',
    htmlbody: htmlbody || html || '<div></div>',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': getZohoAuthHeader(apiKey),
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }

  if (!response.ok) {
    const errorDetail = typeof responseData === 'object' && responseData !== null
      ? JSON.stringify(responseData)
      : responseText;
    throw new Error(`Zoho API HTTP error (${response.status}): ${errorDetail}`);
  }

  return responseData;
};

module.exports = {
  sendEmail,
  getZohoAuthHeader,
};
