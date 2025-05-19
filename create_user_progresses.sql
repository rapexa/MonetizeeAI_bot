-- Create user_progresses table
CREATE TABLE IF NOT EXISTS user_progresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_session (user_id, session_id)
);

-- Add index for better performance
CREATE INDEX idx_user_progresses_user_id ON user_progresses(user_id);
CREATE INDEX idx_user_progresses_session_id ON user_progresses(session_id); 