UPDATE users SET "isVerified"=true WHERE email='sse@opspilot.dev' RETURNING id, email, "isVerified";
