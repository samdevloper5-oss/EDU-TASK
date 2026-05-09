const env = require("../config/env");

async function sendVerificationEmail(email, token) {
    const verificationLink = `${env.frontendUrl || "http://localhost:3000"}/verify-email?token=${token}`;

    console.log("-----------------------------------------");
    console.log(`Sending Verification Email to: ${email}`);
    console.log(`Verification Token: ${token}`);
    console.log(`Link: ${verificationLink}`);
    console.log("-----------------------------------------");

    // In production, integration with NodeMailer, SendGrid, etc. would go here.
    return true;
}

module.exports = {
    sendVerificationEmail,
};
