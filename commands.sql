-- Create the database
CREATE DATABASE IF NOT EXISTS monetizeeai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create new user and grant privileges
CREATE USER IF NOT EXISTS 'monetizeeai_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON monetizeeai.* TO 'monetizeeai_user'@'localhost';
FLUSH PRIVILEGES;

-- Use the database
USE monetizeeai;

-- Create users table (GORM will handle this, but here's the structure for reference)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    telegram_id BIGINT UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    current_session INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    number INT UNIQUE,
    title VARCHAR(255),
    description TEXT
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    title VARCHAR(255),
    description TEXT,
    date TIMESTAMP,
    video_link VARCHAR(512),
    session_id BIGINT UNSIGNED,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    user_id BIGINT UNSIGNED,
    session_id BIGINT UNSIGNED,
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    feedback TEXT,
    submitted_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Create user_sessions table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_sessions (
    user_id BIGINT UNSIGNED,
    session_id BIGINT UNSIGNED,
    PRIMARY KEY (user_id, session_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Insert some sample sessions
INSERT INTO sessions (number, title, description) VALUES
(1, 'Introduction to MonetizeAI', 'Learn the basics of monetizing AI and setting up your business'),
(2, 'Finding Your Niche', 'Discover how to identify profitable AI business opportunities'),
(3, 'Building Your Service', 'Learn how to create and structure your AI service offering'),
(4, 'Marketing and Sales', 'Master the art of selling your AI services');

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_session_id ON exercises(session_id);
CREATE INDEX idx_videos_session_id ON videos(session_id); 