package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	// Serve فایل HTML
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "landing-sale.html")
	})

	port := "8000"
	fmt.Printf("🚀 Landing page is running at: http://localhost:%s\n", port)
	fmt.Println("Press Ctrl+C to stop")
	
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

