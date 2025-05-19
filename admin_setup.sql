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

-- Create admin table
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create admin actions log table
CREATE TABLE IF NOT EXISTS admin_actions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    target_type VARCHAR(50),
    target_id BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Create backups table
CREATE TABLE IF NOT EXISTS backups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (created_by_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_admin_telegram_id ON admins(telegram_id);
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX idx_backups_created_at ON backups(created_at);

-- Insert default admin user (replace with actual values)
INSERT INTO admins (telegram_id, username, first_name, last_name, role)
VALUES (7403868937, '@mohammadGarehbagh', 'Mohammad', 'Gharehbagh', 'super_admin')
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    role = VALUES(role); 

-- Insert default admin user (replace with actual values)
INSERT INTO admins (telegram_id, username, first_name, last_name, role)
VALUES (1038044314, '@hoseinabasiann', 'Hosein', 'َAdmin', 'super_admin')
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    role = VALUES(role); 