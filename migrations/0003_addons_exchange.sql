-- Old-appliance exchange requests captured at checkout (JSON, '' if none).
ALTER TABLE orders ADD COLUMN exchange_json TEXT NOT NULL DEFAULT '';

-- Mobile sign-in and guest checkout. Additive only: rebuilding `users`
-- would cascade-delete sessions and addresses. Accounts without a real
-- email carry a reserved placeholder (…@users.galvio.invalid, the .invalid
-- TLD can never receive mail), so users.email stays NOT NULL UNIQUE.
ALTER TABLE users ADD COLUMN login_phone TEXT;
ALTER TABLE users ADD COLUMN guest INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX users_login_phone ON users (login_phone) WHERE login_phone IS NOT NULL;
