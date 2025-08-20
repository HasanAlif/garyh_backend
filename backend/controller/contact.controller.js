import { transport, sender } from "../mailtrap/mailtrap.config.js";

export const handleContactFormSubmission = async (req, res) => {
  const { name, subject, message } = req.body;

  if (!name || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "Please Login First" });
  }

  const email = req.user.email;
  const recipient = "alifalmehedihasan2@gmail.com"; // Replace with your admin email

  try {
    const response = await transport.sendMail({
      from: sender,
      to: recipient,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Message</h2>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 5px;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>User Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <div style="margin-top: 20px;">
              <strong>Message:</strong>
              <p style="background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">
                ${message}
              </p>
            </div>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This message was sent from your website's contact form.
          </p>
        </div>
      `,
      category: "Contact Form",
    });

    console.log(
      `Contact form email sent successfully from ${email}:`,
      response
    );

    res.status(200).json({
      success: true,
      message: "Thank you for your message! We'll get back to you soon.",
    });
  } catch (error) {
    console.error("Error sending contact form email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message. Please try again later.",
    });
  }
};
