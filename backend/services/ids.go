package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/utils"
	"github.com/gocolly/colly/v2"
)

func HandleIDS(startTitle, targetTitle string) map[string]any {
	startURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(startTitle)
	targetURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(targetTitle)
	parentMap := make(map[string]string)
	depthMap := make(map[string]int)
	totalLinksSearched := 0
	totalRequest := 0
	startTime := time.Now()

	ids(startURL, targetURL, &parentMap, &depthMap, &totalLinksSearched, &totalRequest)

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

func ids(startURL, targetURL string, parentMap *map[string]string, depthMap *map[string]int, totalLinksSearched, totalRequest *int) {
	cache := make(map[string][]Article)
	visited := make(map[string]bool)
	targetFound := 0
	i := 0

	for targetFound == 0 {
		dls(startURL, targetURL, parentMap, depthMap, &cache, &visited, totalLinksSearched, totalRequest, &targetFound, i)
		fmt.Println("Iterate:", i, "done")
		i++
	}
}

func dls(startURL, targetURL string, parentMap *map[string]string, depthMap *map[string]int, cache *map[string][]Article, visited *map[string]bool, totalLinksSearched, totalRequest *int, targetFound *int, limit int) {
	if startURL == targetURL {
		(*parentMap)[targetURL] = startURL
		*totalLinksSearched = 1
		*targetFound = 1
		return
	}
	stack := []Article{{url: startURL, depth: 0}}
	(*parentMap)[startURL] = ""
	(*depthMap)[startURL] = 0

	excludeRegex := regexp.MustCompile(`^/wiki/(File:|Category:|Special:|Portal:|Help:|Wikipedia:|Talk:|User:|Template:|Template_talk:|Main_Page)`)

	c := colly.NewCollector(colly.AllowedDomains("en.wikipedia.org"))

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("Request URL:", r.Request.URL, "Error:", err)
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		trimmedLink := strings.TrimPrefix(link, "https://en.wikipedia.org")
		if !excludeRegex.MatchString(trimmedLink) {
			link = utils.WikipediaUrlEncode(link)
			depth := (*depthMap)[e.Request.URL.String()] + 1
			if _, found := (*visited)[link]; !found || depth < (*depthMap)[link] {
				*totalLinksSearched += 1
				(*visited)[link] = true
				(*depthMap)[link] = depth
				stack = append(stack, Article{url: link, depth: depth})
				parentUrlEncoded := utils.WikipediaUrlEncode(e.Request.URL.String())
				(*cache)[parentUrlEncoded] = append((*cache)[parentUrlEncoded], Article{url: link, depth: depth})
				(*parentMap)[link] = parentUrlEncoded
				if link == targetURL {
					*targetFound = 1
				}
			}
		}
	})

	for len(stack) > 0 {
		if *targetFound == 1 {
			break
		}
		nextURL := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		if nextURL.depth < limit {
			c.Visit(utils.WikipediaUrlDecode(nextURL.url))
			*totalRequest += 1
		}
	}
}
