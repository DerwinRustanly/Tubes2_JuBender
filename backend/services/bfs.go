package services

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly/v2"
)

// func printPath(listPath []string) {
// 	fmt.Println("Path: ")
// 	for i, url := range listPath {
// 		fmt.Printf("%d. %s\n", i, url)
// 	}
// }

// func printRes(res map[string]any) {
// 	fmt.Printf("Start: %s\n", res["from"])
// 	fmt.Printf("Target: %s\n", res["to"])
// 	fmt.Printf("Time(ms): %d\n", res["time_ms"])
// 	fmt.Printf("Total link searched: %d\n", res["total_link_searched"])
// 	fmt.Printf("Total scrap request: %d\n", res["total_scrap_request"])
// 	printPath(res["path"].([]string))
// }

func unwrapParentMap(targetURL string, parentMap *map[string]string) []string {
	unwrappedPath := []string{}
	for url := targetURL; url != ""; url = (*parentMap)[url] {
		unwrappedPath = append([]string{strings.TrimPrefix(url, "https://en.wikipedia.org/wiki/")}, unwrappedPath...)
		if url == (*parentMap)[url] {
			break
		}
	}
	return unwrappedPath
}

func HandleBFS(startTitle string, targetTitle string) map[string]any {
	parentMap := make(map[string]string)
	totalLinksSearched := 0
	totalRequest := 0
	startURL := "https://en.wikipedia.org/wiki/" + startTitle
	targetURL := "https://en.wikipedia.org/wiki/" + targetTitle
	startTime := time.Now()
	bfs(startURL, targetURL, &parentMap, &totalLinksSearched, &totalRequest)
	elapsed := time.Since(startTime)
	result := make(map[string]any)
	result["from"] = startTitle
	result["to"] = targetTitle
	result["time_ms"] = elapsed.Milliseconds()
	result["total_link_searched"] = totalLinksSearched
	result["total_scrap_request"] = totalRequest
	result["path"] = unwrapParentMap(targetURL, &parentMap)
	return result
}

func bfs(startURL string, targetURL string, parentMap *map[string]string, totalLinksSearched *int, totalRequest *int) {
	if startURL == targetURL {
		(*parentMap)[targetURL] = startURL
		*totalLinksSearched = 1
		return
	}
	visited := sync.Map{}
	visited.Store(startURL, true)

	var queue []string
	var mutex sync.Mutex
	var targetFound bool
	var wg sync.WaitGroup

	excludeRegex := regexp.MustCompile(`^/wiki/(File:|Category:|Special:|Portal:|Help:|Wikipedia:|Talk:|User:|Template:|Template_talk:|Main_Page)`)

	c := colly.NewCollector(
		colly.AllowedDomains("en.wikipedia.org"),
	)

	enqueue := func(url, parentURL string) {
		mutex.Lock()
		queue = append(queue, url)
		(*parentMap)[url] = parentURL
		mutex.Unlock()
	}

	dequeue := func() string {
		mutex.Lock()
		defer mutex.Unlock()
		if len(queue) == 0 {
			return ""
		}
		var url string
		url, queue = queue[0], queue[1:]
		return url
	}

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("Request URL:", r.Request.URL, "failed with response:", r, "Error:", err)
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		trimmedLink := strings.TrimPrefix(link, "https://en.wikipedia.org")
		if strings.HasPrefix(trimmedLink, "/wiki/") && !excludeRegex.MatchString(trimmedLink) {
			if _, seen := visited.LoadOrStore(link, true); !seen {
				mutex.Lock()
				*totalLinksSearched += 1
				mutex.Unlock()
				enqueue(link, e.Request.URL.String())
				if link == targetURL {
					fmt.Println("Found target at:", link)
					targetFound = true
					return
				}
			}
		}
	})

	enqueue(startURL, "")

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				if targetFound {
					return
				}
				nextURL := dequeue()
				if nextURL == "" {
					time.Sleep(1 * time.Millisecond)
					continue
				}
				c.Visit(nextURL)
				mutex.Lock()
				*totalRequest += 1
				mutex.Unlock()
			}
		}()
	}

	wg.Wait()
}
