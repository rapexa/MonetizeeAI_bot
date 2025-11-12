package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"MonetizeeAI_bot/logger"

	openai "github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// GroqClient handles all Groq API interactions
type GroqClient struct {
	client *openai.Client
}

// NewGroqClient creates a new Groq client instance
func NewGroqClient() *GroqClient {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		logger.Error("GROQ_API_KEY environment variable not set")
		return nil
	}

	config := openai.DefaultConfig(apiKey)
	config.BaseURL = "https://api.groq.com/openai/v1"
	
	client := openai.NewClientWithConfig(config)
	
	logger.Info("Groq client initialized successfully",
		zap.String("base_url", config.BaseURL))
	
	return &GroqClient{
		client: client,
	}
}

// GenerateChatResponse generates a chat response using Groq Llama 3.3 70B
func (g *GroqClient) GenerateChatResponse(systemPrompt, userMessage string, maxTokens int) (string, error) {
	if g == nil || g.client == nil {
		return "", fmt.Errorf("groq client not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()
	
	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: userMessage,
		},
	}
	
	resp, err := g.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:       "llama-3.3-70b-versatile", // بهترین مدل برای کیفیت بالا
			Messages:    messages,
			MaxTokens:   maxTokens,
			Temperature: 0.7,
		},
	)
	
	if err != nil {
		logger.Error("Groq API error",
			zap.Error(err),
			zap.String("model", "llama-3.3-70b-versatile"))
		return "", fmt.Errorf("groq API error: %v", err)
	}
	
	if len(resp.Choices) == 0 {
		logger.Error("No response from Groq API")
		return "", fmt.Errorf("no response from Groq")
	}
	
	response := resp.Choices[0].Message.Content
	
	logger.Info("Groq response received",
		zap.Int("response_length", len(response)),
		zap.String("model", "llama-3.3-70b-versatile"))
	
	return response, nil
}

// GenerateMonetizeAIResponse generates response for MonetizeAI bot users
func (g *GroqClient) GenerateMonetizeAIResponse(userMessage string) (string, error) {
	systemPrompt := `تو یک دستیار هوشمند MonetizeAI هستی که به کاربران کمک می‌کنی تا با هوش مصنوعی درآمد دلاری کسب کنند.

ویژگی‌های تو:
- همیشه به فارسی پاسخ می‌دهی
- پاسخ‌هایت عملی، مرحله‌به‌مرحله و قابل اجرا هستند
- کاربران رو با عنوان "مانیتایزر عزیز" خطاب می‌کنی
- در زمینه‌های بیزینس، مارکتینگ، فروش و هوش مصنوعی تخصص داری
- پاسخ‌هایت مختصر، مفید و انگیزه‌بخش هستند

مأموریت تو: کمک به کاربران برای ساختن مسیر درآمد دلاری با AI`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateExerciseEvaluation evaluates student exercise submissions
func (g *GroqClient) GenerateExerciseEvaluation(sessionTitle, sessionDesc, videoTitle, videoDesc, submission string) (bool, string, error) {
	systemPrompt := `تو یک مربی حرفه‌ای هستی که تمرین‌های دانشجویان رو ارزیابی می‌کنی.

معیارهای ارزیابی:
1. آیا پاسخ با اهداف یادگیری همخوانی دارد؟
2. آیا دانشجو مفاهیم کلیدی را درک کرده؟
3. آیا پاسخ کامل و جامع است؟

فرمت پاسخ:
APPROVED: [yes یا no]
FEEDBACK: [بازخورد دقیق و سازنده به فارسی]

اگر تایید کردی، بازخورد مثبت و انگیزه‌بخش بده.
اگر رد کردی، راهنمایی‌های عملی برای بهبود ارائه کن.`

	userPrompt := fmt.Sprintf(`عنوان جلسه: %s
توضیحات جلسه: %s
عنوان ویدیو: %s
توضیحات ویدیو: %s

تمرین ارسالی دانشجو:
%s

لطفا این تمرین را ارزیابی کن.`, sessionTitle, sessionDesc, videoTitle, videoDesc, submission)

	response, err := g.GenerateChatResponse(systemPrompt, userPrompt, 2000)
	if err != nil {
		return false, "", err
	}
	
	// Parse response
	approved := false
	feedback := ""
	
	lines := splitLines(response)
	for _, line := range lines {
		if contains(line, "APPROVED:") {
			approved = contains(toLowerCase(line), "yes")
		} else if contains(line, "FEEDBACK:") {
			feedback = trimSpace(trimPrefix(line, "FEEDBACK:"))
		}
	}
	
	// اگر feedback خالی بود، از کل response استفاده کن
	if feedback == "" {
		feedback = response
	}
	
	return approved, feedback, nil
}

// GenerateBusinessBuilderResponse generates response for Business Builder AI
func (g *GroqClient) GenerateBusinessBuilderResponse(userMessage string) (string, error) {
	systemPrompt := `تو یک مشاور بیزینس حرفه‌ای هستی که به کاربران کمک می‌کنی ایده‌های تجاری خود را توسعه دهند.

ویژگی‌ها:
- تحلیل دقیق و عملی
- پیشنهادات مرحله‌به‌مرحه
- تمرکز بر عملی بودن ایده‌ها
- پاسخ به فارسی`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateSellKitResponse generates response for SellKit AI
func (g *GroqClient) GenerateSellKitResponse(userMessage string) (string, error) {
	systemPrompt := `تو یک متخصص فروش و بازاریابی هستی که به کاربران کمک می‌کنی محصولات و خدمات خود را بهتر بفروشند.

ویژگی‌ها:
- استراتژی‌های فروش عملی
- تکنیک‌های بازاریابی مؤثر
- راهنمایی قدم‌به‌قدم
- پاسخ به فارسی`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateClientFinderResponse generates response for ClientFinder AI
func (g *GroqClient) GenerateClientFinderResponse(userMessage string) (string, error) {
	systemPrompt := `تو یک متخصص جذب مشتری هستی که به کاربران کمک می‌کنی مشتریان هدف خود را پیدا و جذب کنند.

ویژگی‌ها:
- شناسایی مشتریان هدف
- استراتژی‌های جذب مشتری
- کانال‌های موثر بازاریابی
- پاسخ به فارسی`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateSalesPathResponse generates response for SalesPath AI
func (g *GroqClient) GenerateSalesPathResponse(userMessage string) (string, error) {
	systemPrompt := `تو یک مشاور مسیر فروش هستی که به کاربران کمک می‌کنی یک قیف فروش موثر بسازند.

ویژگی‌ها:
- طراحی قیف فروش
- بهینه‌سازی مسیر مشتری
- افزایش نرخ تبدیل
- پاسخ به فارسی`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// Helper functions
func splitLines(s string) []string {
	lines := []string{}
	current := ""
	for _, char := range s {
		if char == '\n' {
			if current != "" {
				lines = append(lines, current)
			}
			current = ""
		} else {
			current += string(char)
		}
	}
	if current != "" {
		lines = append(lines, current)
	}
	return lines
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && findSubstring(s, substr) >= 0
}

func findSubstring(s, substr string) int {
	if len(substr) == 0 {
		return 0
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

func toLowerCase(s string) string {
	result := ""
	for _, char := range s {
		if char >= 'A' && char <= 'Z' {
			result += string(char + 32)
		} else {
			result += string(char)
		}
	}
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	
	return s[start:end]
}

func trimPrefix(s, prefix string) string {
	if len(s) >= len(prefix) {
		match := true
		for i := 0; i < len(prefix); i++ {
			if s[i] != prefix[i] {
				match = false
				break
			}
		}
		if match {
			return s[len(prefix):]
		}
	}
	return s
}
