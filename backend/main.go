package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Access-Control-Allow-Origin", "*") 
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type") // Allow specific headers
        message := "Welcome to the Go-powered API!"
        fmt.Fprint(w, message) // Use Fprint instead of Fprintf for plain strings
    })

    fmt.Println("Backend server starting on http://localhost:8080...")
    http.ListenAndServe(":8080", nil)
}