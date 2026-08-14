-- Promote global user role to ADMIN (so JWT will contain role=ADMIN)
UPDATE users SET role = 'ADMIN' WHERE email = 'sse@opspilot.dev' RETURNING id, email, role;
