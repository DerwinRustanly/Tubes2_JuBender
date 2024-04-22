package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/utils"
	"github.com/gocolly/colly/v2"
)

func HandleIDS(startTitle string, targetTitle string) map[string]any {
	parentMap := make(map[string]string)
	totalLinksSearched := 0
	totalRequest := 0
	startURL := "https://en.wikipedia.org/wiki/" + startTitle
	targetURL := "https://en.wikipedia.org/wiki/" + targetTitle
	startTime := time.Now()
	ids(startURL, targetURL, &parentMap, &totalLinksSearched, &totalRequest)
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

func ids(startURL string, targetURL string, parentMap *map[string]string, totalLinksSearched *int, totalRequest *int) {
	if startURL == targetURL {
		(*parentMap)[targetURL] = startURL
		*totalLinksSearched = 1
		return
	}

	cache := make(map[string][]Article)
	visited := make(map[string]bool)
	targetFound := 0
	i := 1

	for {
		dls(startURL, targetURL, parentMap, totalLinksSearched, totalRequest, i, &cache, &visited, &targetFound)
		if targetFound == 0 {
			i += 1
		} else {
			return
		}
	}

}

func dls(startURL string, targetURL string, parentMap *map[string]string, totalLinksSearched *int, totalRequest *int, limit int, cache *map[string][]Article, visited *map[string]bool, targetFound *int) {
	if startURL == targetURL || limit == 0 {
		(*parentMap)[targetURL] = startURL
		*totalLinksSearched = 1
		return
	}

	var stack []Article
	var temp_stack []Article
	currentDepth := 0

	excludeRegex := regexp.MustCompile(`^/wiki/(File:|Category:|Special:|Portal:|Help:|Wikipedia:|Talk:|User:|Template:|Template_talk:|Main_Page)`)

	c := colly.NewCollector(
		colly.AllowedDomains("en.wikipedia.org"),
	)

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("Request URL:", r.Request.URL, "Error:", err)
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		trimmedLink := strings.TrimPrefix(link, "https://en.wikipedia.org")
		if strings.HasPrefix(trimmedLink, "/wiki/") && !excludeRegex.MatchString(trimmedLink) {
			if !(*visited)[link] {
				temp_stack = append(temp_stack, Article{url: link, depth: currentDepth + 1})
				(*visited)[link] = true
				(*cache)[e.Request.URL.String()] = append((*cache)[e.Request.URL.String()], Article{url: link, depth: currentDepth + 1})
				*totalLinksSearched += 1
				(*parentMap)[link] = e.Request.URL.String()
				if link == targetURL {
					fmt.Println(">> Found at:", e.Request.URL.String())
					fmt.Println(">  Target:", link)
					*targetFound += 1
					return
				}
			}
		}
	})

	// Init
	stack = []Article{{url: startURL, depth: 0}}
	(*parentMap)[startURL] = ""

	for *targetFound == 0 {
		temp_stack = []Article{}
		nextURL := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if nextURL.depth > currentDepth {
			currentDepth = nextURL.depth
		}
		if currentDepth == limit {
			return
		}
		if (*cache)[nextURL.url] == nil {
			c.Visit(nextURL.url)
			*totalRequest += 1
		} else {
			temp_stack = (*cache)[nextURL.url]
		}
		reverseStack(&temp_stack)
		stack = append(stack, temp_stack...)
	}
}

func reverseStack(stack *[]Article) {
	for i, j := 0, len(*stack)-1; i < j; i, j = i+1, j-1 {
		(*stack)[i], (*stack)[j] = (*stack)[j], (*stack)[i]
	}
}
