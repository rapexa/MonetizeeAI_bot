# MonetizeAI Telegram Bot

A specialized Telegram bot designed to support students of the MonetizeAI course, providing an interactive learning experience with AI-powered feedback and guidance. This bot helps users build a real income-generating system using AI in just 14 days.

## 🌟 Key Features

- 📚 **Session-based Course Delivery**
  - Structured 14-day learning path
  - Step-by-step guidance
  - Interactive session management
  - Progress tracking per session

- ✅ **Exercise Management**
  - Submit exercises for each session
  - AI-powered feedback system
  - Exercise status tracking
  - Revision suggestions

- 📊 **Progress Tracking**
  - Real-time progress monitoring
  - Session completion status
  - Exercise completion rates
  - Overall course progress

- 🤖 **AI Integration**
  - OpenAI-powered feedback
  - Intelligent exercise review
  - Personalized suggestions
  - Learning path optimization

- 🎥 **Content Management**
  - Video content integration
  - Session-specific materials
  - Easy content access
  - Structured learning resources

- 📱 **User Experience**
  - Glass-style button design
  - Intuitive navigation
  - Responsive interface
  - Clear progress indicators

## 🛠️ Technical Stack

- **Backend**: Go 1.21+
- **Database**: MySQL 5.7+
- **ORM**: GORM
- **API Integration**: 
  - Telegram Bot API
  - OpenAI API
- **Environment**: Docker-ready

## 📋 Prerequisites

- Go 1.21 or higher
- MySQL 5.7 or higher
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- OpenAI API Key
- Git

## 🚀 Setup Instructions

1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/monetizeeai-bot.git
cd monetizeeai-bot
```

2. **Install Dependencies**
```bash
go mod download
```

3. **Environment Configuration**
Create a `.env` file in the root directory:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
MYSQL_DSN=root:password@tcp(127.0.0.1:3306)/monetizeeai?charset=utf8mb4&parseTime=True&loc=Local
DEBUG=true
PORT=8080
```

4. **Database Setup**
```sql
CREATE DATABASE monetizeeai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Run the database migrations:
```bash
mysql -u root -p < commands.sql
```

5. **Run the Application**
```bash
go run .
```

## 📁 Project Structure

```
monetizeeai-bot/
├── main.go           # Application entry point
├── models.go         # Database models
├── handlers.go       # Message handlers
├── commands.sql      # Database setup
├── .env             # Environment variables
├── go.mod           # Go dependencies
└── README.md        # Documentation
```

## 💾 Database Schema

The bot uses the following main entities:

- **Users**
  - Telegram user information
  - Course progress tracking
  - Session management
  - Exercise submissions

- **Sessions**
  - Course content structure
  - Learning materials
  - Exercise requirements
  - Progress tracking

- **Videos**
  - Course video content
  - Session-specific materials
  - Learning resources
  - Content organization

- **Exercises**
  - User submissions
  - Feedback system
  - Progress tracking
  - Status management

## 🔄 Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Code Style

- Follow Go standard formatting
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small
- Write unit tests for new features

## 🔍 Testing

```bash
# Run all tests
go test ./...

# Run specific test
go test ./... -run TestName
```

## 📈 Performance Considerations

- Database indexes for frequent queries
- Efficient message handling
- Optimized database queries
- Proper error handling
- Resource cleanup

## 🔒 Security

- Environment variable protection
- API key security
- Database access control
- Input validation
- Error message sanitization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.
