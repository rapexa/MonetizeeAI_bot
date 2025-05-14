package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-echarts/go-echarts/v2/charts"
	"github.com/go-echarts/go-echarts/v2/opts"
	"github.com/go-echarts/go-echarts/v2/types"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

// generateAndSendStats generates and sends system statistics
func generateAndSendStats(admin *Admin) {
	// Send the text statistics
	sendTextStatistics(admin)
}

// handleChartCallback handles chart generation requests
func handleChartCallback(admin *Admin, chartType string) {
	// Send "preparing" message
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("📊 نمودار %s در حال آماده‌سازی...", getChartName(chartType)))
	bot.Send(msg)

	// Generate chart
	var chart interface{}
	var err error
	switch chartType {
	case "users":
		chart, err = generateUserStats()
	case "sessions":
		chart, err = generateSessionStats()
	case "videos":
		chart, err = generateVideoStats()
	case "exercises":
		chart, err = generateExerciseStats()
	default:
		sendMessage(admin.TelegramID, "❌ نوع نمودار نامعتبر")
		return
	}

	if err != nil {
		sendMessage(admin.TelegramID, fmt.Sprintf("❌ خطا در ایجاد نمودار: %v", err))
		return
	}

	// Create charts directory if it doesn't exist
	chartsDir := "charts"
	if err := os.MkdirAll(chartsDir, 0755); err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ایجاد پوشه نمودارها")
		return
	}

	// Generate HTML file first
	htmlFile := filepath.Join(chartsDir, fmt.Sprintf("%s_stats_%s.html", chartType, time.Now().Format("20060102_150405")))

	// Save chart as HTML
	switch c := chart.(type) {
	case *charts.Line:
		f, err := os.Create(htmlFile)
		if err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در ایجاد فایل نمودار")
			return
		}
		defer f.Close()
		err = c.Render(f)
	case *charts.Pie:
		f, err := os.Create(htmlFile)
		if err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در ایجاد فایل نمودار")
			return
		}
		defer f.Close()
		err = c.Render(f)
	case *charts.Bar:
		f, err := os.Create(htmlFile)
		if err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در ایجاد فایل نمودار")
			return
		}
		defer f.Close()
		err = c.Render(f)
	default:
		sendMessage(admin.TelegramID, "❌ نوع نمودار پشتیبانی نمی‌شود")
		return
	}

	if err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ذخیره نمودار")
		return
	}

	// Convert HTML to PDF using Chrome/Chromium
	pdfFile := strings.Replace(htmlFile, ".html", ".pdf", 1)

	// Try different Chrome/Chromium commands
	chromeCmds := []string{
		"chromium-browser",
		"chromium",
		"google-chrome",
		"chrome",
	}

	var cmd *exec.Cmd
	for _, chromeCmd := range chromeCmds {
		cmd = exec.Command(chromeCmd,
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--disable-dev-shm-usage",
			"--print-to-pdf="+pdfFile,
			"--print-to-pdf-no-header",
			"--paper-width", "11.69", // A4 width in inches
			"--paper-height", "8.27", // A4 height in inches
			"--margin-top", "0.4", // 10mm in inches
			"--margin-right", "0.4",
			"--margin-bottom", "0.4",
			"--margin-left", "0.4",
			"file://"+htmlFile,
		)
		if err := cmd.Run(); err == nil {
			break
		}
	}

	if err := cmd.Run(); err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در تبدیل نمودار به PDF. لطفا مطمئن شوید که Chrome یا Chromium نصب شده است.")
		return
	}

	// Send the PDF file as a document
	doc := tgbotapi.NewDocument(admin.TelegramID, tgbotapi.FilePath(pdfFile))
	doc.Caption = fmt.Sprintf("📊 نمودار %s", getChartName(chartType))
	bot.Send(doc)

	// Clean up the files
	os.Remove(htmlFile)
	os.Remove(pdfFile)
}

// getChartName returns the Persian name for a chart type
func getChartName(chartType string) string {
	switch chartType {
	case "users":
		return "کاربران"
	case "sessions":
		return "جلسات"
	case "videos":
		return "ویدیوها"
	case "exercises":
		return "تمرین‌ها"
	default:
		return "نامشخص"
	}
}

// sendTextStatistics sends the text-based statistics
func sendTextStatistics(admin *Admin) {
	var stats struct {
		TotalUsers     int64
		ActiveUsers    int64
		BannedUsers    int64
		TotalSessions  int64
		TotalVideos    int64
		TotalExercises int64
		NewUsersToday  int64
		NewUsersWeek   int64
		NewUsersMonth  int64
	}

	// Get statistics
	db.Model(&User{}).Count(&stats.TotalUsers)
	db.Model(&User{}).Where("is_active = ?", true).Count(&stats.ActiveUsers)
	db.Model(&User{}).Where("is_active = ?", false).Count(&stats.BannedUsers)
	db.Model(&Session{}).Count(&stats.TotalSessions)
	db.Model(&Video{}).Count(&stats.TotalVideos)
	db.Model(&Exercise{}).Count(&stats.TotalExercises)

	// Get new user statistics
	today := time.Now().Truncate(24 * time.Hour)
	weekAgo := today.AddDate(0, 0, -7)
	monthAgo := today.AddDate(0, -1, 0)

	db.Model(&User{}).Where("created_at >= ?", today).Count(&stats.NewUsersToday)
	db.Model(&User{}).Where("created_at >= ?", weekAgo).Count(&stats.NewUsersWeek)
	db.Model(&User{}).Where("created_at >= ?", monthAgo).Count(&stats.NewUsersMonth)

	response := fmt.Sprintf("📊 آمار سیستم:\n\n"+
		"👥 کاربران:\n"+
		"• کل کاربران: %d\n"+
		"• کاربران فعال: %d\n"+
		"• کاربران مسدود: %d\n\n"+
		"📈 کاربران جدید:\n"+
		"• امروز: %d\n"+
		"• هفته گذشته: %d\n"+
		"• ماه گذشته: %d\n\n"+
		"📚 جلسات:\n"+
		"• کل جلسات: %d\n\n"+
		"🎥 ویدیوها:\n"+
		"• کل ویدیوها: %d\n\n"+
		"✍️ تمرین‌ها:\n"+
		"• کل تمرین‌ها: %d",
		stats.TotalUsers,
		stats.ActiveUsers,
		stats.BannedUsers,
		stats.NewUsersToday,
		stats.NewUsersWeek,
		stats.NewUsersMonth,
		stats.TotalSessions,
		stats.TotalVideos,
		stats.TotalExercises)

	sendMessage(admin.TelegramID, response)
}

// generateUserStats generates user statistics chart
func generateUserStats() (interface{}, error) {
	// Get user registration data for the last 30 days
	var stats []struct {
		Date  string
		Count int64
	}

	err := db.Raw(`
		SELECT DATE(created_at) as date, COUNT(*) as count 
		FROM users 
		WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
		GROUP BY DATE(created_at)
		ORDER BY date
	`).Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	// Create line chart
	line := charts.NewLine()
	line.SetGlobalOptions(
		charts.WithInitializationOpts(opts.Initialization{
			Theme: types.ThemeWesteros,
		}),
		charts.WithTitleOpts(opts.Title{
			Title: "آمار ثبت‌نام کاربران در 30 روز گذشته",
		}),
		charts.WithTooltipOpts(opts.Tooltip{
			Show: opts.Bool(true),
		}),
		charts.WithXAxisOpts(opts.XAxis{
			Name: "تاریخ",
		}),
		charts.WithYAxisOpts(opts.YAxis{
			Name: "تعداد کاربران",
		}),
	)

	// Prepare data
	dates := make([]string, 0)
	counts := make([]int64, 0)
	for _, stat := range stats {
		dates = append(dates, stat.Date)
		counts = append(counts, stat.Count)
	}

	// Add data to chart
	line.SetXAxis(dates).
		AddSeries("تعداد کاربران", generateLineItems(counts)).
		SetSeriesOptions(
			charts.WithLineChartOpts(opts.LineChart{
				Smooth: opts.Bool(true),
			}),
			charts.WithAreaStyleOpts(opts.AreaStyle{
				Opacity: 0.2,
			}),
		)

	return line, nil
}

// generateSessionStats generates session statistics chart
func generateSessionStats() (interface{}, error) {
	// Get session completion data
	var stats []struct {
		Status string
		Count  int64
	}

	err := db.Raw(`
		SELECT 
			CASE 
				WHEN exercises.status = 'approved' THEN 'تکمیل شده'
				ELSE 'در حال انجام'
			END as status,
			COUNT(*) as count
		FROM user_sessions
		LEFT JOIN exercises ON exercises.user_id = user_sessions.user_id AND exercises.session_id = user_sessions.session_id
		GROUP BY status
	`).Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	// Create pie chart
	pie := charts.NewPie()
	pie.SetGlobalOptions(
		charts.WithInitializationOpts(opts.Initialization{
			Theme: types.ThemeWesteros,
		}),
		charts.WithTitleOpts(opts.Title{
			Title: "وضعیت جلسات",
		}),
		charts.WithTooltipOpts(opts.Tooltip{
			Show: opts.Bool(true),
		}),
	)

	// Prepare data
	items := make([]opts.PieData, 0)
	for _, stat := range stats {
		items = append(items, opts.PieData{
			Name:  stat.Status,
			Value: stat.Count,
		})
	}

	// Add data to chart
	pie.AddSeries("جلسات", items).
		SetSeriesOptions(
			charts.WithLabelOpts(opts.Label{
				Show:      opts.Bool(true),
				Formatter: "{b}: {c} ({d}%)",
			}),
		)

	return pie, nil
}

// generateVideoStats generates video statistics chart
func generateVideoStats() (interface{}, error) {
	// Get video view data
	var stats []struct {
		VideoTitle string
		ViewCount  int64
	}

	err := db.Raw(`
		SELECT v.title, COUNT(DISTINCT us.user_id) as view_count
		FROM videos v
		LEFT JOIN user_sessions us ON us.session_id = v.session_id
		GROUP BY v.id, v.title
		ORDER BY view_count DESC
		LIMIT 10
	`).Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	// Create bar chart
	bar := charts.NewBar()
	bar.SetGlobalOptions(
		charts.WithInitializationOpts(opts.Initialization{
			Theme: types.ThemeWesteros,
		}),
		charts.WithTitleOpts(opts.Title{
			Title: "10 ویدیوی پربازدید",
		}),
		charts.WithTooltipOpts(opts.Tooltip{
			Show: opts.Bool(true),
		}),
		charts.WithXAxisOpts(opts.XAxis{
			Name: "تعداد بازدید",
		}),
		charts.WithYAxisOpts(opts.YAxis{
			Name: "عنوان ویدیو",
		}),
	)

	// Prepare data
	titles := make([]string, 0)
	counts := make([]int64, 0)
	for _, stat := range stats {
		titles = append(titles, stat.VideoTitle)
		counts = append(counts, stat.ViewCount)
	}

	// Add data to chart
	bar.SetXAxis(titles).
		AddSeries("تعداد بازدید", generateBarItems(counts)).
		SetSeriesOptions(
			charts.WithLabelOpts(opts.Label{
				Show: opts.Bool(true),
			}),
		)

	return bar, nil
}

// generateExerciseStats generates exercise statistics chart
func generateExerciseStats() (interface{}, error) {
	// Get exercise completion data
	var stats []struct {
		ExerciseTitle  string
		CompletionRate float64
	}

	err := db.Raw(`
		SELECT 
			s.title as exercise_title,
			COUNT(CASE WHEN e.status = 'approved' THEN 1 END) * 100.0 / COUNT(*) as completion_rate
		FROM sessions s
		LEFT JOIN exercises e ON e.session_id = s.id
		GROUP BY s.id, s.title
		ORDER BY completion_rate DESC
		LIMIT 10
	`).Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	// Create horizontal bar chart
	bar := charts.NewBar()
	bar.SetGlobalOptions(
		charts.WithInitializationOpts(opts.Initialization{
			Theme: types.ThemeWesteros,
		}),
		charts.WithTitleOpts(opts.Title{
			Title: "نرخ تکمیل تمرین‌ها",
		}),
		charts.WithTooltipOpts(opts.Tooltip{
			Show: opts.Bool(true),
		}),
		charts.WithXAxisOpts(opts.XAxis{
			Name: "درصد تکمیل",
		}),
		charts.WithYAxisOpts(opts.YAxis{
			Name: "عنوان تمرین",
		}),
	)

	// Prepare data
	titles := make([]string, 0)
	rates := make([]float64, 0)
	for _, stat := range stats {
		titles = append(titles, stat.ExerciseTitle)
		rates = append(rates, stat.CompletionRate)
	}

	// Add data to chart
	bar.SetXAxis(titles).
		AddSeries("درصد تکمیل", generateBarItems(rates)).
		SetSeriesOptions(
			charts.WithLabelOpts(opts.Label{
				Show:      opts.Bool(true),
				Formatter: "{c}%",
			}),
		)

	return bar, nil
}

// Helper functions for chart data generation
func generateLineItems(values []int64) []opts.LineData {
	items := make([]opts.LineData, 0)
	for _, v := range values {
		items = append(items, opts.LineData{Value: v})
	}
	return items
}

func generateBarItems(values interface{}) []opts.BarData {
	items := make([]opts.BarData, 0)
	switch v := values.(type) {
	case []int64:
		for _, val := range v {
			items = append(items, opts.BarData{Value: val})
		}
	case []float64:
		for _, val := range v {
			items = append(items, opts.BarData{Value: val})
		}
	}
	return items
}
