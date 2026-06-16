import Mailgen from "mailgen";
import nodemailer from "nodemailer";

export const sendEmailToUser = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "KaryaSetu",
      link: "https://karyasetu.app",
    },
  });

  const htmlMail = mailGenerator.generate(options.mail);
  const textualMail = mailGenerator.generatePlaintext(options.mail);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD,
    },
  });

  const mail = {
    from: "karyasetu@gmail.com",
    to: options.email,
    subject: options.subject,
    text: textualMail,
    html: htmlMail,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      "Non-fatal: Failed to send verification email during registration",
      error
    );
  }
};

export const emailVerificationMailTemplate = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to KaryaSetu! We're excited to have you on board.",
      action: {
        instructions:
          "To verify your email and activate your account, please click the button below.",
        button: {
          color: "#22BC66",
          text: "Verify your account",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export const forgetPasswordMailTemplate = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro:
        "We received a request to reset the password for your KaryaSetu account.",
      action: {
        instructions: "To reset your password, please click the button below.",
        button: {
          color: "#FF5A5F",
          text: "Reset your password",
          link: passwordResetUrl,
        },
      },
      outro:
        "If you did not request a password reset, no further action is required and you can safely ignore this email.",
    },
  };
};
