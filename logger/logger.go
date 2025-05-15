package logger

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// InitLogger initializes the logger with both file and console output
func InitLogger() {
	// Create a custom encoder config
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "timestamp",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "msg",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.CapitalLevelEncoder,
		EncodeTime:     zapcore.TimeEncoderOfLayout(time.RFC3339),
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	// Create a file core
	file, err := os.OpenFile("logs/bot.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		panic("Failed to open log file: " + err.Error())
	}

	// Create cores for both file and console output
	fileCore := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.AddSync(file),
		zapcore.InfoLevel,
	)

	consoleCore := zapcore.NewCore(
		zapcore.NewConsoleEncoder(encoderConfig),
		zapcore.AddSync(os.Stdout),
		zapcore.InfoLevel,
	)

	// Create the logger with both cores
	core := zapcore.NewTee(fileCore, consoleCore)
	Log = zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
}

// Sync flushes any buffered log entries
func Sync() {
	if Log != nil {
		Log.Sync()
	}
}

// WithFields creates a child logger with the given fields
func WithFields(fields ...zap.Field) *zap.Logger {
	return Log.With(fields...)
}

// Info logs a message at Info level
func Info(msg string, fields ...zap.Field) {
	Log.Info(msg, fields...)
}

// Error logs a message at Error level
func Error(msg string, fields ...zap.Field) {
	Log.Error(msg, fields...)
}

// Debug logs a message at Debug level
func Debug(msg string, fields ...zap.Field) {
	Log.Debug(msg, fields...)
}

// Warn logs a message at Warn level
func Warn(msg string, fields ...zap.Field) {
	Log.Warn(msg, fields...)
}

// Fatal logs a message at Fatal level then calls os.Exit(1)
func Fatal(msg string, fields ...zap.Field) {
	Log.Fatal(msg, fields...)
}
