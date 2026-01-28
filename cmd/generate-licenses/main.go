package main

import (
	"crypto/rand"
	"fmt"
	"os"
	"strings"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// License represents a pre-generated license key
type License struct {
	gorm.Model
	LicenseKey string     `gorm:"uniqueIndex;size:100"`
	IsUsed     bool       `gorm:"default:false"`
	UsedBy     *uint      `json:"used_by"`
	UsedAt     *time.Time `json:"used_at"`
	CreatedBy  *uint      `json:"created_by"`
}

// generateLicenseKey generates a single license key in format: XXXX-XXXXX-XXXXX-XXXXX
func generateLicenseKey() string {
	// Generate 4 groups: 4-5-5-5 characters
	groups := []int{4, 5, 5, 5}
	parts := make([]string, len(groups))

	for i, length := range groups {
		bytes := make([]byte, length)
		rand.Read(bytes)
		// Use uppercase alphanumeric characters (excluding I, O to avoid confusion)
		for j := range bytes {
			bytes[j] = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"[bytes[j]%34]
		}
		parts[i] = string(bytes)
	}

	return strings.Join(parts, "-")
}

func main() {
	// Get database connection string from environment
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Default connection string (adjust as needed)
		dsn = "root:password@tcp(localhost:3306)/monetizeeai?charset=utf8mb4&parseTime=True&loc=Local"
		fmt.Println("⚠️  DATABASE_URL not set, using default connection string")
		fmt.Println("   Set DATABASE_URL environment variable to use custom connection")
	}

	// Connect to database
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Printf("❌ Failed to connect to database: %v\n", err)
		os.Exit(1)
	}

	// Auto-migrate License table
	if err := db.AutoMigrate(&License{}); err != nil {
		fmt.Printf("❌ Failed to migrate database: %v\n", err)
		os.Exit(1)
	}

	// Get count from command line argument or use default
	count := 500
	if len(os.Args) > 1 {
		if n, err := fmt.Sscanf(os.Args[1], "%d", &count); err != nil || n != 1 || count < 1 {
			fmt.Printf("❌ Invalid count: %s. Using default: 500\n", os.Args[1])
			count = 500
		}
	}

	fmt.Printf("🔄 Generating %d license keys...\n", count)

	licenses := make([]License, 0, count)
	for i := 0; i < count; i++ {
		licenseKey := generateLicenseKey()
		licenses = append(licenses, License{
			LicenseKey: licenseKey,
			IsUsed:     false,
		})
		if (i+1)%50 == 0 {
			fmt.Printf("   Generated %d/%d license keys...\n", i+1, count)
		}
	}

	// Batch insert (100 at a time)
	batchSize := 100
	for i := 0; i < len(licenses); i += batchSize {
		end := i + batchSize
		if end > len(licenses) {
			end = len(licenses)
		}
		batch := licenses[i:end]
		if err := db.CreateInBatches(batch, batchSize).Error; err != nil {
			fmt.Printf("❌ Failed to insert batch %d-%d: %v\n", i+1, end, err)
			os.Exit(1)
		}
		fmt.Printf("   Inserted batch %d-%d\n", i+1, end)
	}

	fmt.Printf("✅ Successfully generated and inserted %d license keys!\n", count)
	fmt.Println("\n📋 Sample license keys:")
	for i := 0; i < 5 && i < len(licenses); i++ {
		fmt.Printf("   %s\n", licenses[i].LicenseKey)
	}
	if len(licenses) > 5 {
		fmt.Printf("   ... and %d more\n", len(licenses)-5)
	}
}
