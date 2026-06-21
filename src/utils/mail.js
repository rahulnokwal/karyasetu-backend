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

export const invitationMailTemplate = (
  targetEmail,
  invitationUrl,
  invitedByName,
  workspaceName,
  role
) => {
  return {
    body: {
      name: targetEmail,
      intro: `You have been invited by **${invitedByName}** to join a workspace.`,
      dictionary: {
        Workspace: workspaceName,
        "Invited By": invitedByName,
        "Assigned Role": role,
      },
      action: {
        instructions:
          "To accept this invitation and join the team, please click the button below. This link will expire in 48 hours.",
        button: {
          color: "#4F46E5",
          text: "Accept Invitation",
          link: invitationUrl,
        },
      },
      outro:
        "If you do not know this person or did not expect this invitation, you can safely ignore this email.",
    },
  };
};
