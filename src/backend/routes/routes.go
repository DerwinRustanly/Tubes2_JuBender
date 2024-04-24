package routes

import (
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/controllers"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.Engine) {
	router.GET("/api/search", controllers.SearchRecommendationController)
	router.POST("/bfs", controllers.BfsController)
	router.POST("/ids", controllers.IdsController)
}
