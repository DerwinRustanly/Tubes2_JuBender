package controller

import (
	"log"
	"net/http"
	"fmt"


	"encoding/json"

	"io/ioutil"

	"net/url"



	"github.com/DerwinRustanly/Tubes2_JuBender/backend/models"
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/services"
	"github.com/gin-gonic/gin"
)
func ApiSearchHandler(c *gin.Context) {
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
	c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    query := c.Query("query") // Query is a shortcut for c.Request.URL.Query().Get("query")
    if query == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'query' is missing"})
        return
    }

    recommendations, err := searchWikipedia(query)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"recommendations": recommendations})
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

func wrapToResponse(result map[string]any) models.Response {
	return models.Response{
		Start:             result["from"].(string),
		Target:            result["to"].(string),
		Time:              int(result["time_ms"].(int64)),
		Path:              result["path"].([]string),
		TotalLinkSearched: result["total_link_searched"].(int),
		TotalScrapRequest: result["total_scrap_request"].(int),
	}
}

func BfsController(c *gin.Context) {
	req := new(models.Request)
	if err := c.ShouldBindJSON(req); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	log.Printf("Received BFS request: %+v", req)
	bfsResult := services.HandleBFS(req.Start, req.Target)
	response := wrapToResponse(bfsResult)
	c.JSON(http.StatusOK, response)
}

func IdsController(c *gin.Context) {
	req := new(models.Request)
	if err := c.ShouldBindJSON(req); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	log.Printf("Received BFS request: %+v", req)
	bfsResult := services.HandleIDS(req.Start, req.Target)
	response := wrapToResponse(bfsResult)
	c.JSON(http.StatusOK, response)
}
