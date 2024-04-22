package services

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gocolly/colly/v2"
)

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

	queue := make(chan string, 7000000)
	var mutex sync.Mutex
	var targetFound int32
	var wg sync.WaitGroup

	excludeRegex := regexp.MustCompile(`^/wiki/(File:|Category:|Special:|Portal:|Help:|Wikipedia:|Talk:|User:|Template:|Template_talk:|Main_Page)`)

	c := colly.NewCollector(
		colly.AllowedDomains("en.wikipedia.org"),
	)

	enqueue := func(url string) {
		queue <- url
	}

	dequeue := func() (string, bool) {
		url, ok := <-queue
		return url, ok
	}

	addParent := func(url string, parentURL string) {
		mutex.Lock()
		if atomic.LoadInt32(&targetFound) == 1 {
			parentMapCopy := *parentMap
			parentMapCopy[url] = parentURL
			if len(unwrapParentMap(url, &parentMapCopy)) < len(unwrapParentMap(url, parentMap)) {
				fmt.Println(">> Found MINIMAL path at:", parentURL)
				fmt.Println(">  Target:", url)
				(*parentMap)[url] = parentURL
			}
			mutex.Unlock()
			return
		}
		(*parentMap)[url] = parentURL
		mutex.Unlock()
	}

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("Request URL:", r.Request.URL, "Error:", err)
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		trimmedLink := strings.TrimPrefix(link, "https://en.wikipedia.org")
		if strings.HasPrefix(trimmedLink, "/wiki/") && !excludeRegex.MatchString(trimmedLink) {
			if _, seen := visited.LoadOrStore(link, true); !seen {
				mutex.Lock()
				*totalLinksSearched += 1
				mutex.Unlock()
				addParent(link, e.Request.URL.String())
				if link == targetURL {
					if atomic.CompareAndSwapInt32(&targetFound, 0, 1) {
						fmt.Println(">> Found MINIMAL path at:", e.Request.URL.String())
						fmt.Println(">  Target:", link)
						return
					}
					fmt.Println(">> Found path at:", e.Request.URL.String())
					fmt.Println(">  Target:", link)
					return
				}
				enqueue(link)
			}
		}
	})

	enqueue(startURL)
	addParent(startURL, "")

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				nextURL, ok := dequeue()
				if !ok {
					time.Sleep(100 * time.Millisecond)
					continue
				}
				c.Visit(nextURL)
				mutex.Lock()
				*totalRequest += 1
				mutex.Unlock()

				if targetFound == 1 {
					return
				}
			}
		}()
	}

	wg.Wait()
	close(queue)
}
