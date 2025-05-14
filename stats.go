package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/go-echarts/go-echarts/v2/charts"
	"github.com/go-echarts/go-echarts/v2/opts"
	"github.com/go-echarts/go-echarts/v2/types"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

// generateAndSendCharts generates and sends all statistics charts
func generateAndSendCharts(admin *Admin) {
	// Create charts directory if it doesn't exist
	chartsDir := "charts"
	if err := os.MkdirAll(chartsDir, 0755); err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ایجاد پوشه نمودارها")
		return
	}

	// Generate and send each chart
	charts := []struct {
		name     string
		generate func() (string, error)
	}{
		{"آمار کاربران", generateUserStats},
		{"آمار جلسات", generateSessionStats},
		{"آمار ویدیوها", generateVideoStats},
		{"آمار تمرین‌ها", generateExerciseStats},
	}

	for _, chart := range charts {
		// Send "preparing" message
		msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("📊 نمودار %s در حال آماده‌سازی...", chart.name))
		bot.Send(msg)

		// Generate chart
		filename, err := chart.generate()
		if err != nil {
			sendMessage(admin.TelegramID, fmt.Sprintf("❌ خطا در ایجاد نمودار %s: %v", chart.name, err))
			continue
		}

		// Send chart as photo
		photo := tgbotapi.NewPhoto(admin.TelegramID, tgbotapi.FilePath(filename))
		photo.Caption = fmt.Sprintf("📊 نمودار %s", chart.name)
		bot.Send(photo)

		// Clean up the file
		os.Remove(filename)
	}
}

// generateUserStats generates user statistics chart
func generateUserStats() (string, error) {
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
		return "", err
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
				Smooth: true,
			}),
			charts.WithAreaStyleOpts(opts.AreaStyle{
				Opacity: 0.2,
			}),
		)

	// Save chart
	filename := filepath.Join("charts", fmt.Sprintf("user_stats_%s.html", time.Now().Format("20060102_150405")))
	f, err := os.Create(filename)
	if err != nil {
		return "", err
	}
	defer f.Close()

	return filename, line.Render(f)
}

// generateSessionStats generates session statistics chart
func generateSessionStats() (string, error) {
	// Get session completion data
	var stats []struct {
		Status string
		Count  int64
	}

	err := db.Raw(`
		SELECT 
			CASE 
				WHEN completed_at IS NOT NULL THEN 'تکمیل شده'
				ELSE 'در حال انجام'
			END as status,
			COUNT(*) as count
		FROM user_sessions
		GROUP BY status
	`).Scan(&stats).Error

	if err != nil {
		return "", err
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

	// Save chart
	filename := filepath.Join("charts", fmt.Sprintf("session_stats_%s.html", time.Now().Format("20060102_150405")))
	f, err := os.Create(filename)
	if err != nil {
		return "", err
	}
	defer f.Close()

	return filename, pie.Render(f)
}

// generateVideoStats generates video statistics chart
func generateVideoStats() (string, error) {
	// Get video view data
	var stats []struct {
		VideoTitle string
		ViewCount  int64
	}

	err := db.Raw(`
		SELECT v.title, COUNT(us.id) as view_count
		FROM videos v
		LEFT JOIN user_sessions us ON us.video_id = v.id
		GROUP BY v.id, v.title
		ORDER BY view_count DESC
		LIMIT 10
	`).Scan(&stats).Error

	if err != nil {
		return "", err
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

	// Save chart
	filename := filepath.Join("charts", fmt.Sprintf("video_stats_%s.html", time.Now().Format("20060102_150405")))
	f, err := os.Create(filename)
	if err != nil {
		return "", err
	}
	defer f.Close()

	return filename, bar.Render(f)
}

// generateExerciseStats generates exercise statistics chart
func generateExerciseStats() (string, error) {
	// Get exercise completion data
	var stats []struct {
		ExerciseTitle  string
		CompletionRate float64
	}

	err := db.Raw(`
		SELECT 
			e.title,
			COUNT(CASE WHEN us.completed_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as completion_rate
		FROM exercises e
		LEFT JOIN user_sessions us ON us.exercise_id = e.id
		GROUP BY e.id, e.title
		ORDER BY completion_rate DESC
		LIMIT 10
	`).Scan(&stats).Error

	if err != nil {
		return "", err
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

	// Save chart
	filename := filepath.Join("charts", fmt.Sprintf("exercise_stats_%s.html", time.Now().Format("20060102_150405")))
	f, err := os.Create(filename)
	if err != nil {
		return "", err
	}
	defer f.Close()

	return filename, bar.Render(f)
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
