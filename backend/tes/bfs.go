package main

import (
	"fmt"
	"github.com/gocolly/colly/v2"
	"strings"
	"sync"
	"time"
)

// Helper function to safely add URLs to the queue
func enqueueURL(queue *[]string, url string, mutex *sync.Mutex) {
	mutex.Lock()
	defer mutex.Unlock()
	*queue = append(*queue, url)
}

func findShortestPath(startURL, endURL string) ([]string, bool) {
	// Collector setup
	c := colly.NewCollector()

	var found bool
	var pathMutex sync.Mutex // Guards access to found and pathMap
	visited := make(map[string]struct{})
	pathMap := make(map[string]string)
	var queue []string
	var queueMutex sync.Mutex

	// Add the start URL to the queue
	enqueueURL(&queue, startURL, &queueMutex)
	visited[startURL] = struct{}{}

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		if strings.Contains(link, "wikipedia.org/wiki") && !found {
			if _, ok := visited[link]; !ok {
				visited[link] = struct{}{}
				pathMutex.Lock()
				pathMap[link] = e.Request.URL.String()
				pathMutex.Unlock()
				enqueueURL(&queue, link, &queueMutex)
			}
			if link == endURL {
				found = true
			}
		}
	})

	// Processing loop
	for len(queue) > 0 && !found {
		var current string
		queueMutex.Lock()
		current, queue = queue[0], queue[1:]
		queueMutex.Unlock()
		c.Visit(current)
	}

	// Reconstruct the path
	var path []string
	if found {
		current := endURL
		for current != startURL {
			path = append([]string{current}, path...)
			current = pathMap[current]
		}
		path = append([]string{startURL}, path...)
		return path, true
	}
	return nil, false
}

func main() {
	startURL := "https://en.wikipedia.org/wiki/KFC"
	endURL := "https://en.wikipedia.org/wiki/Joko_Widodo"

	// Start the timer
	startTime := time.Now()
	fmt.Println("Compliling...")
	// Call the function
	path, found := findShortestPath(startURL, endURL)

	// Stop the timer and calculate duration
	duration := time.Since(startTime)

	if found {
		fmt.Println("Shortest Path Found:")
		for _, url := range path {
			fmt.Println(url)
		}
	} else {
		fmt.Println("Path not found.")
	}

	// Print the execution time in milliseconds
	fmt.Printf("Execution time: %v ms\n", duration.Milliseconds())
}
