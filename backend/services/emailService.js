/**
 * Email service using Zoho CPaaS / ZeptoMail HTTP REST API
 * Supports direct email dispatch with API key, BCC routing, and BO Score Report generation.
 */

const { calculateScores } = require('../utils/scoreCalculator');

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
 * @param {string|Array<string|Object>} [options.bcc] - Optional BCC recipient(s)
 * @param {string} [options.bccEmail] - Alias for bcc
 * @param {Array<Object>} [options.attachments] - Optional attachments
 * @returns {Promise<Object>} Response from Zoho API or dev simulated object
 */
const sendEmail = async ({ to, toName, subject, htmlbody, html, bcc, bccEmail, attachments }) => {
  const apiUrl = (process.env.ZOHO_MAIL_API_URL || process.env.ZOHO_API_URL || 'https://cpaas.zoho.in/v1.1/email').trim();
  const apiKey = (process.env.ZOHO_MAIL_API_KEY || process.env.ZOHO_API_KEY || '').trim();
  const fromEmail = (
    process.env.ZOHO_MAIL_FROM_EMAIL ||
    process.env.ZOHO_FROM_EMAIL ||
    process.env.MAIL_FROM ||
    process.env.ADMIN_EMAIL ||
    'noreply@wowos.in'
  ).trim();
  const fromName = (
    process.env.ZOHO_MAIL_FROM_NAME ||
    process.env.ZOHO_FROM_NAME ||
    'BO Score Wowos'
  ).trim();
  const defaultBcc = (process.env.ADMIN_BCC_EMAIL || process.env.BCC_EMAIL || 'sachin@wowos.in').trim();

  if (!to) {
    throw new Error('Recipient email is required');
  }

  // Format recipient list to match Zoho CPaaS schema:
  // "to": [{ "email_address": { "address": "...", "name": "..." } }]
  let recipients = [];
  if (Array.isArray(to)) {
    recipients = to.map((item) => {
      if (typeof item === 'string') {
        const addr = item.trim();
        return { email_address: { address: addr, name: addr } };
      }
      return {
        email_address: {
          address: (item.address || item.email || '').trim(),
          name: (item.name || item.address || item.email || '').trim(),
        },
      };
    }).filter((r) => r.email_address.address);
  } else if (typeof to === 'string') {
    recipients = [
      {
        email_address: {
          address: to.trim(),
          name: (toName || to).trim(),
        },
      },
    ];
  } else if (to && typeof to === 'object') {
    recipients = [
      {
        email_address: {
          address: (to.address || to.email || '').trim(),
          name: (to.name || toName || to.address || to.email || '').trim(),
        },
      },
    ];
  }

  if (recipients.length === 0) {
    throw new Error('Invalid recipient email address');
  }

  // Format BCC list
  const bccSource = bcc || bccEmail || defaultBcc;
  let bccRecipients = [];
  if (Array.isArray(bccSource)) {
    bccRecipients = bccSource.map((item) => {
      if (typeof item === 'string') {
        const addr = item.trim();
        return { email_address: { address: addr, name: addr } };
      }
      return {
        email_address: {
          address: (item.address || item.email || '').trim(),
          name: (item.name || 'Admin').trim(),
        },
      };
    }).filter((r) => r.email_address.address);
  } else if (typeof bccSource === 'string' && bccSource.trim()) {
    bccRecipients = [
      {
        email_address: {
          address: bccSource.trim(),
          name: 'Admin',
        },
      },
    ];
  }

  const payload = {
    from: {
      address: fromEmail,
      ...(fromName ? { name: fromName } : {}),
    },
    to: recipients,
    subject: subject || 'BO Score Report',
    htmlbody: htmlbody || html || '<div></div>',
  };

  if (bccRecipients.length > 0) {
    payload.bcc = bccRecipients;
  }

  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments;
  }

  // If no API key configured, log in dev mode
  if (!apiKey) {
    console.log('--------------------------------------------------');
    console.log('[Zoho Mail DEV MODE] No ZOHO_MAIL_API_KEY / ZOHO_API_KEY configured.');
    console.log(`📬 To: ${JSON.stringify(recipients)}`);
    if (bccRecipients.length > 0) console.log(`🔒 BCC: ${JSON.stringify(bccRecipients)}`);
    console.log(`✉️ Subject: ${subject}`);
    console.log('--------------------------------------------------');
    return {
      success: true,
      devMode: true,
      message: 'API key not configured. Email simulated in server log.',
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': getZohoAuthHeader(apiKey),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
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
      console.error(`[Zoho Mail Error] HTTP ${response.status}:`, errorDetail);
      throw new Error(`Zoho API HTTP error (${response.status}): ${errorDetail}`);
    }

    console.log(`[Zoho Mail Success] Email sent successfully to ${recipients[0]?.email_address?.address} (BCC: ${bccRecipients.map(b => b.email_address.address).join(', ') || 'none'})`);
    return {
      success: true,
      data: responseData,
    };
  } catch (err) {
    console.error(`[Zoho Mail Error] Failed to send email to ${recipients[0]?.email_address?.address}:`, err.message);
    throw err;
  }
};

/**
 * Generates an executive HTML email template for the Business Owner Score report
 */
const generateScoreReportHtml = ({ user, scores, analysisName }) => {
  const calculated = calculateScores(scores);
  const { grandTotal, rating, percentage, pillarResults, priorityPillars, scoredKpiCount } = calculated;

  const userName = user?.name || 'Business Leader';
  const userEmail = user?.email || '';
  const dateFormatted = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const frontendUrl = process.env.FRONTEND_URL || 'https://boscore.wowosapps.com';

  // Build HTML for Priority Focus Areas
  let priorityHtml = '';
  if (priorityPillars.length > 0) {
    const priorityItems = priorityPillars.map((p, i) => `
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${p.color};border-radius:6px;padding:12px 16px;margin-bottom:10px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:30px;vertical-align:middle;font-size:16px;"><strong>#${i + 1}</strong></td>
            <td style="vertical-align:middle;">
              <div style="font-weight:700;color:#0f172a;font-size:14px;">${p.icon} ${p.name}</div>
              <div style="color:#64748b;font-size:12px;margin-top:2px;">${p.outcome}</div>
            </td>
            <td style="text-align:right;vertical-align:middle;width:110px;">
              <span style="font-weight:700;color:${p.scoreColor};font-size:15px;">${p.weighted} / ${p.weight}</span>
              <div style="font-size:11px;color:#94a3b8;">${p.percentage}% score</div>
            </td>
          </tr>
        </table>
      </div>
    `).join('');

    priorityHtml = `
      <div style="margin-top:28px;margin-bottom:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
        <h3 style="margin:0 0 6px;color:#0f172a;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
          🎯 Priority Focus Areas
        </h3>
        <p style="margin:0 0 14px;color:#64748b;font-size:13px;">
          These pillars represent your greatest growth constraints and operational risks. Prioritize fixing them first:
        </p>
        ${priorityItems}
      </div>
    `;
  }

  // Build HTML for 5 Pillars & Detailed KPIs
  const pillarsHtml = pillarResults.map((p) => {
    const kpiRows = p.kpis.map((kpi, idx) => {
      const badgeBg = kpi.score >= 4 ? '#dcfce7' : kpi.score === 3 ? '#f1f5f9' : kpi.score === 2 ? '#ffedd5' : '#fee2e2';
      const textColor = kpi.score >= 4 ? '#15803d' : kpi.score === 3 ? '#475569' : kpi.score === 2 ? '#c2410c' : '#b91c1c';

      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 8px;font-size:13px;color:#1e293b;vertical-align:top;">
            <strong>${idx + 1}. ${kpi.label}</strong>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${kpi.sub}</div>
          </td>
          <td style="padding:10px 8px;text-align:right;vertical-align:middle;white-space:nowrap;width:120px;">
            <span style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:700;background:${badgeBg};color:${textColor};">
              ${kpi.score ? `${kpi.score}/5 • ${kpi.scoreLabel}` : 'Unscored'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <!-- Pillar Header -->
        <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 20px;border-left:5px solid ${p.color};">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="vertical-align:middle;">
                <span style="font-size:18px;margin-right:6px;">${p.icon}</span>
                <strong style="font-size:16px;color:#0f172a;">${p.name}</strong>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">${p.outcome}</div>
              </td>
              <td style="text-align:right;vertical-align:middle;width:120px;">
                <div style="font-size:20px;font-weight:800;color:${p.scoreColor};line-height:1;">
                  ${p.weighted} <span style="font-size:13px;color:#94a3b8;font-weight:400;">/ ${p.weight}</span>
                </div>
                <div style="font-size:12px;font-weight:600;color:${p.scoreColor};margin-top:4px;">
                  ${p.percentage}% achieved
                </div>
              </td>
            </tr>
          </table>

          <!-- Progress Bar -->
          <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:12px;">
            <div style="height:100%;width:${p.percentage}%;background:${p.scoreColor};border-radius:3px;"></div>
          </div>
        </div>

        <!-- Pillar KPIs Table -->
        <div style="padding:12px 20px 6px;">
          <table style="width:100%;border-collapse:collapse;">
            <tbody>
              ${kpiRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Business Owner Score (BO Score) Report</title>
    </head>
    <body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
      
      <!-- Outer Container -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:30px 10px;">
        <tr>
          <td align="center">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.35);">
              
              <!-- Brand Header -->
              <tr>
                <td style="background:#0d1117;padding:26px 30px;border-bottom:2px solid #c9890b;text-align:center;">
                  <div style="font-size:22px;font-weight:800;color:#e9a820;letter-spacing:1px;text-transform:uppercase;">
                    WOWOS FAST TRACK
                  </div>
                  <div style="font-size:13px;color:#8a9bb0;margin-top:4px;letter-spacing:0.5px;">
                    Business Owner Score (BO Score) Executive Report
                  </div>
                </td>
              </tr>

              <!-- Greeting & Subheading -->
              <tr>
                <td style="padding:28px 30px 16px;">
                  <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;font-weight:700;">
                    Hello ${userName},
                  </h2>
                  <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#475569;">
                    Here is your official Business Owner Score report for <strong>${analysisName || 'Assessment'}</strong>, generated on ${dateFormatted}.
                  </p>
                  <p style="margin:0;font-size:13px;color:#64748b;">
                    Registered Account: <strong>${userEmail}</strong>
                  </p>
                </td>
              </tr>

              <!-- Hero Score Dial / Score Card -->
              <tr>
                <td style="padding:10px 30px 24px;">
                  <div style="background:#0d1117;border:1px solid #1c2330;border-radius:12px;padding:28px 20px;text-align:center;box-shadow:inset 0 1px 2px rgba(255,255,255,0.05);">
                    <div style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#8a9bb0;font-weight:600;margin-bottom:8px;">
                      Your Overall Business Owner Score
                    </div>
                    
                    <div style="font-size:52px;font-weight:800;color:#e9a820;line-height:1;margin-bottom:6px;">
                      ${grandTotal} <span style="font-size:20px;color:#8a9bb0;font-weight:400;">/ 850</span>
                    </div>

                    <div style="margin-top:12px;">
                      <span style="display:inline-block;padding:6px 20px;border-radius:20px;font-weight:800;font-size:15px;background:${rating.badgeBg};color:${rating.color};border:1px solid ${rating.borderColor};">
                        ${rating.label}
                      </span>
                    </div>

                    <div style="color:#f5f0e8;font-size:14px;margin-top:12px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.5;">
                      ${rating.desc}
                    </div>

                    <div style="margin-top:16px;display:inline-block;background:#161b22;padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);font-size:12px;color:#8a9bb0;">
                      Maturity: <strong style="color:#ffffff;">${percentage}%</strong> • ${scoredKpiCount}/25 KPIs Evaluated
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Priority Focus Areas -->
              ${priorityHtml ? `<tr><td style="padding:0 30px;">${priorityHtml}</td></tr>` : ''}

              <!-- Pillars Breakdown Heading -->
              <tr>
                <td style="padding:10px 30px 14px;">
                  <h3 style="margin:0 0 6px;font-size:17px;color:#0f172a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                    📊 Pillar & KPI Performance Breakdown
                  </h3>
                  <p style="margin:0;font-size:13px;color:#64748b;">
                    Review your operational standing across the 5 essential foundational pillars of a self-sustaining business:
                  </p>
                </td>
              </tr>

              <!-- 5 Pillars Cards -->
              <tr>
                <td style="padding:0 30px 20px;">
                  ${pillarsHtml}
                </td>
              </tr>

              <!-- Score Benchmark Guide -->
              <tr>
                <td style="padding:10px 30px 24px;">
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
                    <div style="font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">
                      📖 Score Benchmark Guide
                    </div>
                    
                    <table style="width:100%;border-collapse:collapse;font-size:12px;">
                      <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px 4px;color:#22c55e;font-weight:700;width:90px;">750 – 850</td>
                        <td style="padding:8px 4px;color:#22c55e;font-weight:700;width:80px;">Excellent</td>
                        <td style="padding:8px 4px;color:#475569;">Business running like a system. Building a legacy.</td>
                      </tr>
                      <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px 4px;color:#3b82f6;font-weight:700;">600 – 749</td>
                        <td style="padding:8px 4px;color:#3b82f6;font-weight:700;">Strong</td>
                        <td style="padding:8px 4px;color:#475569;">Solid foundations. Clear gaps to close.</td>
                      </tr>
                      <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px 4px;color:#f97316;font-weight:700;">450 – 599</td>
                        <td style="padding:8px 4px;color:#f97316;font-weight:700;">Average</td>
                        <td style="padding:8px 4px;color:#475569;">Works but fragile. One crisis exposes the gaps.</td>
                      </tr>
                      <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px 4px;color:#ef4444;font-weight:700;">300 – 449</td>
                        <td style="padding:8px 4px;color:#ef4444;font-weight:700;">Needs Work</td>
                        <td style="padding:8px 4px;color:#475569;">Risk in at least 2 pillars. Fix before scaling.</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 4px;color:#9b1c1c;font-weight:700;">0 – 299</td>
                        <td style="padding:8px 4px;color:#9b1c1c;font-weight:700;">Critical</td>
                        <td style="padding:8px 4px;color:#475569;">Stop growing. Stabilise the business first.</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Call to Action -->
              <tr>
                <td style="padding:10px 30px 30px;text-align:center;">
                  <a href="${frontendUrl}" target="_blank" style="display:inline-block;background:#c9890b;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;box-shadow:0 2px 8px rgba(201,137,11,0.3);">
                    Open Full Assessment on Dashboard →
                  </a>
                  <div style="font-size:11px;color:#94a3b8;margin-top:10px;">
                    Track your historical score progress and update your KPIs at any time.
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:20px 30px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;">
                    WOWOS FAST TRACK • Business Owner Score
                  </p>
                  <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.4;">
                    This is an automated confidential performance audit report sent to ${userEmail}.<br>
                    Delivered via Zoho CPaaS API.
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;
};

/**
 * High-level service function to send a score report email
 * @param {Object} params
 * @param {Object} params.user - User document ({ name, email })
 * @param {Object|Map} params.scores - KPI scores map or object
 * @param {string} [params.analysisName] - Name or timestamp of the analysis
 */
const sendScoreReportEmail = async ({ user, scores, analysisName }) => {
  if (!user || !user.email) {
    throw new Error('User or user email is missing');
  }

  const calculated = calculateScores(scores);
  const subject = `Your Business Owner Score: ${calculated.grandTotal}/850 (${calculated.rating.label})`;
  const htmlContent = generateScoreReportHtml({ user, scores, analysisName });
  const adminBcc = (process.env.ADMIN_BCC_EMAIL || process.env.BCC_EMAIL || 'sachin@wowos.in').trim();

  const result = await sendEmail({
    to: user.email,
    toName: user.name || user.email,
    subject,
    htmlbody: htmlContent,
    bcc: adminBcc,
  });

  return {
    ...result,
    grandTotal: calculated.grandTotal,
    rating: calculated.rating.label,
    userEmail: user.email,
    bccEmail: adminBcc,
  };
};

module.exports = {
  sendEmail,
  sendScoreReportEmail,
  generateScoreReportHtml,
  getZohoAuthHeader,
};
