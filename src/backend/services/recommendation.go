package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

func GetWikipediaRecommendation(input string) ([]string, error) {
	encodedInput := url.QueryEscape(input)
	apiURL := fmt.Sprintf("https://en.wikipedia.org/w/api.php?action=opensearch&search=%s&format=json", encodedInput)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var searchResult []interface{}
	err = json.Unmarshal(body, &searchResult)
	if err != nil {
		return nil, err
	}

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
