const nodemailer = require("nodemailer");

const sendNodeMailerMail = async ({
    recipient,
    sender,
    subject,
    html,
    attachments
}) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: 'johndoeatconvoverse@gmail.com',
                pass: 'ezcssyzzfnnojulh',
            },
        });

        const info = await transporter.sendMail({
            from: sender || 'johndoeatconvoverse@gmail.com',
            to: recipient,
            subject,
            html: html,
            attachments,
        });

        console.log("Message sent: " + info.messageId);
    } catch (error) {
        console.log(error);
    }
};

exports.sendEmail = async (args) => {
    if (process.env.NODE_ENV === "development") {
        return Promise.resolve();
    } else {
        return sendNodeMailerMail(args);
    }
};

