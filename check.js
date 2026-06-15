import { chromium } from "playwright";
import nodemailer from "nodemailer";

const URL =
  "https://lra-boeblingen.saas.smartcjm.com/m/Strassenverkehrsamt/extern/calendar/?uid=005020d0-b1d9-4f3c-8eb6-4022d0fbd760&wsid=84712d2e-b551-47a0-8ca3-538f0829b1f5&lang=de";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"]
});

try {
  const page = await browser.newPage();

  await page.goto(URL, {
    waitUntil: "networkidle",
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  const text = (await page.locator(".appointment_content").innerText()).toLowerCase();

  const noAppointmentPatterns = [
    "aktuell sind alle verfügbaren termine ausgebucht"
  ];

  const noAppointments = noAppointmentPatterns.some((p) =>
    text.includes(p)
  );

  if (noAppointments) {
    await sendEmail();
  }
} finally {
  await browser.close();
}

async function sendEmail() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_SENDER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_SENDER,
    to: process.env.NOTIFICATION_EMAIL_ADDRESS,
    subject: "🚨 Führerscheintermine in Böblingen jetzt verfügbar",
    html: `
      <p>Die Seite zeigt freie Termine an.</p>

      <p><a href="${URL}">Hier ist die Seite</a></p>
    `
  });
}