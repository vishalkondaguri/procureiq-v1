"""Email service — sends transactional emails via SMTP.

Supports:
  • STARTTLS on port 587 (Gmail, Outlook, most providers)
  • SSL/TLS on port 465 (legacy but still common)
  • Console-log fallback when SMTP_ENABLED=false (dev / demo mode)

No third-party email library required — uses stdlib smtplib + email.
"""
from __future__ import annotations
import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dataclasses import dataclass

from app.config import settings

log = logging.getLogger(__name__)


# ── HTML email templates ───────────────────────────────────────────────────────

_BASE_HTML = """\
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {{ font-family: 'IBM Plex Sans', -apple-system, system-ui, sans-serif;
         margin: 0; padding: 0; background: #f4f4f4; color: #161616; }}
  .wrapper {{ max-width: 600px; margin: 32px auto; background: #fff;
              border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }}
  .header  {{ background: #0f62fe; padding: 24px 32px; }}
  .header h1 {{ margin: 0; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }}
  .header p  {{ margin: 4px 0 0; color: #a6c8ff; font-size: 13px; }}
  .body    {{ padding: 32px; }}
  .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; }}
  .body p  {{ font-size: 14px; line-height: 1.6; margin: 0 0 12px; color: #525252; }}
  .cred-box {{ background: #f4f4f4; border: 1px solid #e0e0e0; border-radius: 4px;
               padding: 16px 20px; margin: 20px 0; }}
  .cred-box .label {{ font-size: 11px; font-weight: 700; text-transform: uppercase;
                      letter-spacing: 0.06em; color: #8d8d8d; margin-bottom: 4px; }}
  .cred-box .value {{ font-size: 15px; font-weight: 700; color: #161616;
                      font-family: 'IBM Plex Mono', monospace; }}
  .btn {{ display: inline-block; padding: 12px 24px; background: #0f62fe; color: #fff;
          text-decoration: none; border-radius: 2px; font-weight: 700; font-size: 14px; }}
  .footer {{ background: #f4f4f4; padding: 16px 32px; border-top: 1px solid #e0e0e0; }}
  .footer p {{ font-size: 11px; color: #8d8d8d; margin: 0; }}
  .warning {{ background: #fff8e1; border-left: 3px solid #f1c21b;
              padding: 10px 14px; font-size: 13px; color: #7a6500; margin: 16px 0; }}
  .success {{ background: #defbe6; border-left: 3px solid #198038;
              padding: 10px 14px; font-size: 13px; color: #044317; margin: 16px 0; }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>ProcureIQ</h1>
    <p>Transforming Procurement Data into Intelligent Decisions</p>
  </div>
  <div class="body">
    {body}
  </div>
  <div class="footer">
    <p>This email was sent by ProcureIQ. Do not reply to this email.</p>
    <p>&copy; 2025 ProcureIQ &middot; Powered by IBM watsonx</p>
  </div>
</div>
</body>
</html>
"""


def _welcome_body(full_name: str, email: str, temp_password: str) -> str:
    return _BASE_HTML.format(body=f"""
<h2>Welcome to ProcureIQ, {full_name}!</h2>
<p>Your access request has been approved by an administrator.
You can now sign in to the ProcureIQ platform using the credentials below.</p>

<div class="cred-box">
  <div class="label">Email Address</div>
  <div class="value">{email}</div>
</div>
<div class="cred-box">
  <div class="label">Temporary Password</div>
  <div class="value">{temp_password}</div>
</div>

<div class="warning">
  &#9888;&#65039; This is a temporary password. Please change it immediately after signing in
  via <strong>Settings &rarr; Security</strong>.
</div>

<p style="margin-top:24px;">
  <a href="{settings.FRONTEND_URL}/login" class="btn">Sign In to ProcureIQ &rarr;</a>
</p>

<p style="margin-top:24px;">If you did not request access to ProcureIQ, please ignore this email
or contact your IT administrator.</p>
""")


def _reset_body(full_name: str, reset_url: str, expires_minutes: int) -> str:
    return _BASE_HTML.format(body=f"""
<h2>Reset Your ProcureIQ Password</h2>
<p>Hi {full_name},</p>
<p>We received a request to reset the password for your ProcureIQ account.
Click the button below to choose a new password.</p>

<p style="margin-top:24px;">
  <a href="{reset_url}" class="btn">Reset My Password &rarr;</a>
</p>

<div class="warning">
  &#9888;&#65039; This link expires in <strong>{expires_minutes} minutes</strong>.
  If you did not request a password reset, you can safely ignore this email &mdash;
  your password will not change.
</div>

<p style="font-size:12px;color:#8d8d8d;margin-top:24px;">
  If the button above doesn't work, copy and paste this URL into your browser:<br>
  <a href="{reset_url}" style="color:#0f62fe;">{reset_url}</a>
</p>
""")


def _test_body(to_email: str) -> str:
    return _BASE_HTML.format(body=f"""
<h2>Email Configuration Test</h2>
<p>This is a test message from ProcureIQ to confirm that your SMTP email settings
are configured correctly.</p>

<div class="success">
  &#10003; If you are reading this, your email configuration is working perfectly.
</div>

<p>Your ProcureIQ platform will now be able to:</p>
<ul style="font-size:14px;color:#525252;line-height:1.8;">
  <li>Send welcome emails with temporary passwords when approving new users</li>
  <li>Send password-reset links when users click "Forgot Password"</li>
  <li>Deliver procurement digest notifications</li>
</ul>

<p style="color:#8d8d8d;font-size:12px;margin-top:24px;">
  Test sent to: {to_email}
</p>
""")


def _plain_welcome(full_name: str, email: str, temp_password: str) -> str:
    return (
        f"Welcome to ProcureIQ, {full_name}!\n\n"
        f"Your access has been approved.\n\n"
        f"Email:              {email}\n"
        f"Temporary Password: {temp_password}\n\n"
        f"Sign in at: {settings.FRONTEND_URL}/login\n\n"
        f"Please change your password immediately after signing in."
    )


def _plain_reset(full_name: str, reset_url: str, expires_minutes: int) -> str:
    return (
        f"Hi {full_name},\n\n"
        f"Click the link below to reset your ProcureIQ password "
        f"(expires in {expires_minutes} minutes):\n\n"
        f"{reset_url}\n\n"
        f"If you did not request a password reset, ignore this email."
    )


def _plain_test(to_email: str) -> str:
    return (
        f"ProcureIQ Email Test\n\n"
        f"This is a test message confirming your SMTP configuration is working correctly.\n\n"
        f"Sent to: {to_email}\n\n"
        f"Your ProcureIQ platform email is now enabled."
    )


# ── SMTP connection helper ─────────────────────────────────────────────────────

@dataclass
class SMTPConfig:
    host: str
    port: int
    user: str
    password: str
    from_addr: str
    use_ssl: bool = False   # True = port 465 (SSL); False = port 587 (STARTTLS)


def _build_message(cfg: SMTPConfig, to: str, subject: str, html: str, plain: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = cfg.from_addr
    msg["To"]      = to
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html,  "html",  "utf-8"))
    return msg


def _send_sync(cfg: SMTPConfig, to: str, subject: str, html: str, plain: str) -> None:
    """Blocking SMTP send — called via asyncio.to_thread."""
    msg = _build_message(cfg, to, subject, html, plain)
    ctx = ssl.create_default_context()

    if cfg.use_ssl:
        # Port 465 — direct SSL connection
        with smtplib.SMTP_SSL(cfg.host, cfg.port, context=ctx, timeout=15) as server:
            server.login(cfg.user, cfg.password)
            server.sendmail(cfg.from_addr, [to], msg.as_string())
    else:
        # Port 587 — STARTTLS upgrade
        with smtplib.SMTP(cfg.host, cfg.port, timeout=15) as server:
            server.ehlo()
            server.starttls(context=ctx)
            server.ehlo()
            server.login(cfg.user, cfg.password)
            server.sendmail(cfg.from_addr, [to], msg.as_string())

    log.info("Email sent to %s -- %s", to, subject)


def test_connection_sync(cfg: SMTPConfig) -> dict:
    """Synchronous SMTP connection test — returns {ok, message}."""
    try:
        ctx = ssl.create_default_context()
        if cfg.use_ssl:
            with smtplib.SMTP_SSL(cfg.host, cfg.port, context=ctx, timeout=10) as server:
                server.login(cfg.user, cfg.password)
        else:
            with smtplib.SMTP(cfg.host, cfg.port, timeout=10) as server:
                server.ehlo()
                server.starttls(context=ctx)
                server.ehlo()
                server.login(cfg.user, cfg.password)
        return {"ok": True, "message": f"Connected to {cfg.host}:{cfg.port} successfully."}
    except smtplib.SMTPAuthenticationError:
        return {"ok": False, "message": "Authentication failed. Check your username and password (or App Password for Gmail)."}
    except smtplib.SMTPConnectError as e:
        return {"ok": False, "message": f"Cannot connect to {cfg.host}:{cfg.port}. Check host and port. ({e})"}
    except TimeoutError:
        return {"ok": False, "message": f"Connection timed out to {cfg.host}:{cfg.port}. Check firewall/network."}
    except ssl.SSLError as e:
        return {"ok": False, "message": f"SSL/TLS error: {e}. Try switching STARTTLS <-> SSL or checking certificates."}
    except Exception as e:
        return {"ok": False, "message": f"Unexpected error: {type(e).__name__}: {e}"}


def _get_default_cfg() -> SMTPConfig:
    """Build SMTPConfig from application settings (.env)."""
    return SMTPConfig(
        host=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        user=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        from_addr=settings.SMTP_FROM,
        use_ssl=(settings.SMTP_PORT == 465),
    )


# ── Async public API ──────────────────────────────────────────────────────────

async def send_email(
    to: str,
    subject: str,
    html: str,
    plain: str,
    cfg: SMTPConfig | None = None,
) -> None:
    """Async wrapper. Uses .env config by default; pass cfg to override (e.g. Settings UI)."""
    resolved = cfg or _get_default_cfg()

    if not settings.SMTP_ENABLED and cfg is None:
        # Dev/demo mode — log to console so you can see what would be sent
        log.info(
            "\n=== [EMAIL CONSOLE MODE] ===\nTo: %s\nSubject: %s\n\n%s\n============================",
            to, subject, plain,
        )
        return
    try:
        await asyncio.to_thread(_send_sync, resolved, to, subject, html, plain)
    except Exception as exc:
        log.error("Failed to send email to %s: %s", to, exc)
        # Never raise — email failure must not break the calling flow


async def send_welcome_email(to_email: str, full_name: str, temp_password: str) -> None:
    subject = "Welcome to ProcureIQ -- Your Access Has Been Approved"
    await send_email(
        to=to_email, subject=subject,
        html=_welcome_body(full_name, to_email, temp_password),
        plain=_plain_welcome(full_name, to_email, temp_password),
    )


async def send_password_reset_email(to_email: str, full_name: str, reset_token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    subject = "ProcureIQ -- Password Reset Request"
    await send_email(
        to=to_email, subject=subject,
        html=_reset_body(full_name, reset_url, settings.RESET_TOKEN_EXPIRE_MINUTES),
        plain=_plain_reset(full_name, reset_url, settings.RESET_TOKEN_EXPIRE_MINUTES),
    )


async def send_test_email(to_email: str, cfg: SMTPConfig) -> None:
    subject = "ProcureIQ -- Email Configuration Test"
    await send_email(
        to=to_email, subject=subject,
        html=_test_body(to_email),
        plain=_plain_test(to_email),
        cfg=cfg,
    )
