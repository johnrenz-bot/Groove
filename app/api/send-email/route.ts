import { Resend } from "resend";

// SENDER NOTE:
// `onboarding@resend.dev` is a Resend-managed test address. On test/free
// accounts it can ONLY deliver to the Resend account owner's own verified email
// address -- sending to any other recipient is rejected by Resend with
// `validation_error` (403). To send to real users you must add and verify a
// domain in the Resend dashboard, then point this at an address on that
// verified domain, e.g. "GroovePH <hello@yourdomain.com>".
// See: https://resend.com/docs/dashboard/domains/introduction
//
// Env-driven so switching to a verified domain needs no code change and no
// redeploy of edited source. Falls back to the restricted test sender when
// unset, so local development and the owner-only smoke test keep working.
const FROM_ADDRESS =
    process.env.RESEND_FROM_ADDRESS || "GroovePH <onboarding@resend.dev>";

const SITE_URL = "https://grooveph.vercel.app";
const BANNER_URL = `${SITE_URL}/logos/banner/image.png`;

const WELCOME_HTML = (name: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>Welcome to GroovePH</title>
</head>
<body style="margin:0;padding:0;background-color:#08090b;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
  <div style="display:none;font-size:1px;color:#08090b;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your passion. Your people. Your groove. Welcome to GroovePH!
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#08090b;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#111216;border:1px solid #292a30;border-radius:18px;overflow:hidden;">

          <tr>
            <td align="center" style="padding:28px 24px 20px;">
              <p style="margin:0;color:#f6c94b;font-size:13px;font-weight:bold;letter-spacing:3px;">GROOVEPH</p>
              <p style="margin:8px 0 0;color:#a7a7b0;font-size:12px;letter-spacing:1px;">PERFORMING ARTS PHILIPPINES</p>
            </td>
          </tr>

          <tr>
            <td>
              <img
                src="${BANNER_URL}"
                alt="Welcome to GroovePH"
                width="600"
                style="display:block;width:100%;max-width:600px;height:auto;border:0;"
              />
            </td>
          </tr>

          <tr>
            <td style="padding:34px 28px 38px;">
              <p style="margin:0 0 12px;color:#f6c94b;font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">
                YOUR CREATIVE JOURNEY STARTS HERE
              </p>

              <h1 style="margin:0 0 18px;color:#ffffff;font-size:30px;line-height:1.25;">
                Welcome to GroovePH, ${name}!
              </h1>

              <p style="margin:0 0 18px;color:#d1d1d8;font-size:16px;line-height:1.8;">
                We're happy to have you in our creative community. GroovePH is your space to discover performing arts, connect with talented coaches, explore studios, and take the next step in your creative journey.
              </p>

              <p style="margin:0 0 26px;color:#d1d1d8;font-size:16px;line-height:1.8;">
                Whether you're learning something new or growing your skills, there's a place for you here. Bring your passion, meet your people, and find your groove!
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center" bgcolor="#f6c94b" style="border-radius:8px;">
                    <a
                      href="${SITE_URL}"
                      target="_blank"
                      style="display:inline-block;padding:15px 28px;color:#17130a;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;"
                    >
                      Explore GroovePH &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="height:1px;background-color:#303039;margin:28px 0;"></div>

              <p style="margin:0 0 8px;color:#ffffff;font-size:16px;font-weight:bold;">
                Your passion. Your people. Your groove. 💛
              </p>

              <p style="margin:0;color:#a7a7b0;font-size:14px;line-height:1.8;">
                Thanks for being part of GroovePH. We can't wait to see where your creative journey takes you!
              </p>

              <p style="margin:24px 0 0;color:#d1d1d8;font-size:14px;line-height:1.8;">
                Warm regards,<br />
                <strong style="color:#f6c94b;">The GroovePH Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 24px;background-color:#0b0c0f;border-top:1px solid #292a30;">
              <p style="margin:0 0 8px;color:#f6c94b;font-size:12px;font-weight:bold;letter-spacing:1.5px;">
                GROOVEPH · PERFORMING ARTS PHILIPPINES
              </p>
              <p style="margin:0;color:#92929c;font-size:12px;line-height:1.7;">
                Connecting artists, coaches, and creative communities. 🎨🎶
              </p>
              <p style="margin:14px 0 0;color:#686873;font-size:11px;line-height:1.6;">
                You're receiving this email because an account was registered using this email address.
              </p>
              <p style="margin:8px 0 0;font-size:11px;">
                <a href="${SITE_URL}" style="color:#f6c94b;text-decoration:none;">Visit GroovePH</a>
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

const WELCOME_TEXT = (name: string) => `
Welcome to GroovePH, ${name}! 💛

Your passion. Your people. Your groove.

We're happy to have you in our creative community. GroovePH is your space to discover performing arts, connect with talented coaches, explore studios, and grow your craft.

Explore GroovePH:
${SITE_URL}

Warm regards,
The GroovePH Team

Connecting artists, coaches, and creative communities.
`;

/**
 * Resend overloads the single name `validation_error` across several unrelated
 * HTTP statuses: 400 (a bad field), 401 (invalid key), 403 (restricted
 * resend.dev sender), 403 (domain not verified), and 403 (inbox limit). The
 * status code is lost by the time this route reports back, and echoing
 * `error.name` alone therefore told an operator nothing actionable -- a
 * production failure surfaced only as `detail="validation_error"`. Map the
 * message onto one specific, stable code per cause.
 */
function classifyResendError(name: string, message: string): string {
    if (name === "validation_error") {
        if (/testing emails to your own email|resend\.dev/i.test(message)) {
            return "restricted_sender";
        }
        if (/is not verified|add and verify your domain/i.test(message)) {
            return "domain_not_verified";
        }
        if (/api key is invalid/i.test(message)) {
            return "api_key_invalid";
        }
        if (/inboxes included in your plan|extra inbox/i.test(message)) {
            return "inbox_limit_reached";
        }
        return "field_validation";
    }

    if (name === "restricted_api_key" || name === "suspended_api_key") {
        return "api_key_not_usable";
    }

    return name;
}

export async function POST(request: Request) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.error(
                "[send-email] RESEND_API_KEY is not set. " +
                "Add it to .env.local for local dev or to Vercel environment variables for production."
            );
            return Response.json(
                { success: false, error: "Email service is not configured." },
                { status: 500 }
            );
        }

        // Lazily initialised after the key check so a missing key is caught above.
        const resend = new Resend(process.env.RESEND_API_KEY);

        const contentType = request.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            return Response.json(
                { success: false, error: "Content-Type must be application/json." },
                { status: 415 }
            );
        }

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return Response.json(
                { success: false, error: "Invalid JSON request body." },
                { status: 400 }
            );
        }

        if (
            !body ||
            typeof body !== "object" ||
            !("email" in body) ||
            typeof body.email !== "string"
        ) {
            return Response.json(
                { success: false, error: "A valid email is required." },
                { status: 400 }
            );
        }

        const email = body.email.trim();

        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return Response.json(
                { success: false, error: "A valid email is required." },
                { status: 400 }
            );
        }

        // Escape any user-provided text before inserting it into HTML.
        const escapeHtml = (value: string) =>
            value.replace(/[&<>"']/g, (char) => {
                const entities: Record<string, string> = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                };

                return entities[char];
            });

        let rawName = "there";
        if (
            "name" in body &&
            typeof (body as Record<string, unknown>).name === "string" &&
            ((body as Record<string, unknown>).name as string).trim()
        ) {
            rawName = ((body as Record<string, unknown>).name as string).trim().slice(0, 50);
        }
        const name = escapeHtml(rawName);

        const { data, error } = await resend.emails.send({
            from: FROM_ADDRESS,
            to: [email],
            subject: "Welcome to GroovePH 💛 Ready to Find Your Groove?",
            html: WELCOME_HTML(name),
            text: WELCOME_TEXT(rawName),
        });

        if (error) {
            const reason = classifyResendError(error.name, error.message);

            // Log sanitised details — the message comes from Resend's API and
            // contains no PII or API key material, but we still omit the
            // recipient address from the log to keep it clean.
            console.error(
                `[send-email] Resend rejected the request. ` +
                `reason="${reason}" name="${error.name}" message="${error.message}". ` +
                `from="${FROM_ADDRESS}". ` +
                (reason === "restricted_sender"
                    ? `The sender is Resend's restricted test address, which can only ` +
                      `deliver to the account owner's own email. Verify a domain at ` +
                      `https://resend.com/domains and set RESEND_FROM_ADDRESS to an ` +
                      `address on it.`
                    : "")
            );

            return Response.json(
                { success: false, error: "Unable to send welcome email.", detail: reason },
                { status: 502 }
            );
        }

        console.log(`[send-email] Welcome email accepted by Resend. id=${data?.id}`);

        return Response.json({
            success: true,
            message: "Welcome email accepted by Resend.",
            id: data?.id,
        });
    } catch (error) {
        // Log error type and message only — never log request body / user data.
        const errType = error instanceof Error ? error.constructor.name : typeof error;
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[send-email] Unexpected error. type=${errType} message="${errMsg}"`);

        return Response.json(
            { success: false, error: "Failed to send welcome email." },
            { status: 500 }
        );
    }
}
