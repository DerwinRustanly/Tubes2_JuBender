package services

import (
	"fmt"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/cache"
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/models"
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/utils"
	"github.com/gocolly/colly/v2"
)

func unwrapParentMap(targetURL string, parentMap *map[string][]string) [][]string {
	var unwrappedPath [][]string
	seenPaths := make(map[string]bool)
	for _, unwrapURL := range (*parentMap)[targetURL] {
		tempPath := []string{utils.FormatToTitle(strings.TrimPrefix(targetURL, "https://en.wikipedia.org/wiki/"))}
		fullPath := ""
		for url := unwrapURL; url != ""; url = (*parentMap)[url][0] {
			trimmedLink := strings.TrimPrefix(url, "https://en.wikipedia.org/wiki/")
			tempPath = append([]string{utils.FormatToTitle(trimmedLink)}, tempPath...)
			fullPath = utils.FormatToTitle(trimmedLink) + fullPath
			if url == (*parentMap)[url][0] {
				break
			}
		}
		if _, exists := seenPaths[fullPath]; !exists {
			unwrappedPath = append(unwrappedPath, tempPath)
			seenPaths[fullPath] = true
		}
	}
	return unwrappedPath
}

func HandleBFS(startTitle string, targetTitle string, multiple bool) map[string]any {
	parentMap := make(map[string][]string)
	totalLinksSearched := 0
	totalRequest := 0
	startURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(startTitle)
	targetURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(targetTitle)
	fmt.Println("Encoded start:", startURL)
	fmt.Println("Encoded target:", targetURL)
	startTime := time.Now()
	bfs(startURL, targetURL, multiple, &parentMap, &cache.GlobalCache.Data, &totalLinksSearched, &totalRequest)
	elapsed := time.Since(startTime)
	return map[string]any{
		"from":                utils.FormatToTitle(startTitle),
		"to":                  utils.FormatToTitle(targetTitle),
		"time_ms":             elapsed.Milliseconds(),
		"total_link_searched": totalLinksSearched,
		"total_scrap_request": totalRequest,
		"path":                unwrapParentMap(targetURL, &parentMap),
	}
}

func bfs(startURL string, targetURL string, multiple bool, parentMap *map[string][]string, cache *map[string][]string, totalLinksSearched *int, totalRequest *int) {
	if startURL == targetURL {
		(*parentMap)[targetURL] = []string{startURL}
		*totalLinksSearched = 1
		return
	}
	visited := sync.Map{}
	visited.Store(startURL, true)

	goroutineCount := 20
	queue1 := make(chan models.Article, 7000000)
	queue2 := make(chan models.Article, 7000000)
	var mutex sync.Mutex
	var targetFound int32
	var depthFound int32
	var wg sync.WaitGroup
	var currentDepth int32
	var runningQueue *chan models.Article

	excludeRegex := regexp.MustCompile(`^/wiki/(File:|Category:|Special:|Portal:|Help:|Wikipedia:|Talk:|User:|Template:|Template_talk:|Main_Page)`)

	c := colly.NewCollector(
		colly.AllowedDomains("en.wikipedia.org"),
	)

	enqueue := func(article models.Article, queue *chan models.Article) {
		*queue <- article
	}

	dequeue := func(queue *chan models.Article) (models.Article, bool) {
		article, ok := <-*queue
		return article, ok
	}

	addParent := func(url string, parentURL string) {
		mutex.Lock()
		(*parentMap)[url] = append((*parentMap)[url], parentURL)
		mutex.Unlock()
	}

	findDepth := func(url string) int {
		d := len(unwrapParentMap(url, parentMap)[0]) - 1
		return d
	}

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("Request URL:", r.Request.URL, "Error:", err)
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		trimmedLink := strings.TrimPrefix(link, "https://en.wikipedia.org")
		if strings.HasPrefix(trimmedLink, "/wiki/") && !excludeRegex.MatchString(trimmedLink) {
			link = utils.WikipediaUrlEncode(link)
			parentUrlEncoded := utils.WikipediaUrlEncode(e.Request.URL.String())
			mutex.Lock()
			(*cache)[parentUrlEncoded] = append((*cache)[parentUrlEncoded], link)
			mutex.Unlock()
			if _, seen := visited.LoadOrStore(link, true); !seen {
				mutex.Lock()
				*totalLinksSearched += 1
				depth := findDepth(parentUrlEncoded) + 1
				mutex.Unlock()
				mutex.Lock()
				article := models.Article{Url: link, Depth: depth}
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
				if atomic.LoadInt32(&targetFound) == 1 && !multiple {
					return
				}
				addParent(link, parentUrlEncoded)
				if link == targetURL {
					if atomic.LoadInt32(&targetFound) == 0 {
						atomic.StoreInt32(&depthFound, int32(depth-1))
						atomic.StoreInt32(&targetFound, 1)
						fmt.Println(depth - 1)
					}
					visited.Delete(link)
					fmt.Println(">> Found MINIMAL path at:", parentUrlEncoded)
					fmt.Println(">  Target:", link)
				}
			}
		}
	})

	getFromCache := func(parentUrl string) {
		// fmt.Println("cache hit")
		parentUrl = utils.WikipediaUrlEncode(parentUrl)
		mutex.Lock()
		cachedLinks := (*cache)[parentUrl]
		mutex.Unlock()
		for _, cachedLink := range cachedLinks {
			if _, seen := visited.LoadOrStore(cachedLink, true); !seen {
				mutex.Lock()
				*totalLinksSearched += 1
				depth := findDepth(parentUrl) + 1
				mutex.Unlock()
				mutex.Lock()
				article := models.Article{Url: cachedLink, Depth: depth}
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
				if atomic.LoadInt32(&targetFound) == 1 && !multiple {
					return
				}
				addParent(cachedLink, parentUrl)
				if cachedLink == targetURL {
					if atomic.LoadInt32(&targetFound) == 0 {
						atomic.StoreInt32(&depthFound, int32(depth-1))
						atomic.StoreInt32(&targetFound, 1)
						fmt.Println(depth - 1)
					}
					visited.Delete(cachedLink)
					fmt.Println(">> Found MINIMAL path at:", parentUrl)
					fmt.Println(">  Target:", cachedLink)
				}
			}
		}
	}

	// Init
	runningQueue = &queue1
	enqueue(models.Article{Url: startURL, Depth: 0}, runningQueue)
	addParent(startURL, "")

	for i := 0; i < goroutineCount; i++ {
		time.Sleep(100 * time.Millisecond)
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				if atomic.LoadInt32(&targetFound) == 1 && !multiple {
					return
				}

				if atomic.LoadInt32(&targetFound) == 1 && atomic.LoadInt32(&currentDepth) > atomic.LoadInt32(&depthFound) {
					return
				}

				nextArticle, ok := dequeue(runningQueue)
				encodedNextUrl := nextArticle.Url

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
					fmt.Println("current depth", currentDepth)
				}
				mutex.Unlock()

				visited.Store(encodedNextUrl, true)

				mutex.Lock()
				_, cached := (*cache)[encodedNextUrl]
				mutex.Unlock()

				if cached {
					getFromCache(encodedNextUrl)
				} else {
					mutex.Lock()
					*totalRequest += 1
					mutex.Unlock()
					c.Visit(encodedNextUrl)
				}
			}
		}()
	}

	wg.Wait()
	close(queue1)
	close(queue2)
}
