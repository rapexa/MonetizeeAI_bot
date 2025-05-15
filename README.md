# MonetizeeAI Bot 🤖

A powerful Telegram bot for managing and delivering educational content, built with Go. This bot provides a comprehensive platform for course management, user progress tracking, and administrative controls.

## 🌟 Features

### For Users
- 📚 Access to course sessions and content
- 🎥 Video lessons management
- ✍️ Exercise submission and tracking
- 📊 Progress monitoring
- 💬 Interactive learning experience

### For Administrators
- 👥 User management system
- 📊 Comprehensive statistics
- 📚 Course content management
- 🎥 Video content management
- 📝 System logs and monitoring
- 💾 Backup functionality

## 🛠️ Technical Stack

- **Language**: Go
- **Database**: MySQL
- **Telegram API**: go-telegram-bot-api
- **ORM**: GORM
- **Environment**: godotenv

## 📋 Project Structure

```
├── main.go              # Application entry point
├── models.go            # Database models
├── handlers.go          # User message handlers
├── admin_handlers.go    # Admin-specific handlers
├── admin_actions.go     # Admin action implementations
├── stats.go            # Statistics and reporting
├── backup.go           # Backup functionality
├── admin_setup.sql     # Admin database setup
└── commands.sql        # SQL commands and queries
```

## 🚀 Getting Started

### Prerequisites

- Go 1.16 or higher
- MySQL 5.7 or higher
- Telegram Bot Token

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/MonetizeeAI_bot.git
cd MonetizeeAI_bot
```

2. Install dependencies:
```bash
go mod download
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
mysql -u your_username -p your_database < commands.sql
mysql -u your_username -p your_database < admin_setup.sql
```

5. Build and run:
```bash
go build
./bot
```


## 📚 Usage

### User Commands
- `/start` - Start the bot and get welcome message
- `/help` - Get help and instructions
- `/progress` - Check your learning progress
- `/current` - View current session
- `/next` - Move to next session
- `/previous` - Go to previous session

### Admin Commands
- `/admin_stats` - View system statistics
- `/admin_users` - Manage users
- `/admin_sessions` - Manage course sessions
- `/admin_videos` - Manage video content
- `/admin_logs` - View system logs

## 🔐 Security

- Admin authentication system
- User session management
- Secure database operations
- Input validation and sanitization

## 📊 Database Schema

The bot uses several key tables:
- Users
- Sessions
- Videos
- Exercises
- UserProgress
- AdminActions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Telegram Bot API
- Go Telegram Bot API library
- GORM
- All contributors and supporters

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Made with ❤️ by Ambridge Team
