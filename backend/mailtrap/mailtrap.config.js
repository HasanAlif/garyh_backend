import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create the transport configuration
export const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "alifalmehedihasan2@gmail.com",
    pass: "bpfkazkhtzfqfank",
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
