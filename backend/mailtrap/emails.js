import { transport, sender } from "./mailtrap.config.js";
import { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates.js";

export const sendVerificationEmail = async (email, verificationToken) => {
  const recipient = email;

  try {
    const response = await transport.sendMail({
      from: sender,
      to: recipient,
      subject: "Verify Your Email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        "{verificationCode}",
        verificationToken
      ),
      category: "Verification Email",
    });

    console.log(`Email sent successfully to ${email}:`, response);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email: " + error.message);
  }
};
