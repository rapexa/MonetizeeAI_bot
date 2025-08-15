package main

import (
	"fmt"
	"net/http"
	"time"
)

// Simple test function to check API health
func testAPIHealth() {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get("http://localhost:8080/api/v1/health")
	if err != nil {
		fmt.Printf("❌ API Health Check Failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		fmt.Println("✅ API Health Check Passed")
	} else {
		fmt.Printf("❌ API Health Check Failed: Status %d\n", resp.StatusCode)
	}
}

// Test function (can be called manually for debugging)
func runAPITests() {
	fmt.Println("🧪 Running API Tests...")
	time.Sleep(2 * time.Second) // Wait for server to start
	testAPIHealth()
}
