package controller

import (
	"log"
	"net/http"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/models"
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/services"
	"github.com/gin-gonic/gin"
)

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
	// Implement IDS handling if necessary
}
