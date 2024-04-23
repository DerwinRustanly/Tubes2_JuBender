package services

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/cache"
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/models"
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/utils"
	"github.com/PuerkitoBio/goquery"
)

func HandleIDS(startTitle, targetTitle string) map[string]any {
	startURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(startTitle)
	targetURL := "https://en.wikipedia.org/wiki/" + utils.EncodeToPercent(targetTitle)
	parentMap := make(map[string]string)
	totalLinksSearched := 0
	totalRequest := 0
	startTime := time.Now()

	ids(startURL, targetURL, &parentMap, &totalLinksSearched, &totalRequest, &cache.GlobalCache.Data)

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

func ids(startURL, targetURL string, parentMap *map[string]string, totalLinksSearched *int, totalRequest *int, cache *map[string][]string) {
	excludeRegex := regexp.MustCompile(`^/wiki/(File:|Category:|Special:|Portal:|Help:|Wikipedia:|Talk:|User:|Template:|Template_talk:|Main_Page)`)
	checkMap := make(map[string]bool)
	targetFound := false
	i := 0
	for !targetFound {
		targetFound = dls(startURL, targetURL, i, &checkMap, parentMap, totalLinksSearched, totalRequest, cache, excludeRegex)
		fmt.Println("Done iterate:", i)
		i++
	}
}

func scrapArticles(decodedUrl string, cache *map[string][]string, total_scrap_request *int, excludeRegex *regexp.Regexp) []string {
	if links, found := (*cache)[utils.WikipediaUrlEncode(decodedUrl)]; found {
		// fmt.Println("Cache Hit")
		return links
	}

	res, err := http.Get(decodedUrl)
	if err != nil {
		log.Printf("Error fetching the page: %s", err)
		return nil
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		log.Printf("Status code error: %d %s", res.StatusCode, res.Status)
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		log.Printf("Error parsing the HTML document: %s", err)
		return nil
	}

	seenLinks := make(map[string]bool)
	var links []string
	doc.Find("a[href]").Each(func(i int, s *goquery.Selection) {
		link, exists := s.Attr("href")
		if !exists || !strings.HasPrefix(link, "/wiki") || excludeRegex.MatchString(link) {
			return
		}
		link = utils.WikipediaUrlEncode("https://en.wikipedia.org" + link)
		if _, seen := seenLinks[link]; !seen {
			seenLinks[link] = true
			links = append(links, link)
		}
	})

	(*cache)[utils.WikipediaUrlEncode(decodedUrl)] = links
	*total_scrap_request += 1
	return links
}

func wrapToArticle(parent models.Article, child []string, parentMap *map[string]string) []models.Article {
	var result []models.Article
	for _, link := range child {
		result = append(result, models.Article{Url: link, Depth: parent.Depth + 1})
		if _, found := (*parentMap)[link]; !found {
			(*parentMap)[link] = parent.Url
		}
	}
	return result
}

func dls(startURL string, targetURL string, limit int, checkMap *map[string]bool, parentMap *map[string]string, totalLinksSearched *int, totalRequest *int, cache *map[string][]string, excludeRegex *regexp.Regexp) bool {
	if startURL == targetURL {
		(*parentMap)[targetURL] = startURL
		*totalLinksSearched = 1
		return true
	}

	visited := make(map[string]bool)
	stack := []models.Article{{Url: startURL, Depth: 0}}
	(*parentMap)[startURL] = ""

	for len(stack) > 0 {
		nextArticle := stack[len(stack)-1]
		nextURL := nextArticle.Url
		stack = stack[:len(stack)-1]

		if _, seen := (visited)[nextURL]; seen {
			continue
		}

		if nextURL == targetURL {
			fmt.Println("Found:", nextURL)
			return true
		}

		if _, checked := (*checkMap)[nextURL]; !checked {
			*totalLinksSearched += 1
		}
		(*checkMap)[nextURL] = true

		if nextArticle.Depth == limit {
			continue
		}

		scrapResult := scrapArticles(utils.WikipediaUrlDecode(nextURL), cache, totalRequest, excludeRegex)
		visited[nextURL] = true
		stack = append(stack, wrapToArticle(nextArticle, scrapResult, parentMap)...)
		// fmt.Println(nextArticle.depth, nextArticle.url)
	}
	return false
}
