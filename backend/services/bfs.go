package services

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/utils"
	"github.com/gocolly/colly/v2"
)

func unwrapParentMap(targetURL string, parentMap *map[string]string) []string {
	unwrappedPath := []string{}
	for url := targetURL; url != ""; url = (*parentMap)[url] {
		trimmedLink := strings.TrimPrefix(url, "https://en.wikipedia.org/wiki/")
		unwrappedPath = append([]string{utils.FormatToTitle(trimmedLink)}, unwrappedPath...)
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
	startURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(startTitle)
	targetURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(targetTitle)
	fmt.Println("Encoded start:", startURL)
	fmt.Println("Encoded target:", targetURL)
	startTime := time.Now()
	bfs(startURL, targetURL, &parentMap, &totalLinksSearched, &totalRequest)
	elapsed := time.Since(startTime)
	result := make(map[string]any)
	result["from"] = utils.FormatToTitle(startTitle)
	result["to"] = utils.FormatToTitle(targetTitle)
	result["time_ms"] = elapsed.Milliseconds()
	result["total_link_searched"] = totalLinksSearched
	result["total_scrap_request"] = totalRequest
	result["path"] = unwrapParentMap(targetURL, &parentMap)
	return result
}

type Article struct {
	url   string
	depth int
}

func bfs(startURL string, targetURL string, parentMap *map[string]string, totalLinksSearched *int, totalRequest *int) {
	if startURL == targetURL {
		(*parentMap)[targetURL] = startURL
		*totalLinksSearched = 1
		return
	}
	visited := sync.Map{}
	visited.Store(startURL, true)

	goroutineCount := 20
	queue1 := make(chan Article, 7000000)
	queue2 := make(chan Article, 7000000)
	var mutex sync.Mutex
	var targetFound int32
	var wg sync.WaitGroup
	var currentDepth int32
	var runningQueue *chan Article

	excludeRegex := regexp.MustCompile(`^/wiki/(File:|Category:|Special:|Portal:|Help:|Wikipedia:|Talk:|User:|Template:|Template_talk:|Main_Page)`)

	c := colly.NewCollector(
		colly.AllowedDomains("en.wikipedia.org"),
	)

	enqueue := func(article Article, queue *chan Article) {
		*queue <- article
	}

	dequeue := func(queue *chan Article) (Article, bool) {
		article, ok := <-*queue
		return article, ok
	}

	addParent := func(url string, parentURL string) {
		mutex.Lock()
		(*parentMap)[url] = parentURL
		mutex.Unlock()
	}

	findDepth := func(url string) int {
		return len(unwrapParentMap(url, parentMap)) - 1
	}

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("Request URL:", r.Request.URL, "Error:", err)
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		trimmedLink := strings.TrimPrefix(link, "https://en.wikipedia.org")
		if strings.HasPrefix(trimmedLink, "/wiki/") && !excludeRegex.MatchString(trimmedLink) {
			encodedLinkTitle := utils.EncodeToPercent(strings.TrimPrefix(link, "https://en.wikipedia.org/wiki/"))
			link = "https://en.wikipedia.org/wiki/" + encodedLinkTitle
			if _, seen := visited.LoadOrStore(link, true); !seen {
				mutex.Lock()
				*totalLinksSearched += 1
				depth := findDepth(e.Request.URL.String()) + 1
				mutex.Unlock()
				mutex.Lock()
				article := Article{url: link, depth: depth}
				if depth == int(currentDepth) {
					enqueue(article, runningQueue)
				} else {
					if runningQueue == &queue1 {
						enqueue(article, &queue2)
					} else {
						enqueue(article, &queue1)
					}

				}
				mutex.Unlock()
				addParent(link, e.Request.URL.String())
				if link == targetURL {
					atomic.CompareAndSwapInt32(&targetFound, 0, 1)
					fmt.Println(">> Found MINIMAL path at:", e.Request.URL.String())
					fmt.Println(">  Target:", link)
					return
				}
			}
		}
	})

	// Init
	runningQueue = &queue1
	enqueue(Article{url: startURL, depth: 0}, runningQueue)
	addParent(startURL, "")

	for i := 0; i < goroutineCount; i++ {
		time.Sleep(300 * time.Millisecond)
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				if atomic.LoadInt32(&targetFound) == 1 {
					return
				}
				article, ok := dequeue(runningQueue)

				if !ok {
					time.Sleep(100 * time.Millisecond)
					continue
				}

				mutex.Lock()
				if len(*runningQueue) == 0 {
					if runningQueue == &queue1 {
						runningQueue = &queue2
					} else {
						runningQueue = &queue1
					}
					atomic.AddInt32(&currentDepth, 1)
				}
				mutex.Unlock()

				mutex.Lock()
				*totalRequest += 1
				mutex.Unlock()
				visited.Store(article.url, true)
				c.Visit(article.url)
			}
		}()
	}

	wg.Wait()
	close(queue1)
	close(queue2)
}
