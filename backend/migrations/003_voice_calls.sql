CREATE TABLE IF NOT EXISTS voice_participants (
 demand_id TEXT NOT NULL REFERENCES demands(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 session_id TEXT NOT NULL,
 track_name TEXT,
 active INTEGER NOT NULL DEFAULT 1,
 joined TEXT NOT NULL,
 updated INTEGER NOT NULL,
 PRIMARY KEY (demand_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_voice_participants_demand ON voice_participants(demand_id,active,updated);
