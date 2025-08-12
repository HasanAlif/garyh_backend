import Nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.MAILTRAP_TOKEN;

export const transport = Nodemailer.createTransport({
  // MailtrapTransport({
  //   token: TOKEN,
  // })
  //This part will use when we have website domain

  host: 'xlkek09txz.houseoffoss.net',
  port: 1025,
  auth:{
    user: "user1",
    pass: "password1"
  }
});

export const sender = {
  address: "hello@demomailtrap.co",
  name: "Mailtrap Test",
};


// const recipients = [
//   "alifalmehedihasan2@gmail.com",
// ];

// transport
//   .sendMail({
//     from: sender,
//     to: recipients,
//     subject: "You are awesome!",
//     text: "Congrats for sending test email with Mailtrap!",
//     category: "Integration Test",
//   })
//   .then(console.log, console.error);