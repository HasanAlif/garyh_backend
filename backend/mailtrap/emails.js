import { transport, sender } from "./mailtrap.config.js";
import {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
} from "./emailTemplates.js";

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

export const sendPasswordResetEmail = async (email, resetCode) => {
  const recipient = email;

  try {
    const response = await transport.sendMail({
      from: sender,
      to: recipient,
      subject: "Password Reset Verification Code",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetCode}", resetCode),
      category: "Password Reset",
    });

    console.log(
      `Password reset email sent successfully to ${email}:`,
      response
    );
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email: " + error.message);
  }
};

export const sendResetSuccessEmail = async (email) => {
  const recipient = email;

  try {
    const response = await transport.sendMail({
      from: sender,
      to: recipient,
      subject: "Password Reset Successful",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
      category: "Password Reset Success",
    });

    console.log(
      `Password reset success email sent successfully to ${email}:`,
      response
    );
  } catch (error) {
    console.error("Error sending password reset success email:", error);
    throw new Error(
      "Failed to send password reset success email: " + error.message
    );
  }
};
