package main

import (
    "fmt"
    "net/http"

	"encoding/json"

	"io/ioutil"

	"net/url"


	"log"
)

type SearchResponse struct {
	Query struct {
		Search []struct {
			Title string `json:"title"`
			Snippet string `json:"snippet"`
		} `json:"search"`
	} `json:"query"`
}
func apiSearchHandler(w http.ResponseWriter, r *http.Request) {
    // Set CORS headers

	log.Println("Search handler hit")
    w.Header().Set("Access-Control-Allow-Origin", "*") // Allow any domain, adjust in production
    w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS") // Allow specific methods
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type") // Allow specific headers

    // The rest of your handler code follows...

	if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }
    query := r.URL.Query().Get("query")
    if query == "" {
        http.Error(w, "Query parameter 'query' is missing", http.StatusBadRequest)
        return
    }

    recommendations, err := searchWikipedia(query)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
	

    // Send JSON response
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string][]string{"recommendations": recommendations})
}
func searchWikipedia(input string) ([]string, error) {
	encodedInput := url.QueryEscape(input)
	apiURL := fmt.Sprintf("https://en.wikipedia.org/w/api.php?action=opensearch&search=%s&format=json", encodedInput)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// The response is a JSON array, so we use an interface{} slice to unmarshal the JSON.
	var searchResult []interface{}
	err = json.Unmarshal(body, &searchResult)
	if err != nil {
		return nil, err
	}

	// The second element of `searchResult` is an array of titles, which is what we're interested in.
	titlesInterface, ok := searchResult[1].([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected format of Wikipedia response")
	}

	var titles []string
	for _, titleInterface := range titlesInterface {
        title, ok := titleInterface.(string)
        if !ok {
            return nil, fmt.Errorf("unexpected title format in Wikipedia response")
        }
        titles = append(titles, title)
    }

	return titles, nil
}

func main() {

    fmt.Println("Backend server starting on http://localhost:8080...")

    // Register the apiSearchHandler with the "/api/search" endpoint
    http.HandleFunc("/api/search", apiSearchHandler)

    // Start the HTTP server
    if err := http.ListenAndServe(":8080", nil); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}