const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(mobileNumber, message) {
  try {
    // clean spaces and symbols
    let cleanedNumber = mobileNumber.toString().trim().replace(/\s+/g, "");

    // add +91 if user enters only 10-digit Indian number
    if (!cleanedNumber.startsWith("+")) {
      cleanedNumber = `+91${cleanedNumber}`;
    }

    console.log("Sending SMS to:", cleanedNumber);

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: cleanedNumber
    });

    console.log("SMS sent successfully");
    console.log("SID:", result.sid);
    console.log("To:", result.to);
    console.log("Status:", result.status);

    return result;
  } catch (error) {
    console.error("SMS sending failed:", error.message);
    throw error;
  }
}

module.exports = sendSMS;