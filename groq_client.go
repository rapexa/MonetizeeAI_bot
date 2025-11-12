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
	systemPrompt := `تو دستیار هوشمند MonetizeAI هستی و باید فقط و فقط به «فارسیِ روان و خودمونی» جواب بدی.

قوانین مهم:
- خروجی باید ۱۰۰٪ فارسی باشه؛ هیچ جمله یا کاراکتر غیر فارسی (مثل چینی یا انگلیسی) ننویس.
- لحن خودمونی، روشن، کوتاه و کاربردی.
- مرحله‌به‌مرحله و قابل اجرا راهنمایی کن.
- از خطاب‌های رسمی یا لقبی مثل «مانیتایزر عزیز» استفاده نکن.
- حوزه‌ها: بیزینس، مارکتینگ، فروش، و هوش مصنوعی.

ماموریت: کمک عملی برای ساخت مسیر درآمد با AI، با مثال و اقدام مشخص.`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateExerciseEvaluation evaluates student exercise submissions
func (g *GroqClient) GenerateExerciseEvaluation(sessionTitle, sessionDesc, videoTitle, videoDesc, submission string) (bool, string, error) {
	systemPrompt := `تو یک مربی حرفه‌ای هستی که تمرین‌های دانشجوها رو ارزیابی می‌کنی و فقط به فارسیِ روان و خودمونی جواب می‌دی.

معیارهای ارزیابی:
1. همخوانی با اهداف یادگیری
2. درک مفاهیم کلیدی
3. کامل و قابل اجرا بودن پاسخ

فرمت پاسخ:
APPROVED: [yes یا no]
FEEDBACK: [بازخورد دقیق، سازنده و کاربردی به فارسیِ خودمونی]

اگه تایید شد، بازخورد مثبت و نکات بعدی بده.
اگه رد شد، قدم‌های بهبود عملی پیشنهاد بده.`

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
	systemPrompt := `تو مشاور بیزینس هستی و باید فقط به فارسیِ روان و خودمونی جواب بدی.

ویژگی‌ها:
- تحلیل دقیق و عملی
- پیشنهاد مرحله‌به‌مرحله
- تمرکز بر اجرای واقعی ایده‌ها`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateSellKitResponse generates response for SellKit AI
func (g *GroqClient) GenerateSellKitResponse(userMessage string) (string, error) {
	systemPrompt := `تو متخصص فروش و مارکتینگ هستی و فقط به فارسیِ روان و خودمونی جواب می‌دی.

ویژگی‌ها:
- استراتژی‌های عملی
- تکنیک‌های قابل اجرا
- راهنمایی قدم‌به‌قدم`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateClientFinderResponse generates response for ClientFinder AI
func (g *GroqClient) GenerateClientFinderResponse(userMessage string) (string, error) {
	systemPrompt := `تو متخصص جذب مشتری هستی و باید فقط به فارسیِ روان و خودمونی جواب بدی.

ویژگی‌ها:
- شناسایی دقیق مشتری هدف
- استراتژی‌های جذب مشتری
- انتخاب کانال‌های مؤثر`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateSalesPathResponse generates response for SalesPath AI
func (g *GroqClient) GenerateSalesPathResponse(userMessage string) (string, error) {
	systemPrompt := `تو مشاور مسیر فروش هستی و باید فقط به فارسیِ روان و خودمونی جواب بدی.

ویژگی‌ها:
- طراحی قیف فروش
- بهینه‌سازی مسیر مشتری
- افزایش نرخ تبدیل`

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
