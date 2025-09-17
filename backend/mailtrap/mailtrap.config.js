import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create the transport configuration
export const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Export sender information
export const sender = {
  address: "alifalmehedihasan2@gmail.com",
  name: "RVnBo.com",
};

const emailSender = async (email, html, subject) => {
  const info = await transport.sendMail({
    from: sender.address,
    to: email,
    subject: subject,
    html,
  });
};

export default emailSender;
