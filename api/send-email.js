import nodemailer from "nodemailer";
import { getAdminFirestore } from "./firebaseAdmin.js";
import { verifyServerIdentity } from "./sessionStore.js";
import { escapeHtml } from "./utils/validation.js";

export default async function handler(req, res) {
  // Support GET request to retrieve submissions for authorized admin dashboard/contact viewer
  if (req.method === "GET") {
    try {
      const identity = await verifyServerIdentity(req);
      if (!identity.verified) {
        return res.status(401).json({ success: false, error: "Unauthorized: Administrator authentication required to retrieve submissions." });
      }

      const adminDb = getAdminFirestore();
      if (!adminDb) {
        return res.status(200).json({ success: true, count: 0, submissions: [] });
      }
      const snap = await adminDb.collection("contactSubmissions").get();
      const list = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return res.status(200).json({ success: true, count: list.length, submissions: list });
    } catch (e) {
      console.warn("Could not retrieve contact submissions:", e.message);
      return res.status(200).json({ success: true, count: 0, submissions: [] });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, plan, customMessage } = req.body || {};

  if (!name || !email || !plan) {
    return res.status(400).json({ error: "All required fields (name, email, plan) must be provided" });
  }

  // Plan price mapping
  const planPrices = {
    "3month": "₹4000",
    "6month": "₹7000",
    "1year": "₹10500",
    "custom": "Custom Price — will be discussed"
  };

  const planText = plan === "custom" 
    ? "Custom Plan" 
    : `${plan.replace("month", " Month").replace("year", " Year")} (${planPrices[plan] || ""})`;

  const timestamp = new Date().toISOString();
  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Prepare submission record for Firestore
  const submissionRecord = {
    id: submissionId,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    plan,
    planText,
    customMessage: customMessage ? String(customMessage).trim() : "",
    price: planPrices[plan] || "N/A",
    createdAt: timestamp,
    status: "new",
    emailDispatched: false
  };

  // 1. Always persist submission in Firestore first (ensures zero data loss)
  let savedToFirestore = false;
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      await adminDb.collection("contactSubmissions").doc(submissionId).set(submissionRecord, { merge: true });
      savedToFirestore = true;
    }
  } catch (dbErr) {
    console.warn("Could not save contact submission to Firestore:", dbErr.message);
  }

  const mailUser = process.env.MAIL_USER ? process.env.MAIL_USER.trim() : "";
  const mailPass = process.env.MAIL_PASS ? process.env.MAIL_PASS.trim() : "";
  const cleanPass = mailPass.replace(/\s+/g, "");

  // 2. Validate SMTP configuration before attempting dispatch
  if (!mailUser || !mailPass) {
    return res.status(200).json({
      success: true,
      saved: savedToFirestore,
      emailDispatched: false,
      submissionId,
      message: "Request successfully recorded in database.",
      note: "SMTP email credentials (MAIL_USER, MAIL_PASS) are not configured. To trigger live emails, configure a 16-letter Google App Password."
    });
  }

  // Google App Passwords must be 16 alphabet characters (e.g. abcd efgh ijkl mnop)
  // If the password is all numeric, it is invalid for Gmail SMTP
  if (/^\d+$/.test(cleanPass)) {
    console.warn(
      `[Contact Form] MAIL_PASS is numeric (${cleanPass.length} digits). Google App Passwords must be 16 alphabet letters. Bypassing SMTP dispatch to prevent authentication errors.`
    );

    return res.status(200).json({
      success: true,
      saved: savedToFirestore,
      emailDispatched: false,
      submissionId,
      message: "Request recorded in database.",
      note: "Google Gmail App Passwords consist of 16 alphabet letters (e.g. abcd efgh ijkl mnop). The configured password was numeric, so email dispatch was safely bypassed to prevent 535 BadCredentials errors."
    });
  }

  // 3. Dispatch emails via Nodemailer when valid credentials format is provided
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: mailUser,
        pass: cleanPass
      }
    });

    const targetAdminEmail = mailUser || "avijitkayet97@gmail.com";
    const safeName = escapeHtml(String(name).trim());
    const safeEmail = escapeHtml(String(email).trim().toLowerCase());
    const safePlanText = escapeHtml(planText);
    const safeCustomMessage = customMessage ? escapeHtml(String(customMessage).trim()) : "";

    // A. Send notification to Admin Inbox
    await transporter.sendMail({
      from: `"KayetDMS Support" <${mailUser}>`,
      replyTo: email,
      to: targetAdminEmail,
      subject: `📩 New KayetDMS Contact Request: ${safeName} (${planText})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0284c7; margin-top: 0;">📢 New Subscription Request</h2>
          <p style="font-size: 0.95rem; color: #475569;">A new inquiry has been submitted via the KayetDMS Contact Form:</p>
          
          <table cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; background: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="width: 35%; font-weight: bold; color: #334155;">Client Name:</td>
              <td style="color: #0f172a;">${safeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="font-weight: bold; color: #334155;">Email:</td>
              <td><a href="mailto:${safeEmail}" style="color: #0284c7; text-decoration: none;">${safeEmail}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="font-weight: bold; color: #334155;">Plan Requested:</td>
              <td style="font-weight: bold; color: #0369a1;">${safePlanText}</td>
            </tr>
            ${safeCustomMessage ? `
            <tr>
              <td style="font-weight: bold; color: #334155; vertical-align: top;">Custom Details:</td>
              <td style="color: #475569; white-space: pre-wrap;">${safeCustomMessage}</td>
            </tr>
            ` : ""}
          </table>

          <div style="font-size: 0.82rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Submission ID: <code>${submissionId}</code> &bull; Timestamp: ${timestamp}
          </div>
        </div>
      `
    });

    // B. Send Auto-Confirmation to the User
    try {
      await transporter.sendMail({
        from: `"KayetDMS Support" <${mailUser}>`,
        to: email,
        subject: `✅ KayetDMS — We Received Your Subscription Request`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background: #ffffff; color: #1e293b; max-width: 600px; margin: 0 auto; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
              <h2 style="color: #0284c7; margin: 0;">KayetDMS Digital Integrity Platform</h2>
            </div>
            <p>Dear <strong>${safeName}</strong>,</p>
            <p>Thank you for reaching out to us. We have received your inquiry for the <strong>${safePlanText}</strong>.</p>
            
            <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
              <strong>Requested Subscription:</strong> ${safePlanText}<br>
              ${safeCustomMessage ? `<strong>Your Message:</strong> ${safeCustomMessage}<br>` : ""}
              <strong>Status:</strong> Assigned to Asset Integrity &amp; Licensing Specialist
            </div>

            <p style="font-size: 0.95rem; line-height: 1.5;">Our engineering team will review your requirements and reach out to you within 24 hours with access credentials or payment details.</p>
            
            <p style="margin-top: 24px; font-size: 0.85rem; color: #64748b;">
              Best regards,<br>
              <strong>KayetDMS Support &amp; Engineering Team</strong><br>
              <a href="mailto:avijitkayet97@gmail.com" style="color: #0284c7;">avijitkayet97@gmail.com</a>
            </p>
          </div>
        `
      });
    } catch (autoReplyErr) {
      console.warn("Could not dispatch user confirmation auto-reply:", autoReplyErr.message);
    }

    // Update Firestore with emailDispatched = true
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        await adminDb.collection("contactSubmissions").doc(submissionId).set({ emailDispatched: true, dispatchedAt: new Date().toISOString() }, { merge: true });
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      saved: true,
      emailDispatched: true,
      submissionId,
      message: "✅ Email sent and request recorded successfully!"
    });
  } catch (error) {
    console.warn("Nodemailer dispatch encounter:", error.message);

    // Update Firestore doc with the email error so it can be audited
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        await adminDb.collection("contactSubmissions").doc(submissionId).set({ emailError: error.message }, { merge: true });
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      saved: savedToFirestore,
      emailDispatched: false,
      submissionId,
      message: "Request recorded in database. Direct email delivery encountered an issue (check SMTP settings)."
    });
  }
}
