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
	systemPrompt := `تو دستیار هوشمند MonetizeAI هستی و باید به «فارسیِ روان و خودمونی» جواب بدی.

قوانین مهم:
- زبان اصلی پاسخ فارسی باشه
- در مواقع ضروری (مثل کد نویسی، نام ابزارها، آدرس وب‌سایت) از انگلیسی استفاده کن
- اعداد رو با رقم انگلیسی بنویس (1, 2, 3 نه ۱، ۲، ۳)
- هیچ‌وقت از چینی، ژاپنی، کره‌ای یا زبان‌های دیگر استفاده نکن
- فقط فارسی + انگلیسی در مواقع ضروری
- لحن خودمونی، روشن، کوتاه و کاربردی
- مرحله‌به‌مرحله و قابل اجرا راهنمایی کن
- کاربر را با «مانیتایزر عزیز» خطاب کن
- حوزه‌ها: بیزینس، مارکتینگ، فروش، و هوش مصنوعی

ماموریت: کمک عملی برای ساخت مسیر درآمد با AI، با مثال و اقدام مشخص.`

	resp, err := g.GenerateChatResponse(systemPrompt, userMessage, 4000)
	if err != nil {
		return "", err
	}
	return sanitizePersianText(resp), nil
}

// GenerateExerciseEvaluation evaluates student exercise submissions
func (g *GroqClient) GenerateExerciseEvaluation(sessionTitle, sessionDesc, videoTitle, videoDesc, submission string) (bool, string, error) {
	systemPrompt := `تو یک مربی حرفه‌ای و مهربان هستی که تمرین‌های دانشجوها رو ارزیابی می‌کنی. هدف تو کمک به پیشرفت دانشجوهاست، نه سخت‌گیری بی‌دلیل.

کاربر را با «مانیتایزر عزیز» خطاب کن.

🎯 معیارهای ارزیابی (لطفاً منصفانه و مهربان باش):
1. همخوانی با اهداف یادگیری - اگر دانشجو نشان داده که مفاهیم رو فهمیده، تایید کن
2. درک مفاهیم کلیدی - اگر حتی بخشی از مفاهیم رو درک کرده، تایید کن
3. تلاش و کوشش - اگر دانشجو تلاش کرده و پاسخ داده، حتی اگر کامل نباشه، تایید کن

✅ قوانین تایید (APPROVED: yes):
- اگر پاسخ نشان می‌دهد که دانشجو مفاهیم اصلی را فهمیده → تایید کن
- اگر پاسخ مرتبط با موضوع است و نشان می‌دهد تلاش کرده → تایید کن
- اگر پاسخ کوتاه است اما درست است → تایید کن
- اگر پاسخ ناقص است اما نشان می‌دهد درک اولیه دارد → تایید کن
- فقط اگر پاسخ کاملاً نامرتبط یا خالی است → رد کن

❌ فقط در این موارد رد کن (APPROVED: no):
- پاسخ کاملاً خالی یا نامرتبط
- هیچ تلاشی برای پاسخ دادن نشده
- پاسخ نشان می‌دهد که هیچ درکی از موضوع ندارد

⚠️ فرمت پاسخ (حتماً رعایت کن):
APPROVED: yes
FEEDBACK: [بازخورد دقیق، سازنده و کاربردی به فارسیِ خودمونی]

یا

APPROVED: no
FEEDBACK: [بازخورد دقیق، سازنده و کاربردی به فارسیِ خودمونی]

نکات مهم:
- APPROVED باید حتماً "yes" یا "no" باشه (به انگلیسی و دقیقاً همین کلمات)
- FEEDBACK باید بعد از APPROVED بیاد
- منصف باش و به دانشجو کمک کن تا پیشرفت کنه`

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

	// Log raw response for debugging
	logger.Info("Raw AI evaluation response",
		zap.String("response", response),
		zap.Int("response_length", len(response)))

	// Parse response
	approved := false
	feedback := ""

	lines := splitLines(response)
	approvedFound := false

	for _, line := range lines {
		lineTrimmed := trimSpace(line)

		// Check for APPROVED: line (must be exact format)
		if contains(lineTrimmed, "APPROVED:") {
			approvedFound = true
			// Extract the value after APPROVED:
			approvedPart := trimSpace(trimPrefix(lineTrimmed, "APPROVED:"))
			approvedPartLower := toLowerCase(approvedPart)

			// Check for yes (exact match or contains)
			if approvedPartLower == "yes" ||
				contains(approvedPartLower, "yes") ||
				approvedPart == "بله" ||
				contains(approvedPart, "بله") ||
				contains(approvedPart, "تایید") ||
				contains(approvedPart, "موفق") ||
				contains(approvedPart, "قبول") {
				approved = true
			}

			// Check for explicit no
			if approvedPartLower == "no" ||
				contains(approvedPartLower, "no") ||
				approvedPart == "خیر" ||
				contains(approvedPart, "خیر") ||
				contains(approvedPart, "رد") ||
				contains(approvedPart, "ناموفق") {
				approved = false
			}

			logger.Info("Parsed APPROVED status",
				zap.Bool("approved", approved),
				zap.String("line", lineTrimmed),
				zap.String("approved_part", approvedPart))
		} else if contains(lineTrimmed, "FEEDBACK:") {
			feedback = trimSpace(trimPrefix(lineTrimmed, "FEEDBACK:"))
			logger.Info("Parsed FEEDBACK",
				zap.String("feedback", feedback),
				zap.Int("feedback_length", len(feedback)))
		}
	}

	// If APPROVED not found, try to infer from response content
	if !approvedFound {
		logger.Warn("APPROVED: not found in response, trying to infer from content",
			zap.String("response", response))

		responseLower := toLowerCase(response)
		// If response contains positive indicators, assume approved
		if contains(responseLower, "عالی") ||
			contains(responseLower, "خوب") ||
			contains(responseLower, "موفق") ||
			contains(responseLower, "درست") ||
			contains(responseLower, "قبول") ||
			contains(response, "تبریک") ||
			contains(response, "آفرین") {
			approved = true
			logger.Info("Inferred approved from positive content")
		} else if contains(responseLower, "رد") ||
			contains(responseLower, "ناموفق") ||
			contains(responseLower, "نادرست") ||
			contains(response, "نیاز به") ||
			contains(response, "کم بود") {
			approved = false
			logger.Info("Inferred rejected from negative content")
		} else {
			// Default: if response is substantial, assume approved
			if len(response) > 50 {
				approved = true
				logger.Info("Defaulting to approved for substantial response")
			} else {
				approved = false
				logger.Info("Defaulting to rejected for short response")
			}
		}
	}

	// اگر feedback خالی بود، از کل response استفاده کن
	if feedback == "" {
		feedback = response
		logger.Info("Using full response as feedback (no FEEDBACK: found)")
	}

	// Sanitize only the feedback to enforce Persian-only output
	feedbackBeforeSanitize := feedback
	feedback = sanitizePersianText(feedback)
	if feedback == "" {
		feedback = "خروجی پاکسازی شد. لطفاً دوباره به فارسی روان ارسال کن."
		logger.Warn("Feedback was completely sanitized away",
			zap.String("original", feedbackBeforeSanitize))
	}

	logger.Info("Final evaluation result",
		zap.Bool("approved", approved),
		zap.Int("feedback_length", len(feedback)))

	return approved, feedback, nil
}

// GenerateBusinessBuilderResponse generates response for Business Builder AI
func (g *GroqClient) GenerateBusinessBuilderResponse(userMessage string) (string, error) {
	systemPrompt := `تو مشاور بیزینس هستی و باید فقط به فارسیِ روان و خودمونی جواب بدی.
کاربر را با «مانیتایزر عزیز» خطاب کن.

ویژگی‌ها:
- تحلیل دقیق و عملی
- پیشنهاد مرحله‌به‌مرحله
- تمرکز بر اجرای واقعی ایده‌ها`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateSellKitResponse generates response for SellKit AI
func (g *GroqClient) GenerateSellKitResponse(userMessage string) (string, error) {
	systemPrompt := `تو متخصص فروش و مارکتینگ هستی و فقط به فارسیِ روان و خودمونی جواب می‌دی.
کاربر را با «مانیتایزر عزیز» خطاب کن.

ویژگی‌ها:
- استراتژی‌های عملی
- تکنیک‌های قابل اجرا
- راهنمایی قدم‌به‌قدم`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateClientFinderResponse generates response for ClientFinder AI
func (g *GroqClient) GenerateClientFinderResponse(userMessage string) (string, error) {
	systemPrompt := `تو متخصص جذب مشتری هستی و باید فقط به فارسیِ روان و خودمونی جواب بدی.
کاربر را با «مانیتایزر عزیز» خطاب کن.

ویژگی‌ها:
- شناسایی دقیق مشتری هدف
- استراتژی‌های جذب مشتری
- انتخاب کانال‌های مؤثر`

	return g.GenerateChatResponse(systemPrompt, userMessage, 4000)
}

// GenerateSalesPathResponse generates response for SalesPath AI
func (g *GroqClient) GenerateSalesPathResponse(userMessage string) (string, error) {
	systemPrompt := `تو مشاور مسیر فروش هستی و باید فقط به فارسیِ روان و خودمونی جواب بدی.
کاربر را با «مانیتایزر عزیز» خطاب کن.

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

func sanitizePersianText(s string) string {
	out := make([]rune, 0, len(s))
	lastSpace := false
	for _, r := range s {
		if isAllowedPersianRune(r) {
			// collapse consecutive spaces
			if r == ' ' {
				if lastSpace {
					continue
				}
				lastSpace = true
			} else {
				if r != '\n' && r != '\t' && r != '\r' {
					lastSpace = false
				}
			}
			out = append(out, r)
		}
	}
	return string(out)
}

func isAllowedPersianRune(r rune) bool {
	// Persian/Arabic letters and marks
	if (r >= 0x0600 && r <= 0x06FF) || // Arabic block (includes Persian letters and punctuation like ، ؛ ؟)
		(r >= 0x0750 && r <= 0x077F) || // Arabic Supplement
		(r >= 0x08A0 && r <= 0x08FF) { // Arabic Extended-A
		return true
	}
	// Arabic Presentation Forms (punctuation variants)
	if (r >= 0xFB50 && r <= 0xFDFF) || (r >= 0xFE70 && r <= 0xFEFF) {
		return true
	}
	// Persian digits ۰-۹ and Arabic-Indic digits ٠-٩
	if (r >= 0x06F0 && r <= 0x06F9) || (r >= 0x0660 && r <= 0x0669) {
		return true
	}
	// English digits 0-9 (for numbers and code)
	if r >= '0' && r <= '9' {
		return true
	}
	// English letters A-Z, a-z (for code, technical terms, URLs)
	if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
		return true
	}
	// ZWNJ
	if r == 0x200C {
		return true
	}
	// Common whitespace
	if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
		return true
	}
	// Allow extended punctuation and symbols for code and technical content
	switch r {
	case '.', ',', '!', '?', ':', ';', '(', ')', '[', ']', '{', '}', '«', '»', '"', '\'', '-', '_', '%', '+', '=', '/', '\\', '…',
		'<', '>', '|', '&', '*', '^', '~', '`', '@', '#', '$':
		return true
	}
	return false
}
