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

export const sendWelcomeEmail = async (email, name) => {
  const recipient = email;

  try {
    const response = await transport.sendMail({
      from: sender,
      to: recipient,
      subject: "Welcome to RVnBo.com",
      html: `<p>Dear ${name},</p>
                 <p>Welcome to RVnBo.com! We are thrilled to have you on board.</p>
                 <p>Thank you for joining us!</p>
                 <p>Best regards,<br>The RVnBo Team</p>`,
      template_variables: {
        company_info_name: "RVnBo.com",
        name: name,
      },
    });

    console.log(`Welcome email sent successfully to ${email}:`, response);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email: " + error.message);
  }
};
