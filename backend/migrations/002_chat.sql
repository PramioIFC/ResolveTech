CREATE TABLE IF NOT EXISTS conversations (
 demand_id TEXT PRIMARY KEY REFERENCES demands(id),
 phase TEXT NOT NULL DEFAULT 'AI' CHECK(phase IN ('AI','AWAITING_FEEDBACK','SUPPORT','RESOLVED')),
 category TEXT NOT NULL,
 guidance TEXT NOT NULL DEFAULT '',
 summary TEXT NOT NULL DEFAULT '',
 missing TEXT NOT NULL DEFAULT '[]',
 ai_consent INTEGER NOT NULL DEFAULT 0,
 satisfaction INTEGER,
 pending_id TEXT,
 pending_since INTEGER,
 created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
 id TEXT PRIMARY KEY,
 demand_id TEXT NOT NULL REFERENCES conversations(demand_id),
 role TEXT NOT NULL CHECK(role IN ('user','assistant','support','system')),
 content TEXT NOT NULL,
 actor_id TEXT REFERENCES users(id),
 source TEXT NOT NULL,
 reply_to TEXT UNIQUE REFERENCES chat_messages(id),
 created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_demand_created ON chat_messages(demand_id,created,id);
CREATE TABLE IF NOT EXISTS issue_guidance (
 issue_id TEXT PRIMARY KEY REFERENCES issue_types(id),
 instructions TEXT NOT NULL DEFAULT ''
);
