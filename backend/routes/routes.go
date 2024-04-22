package routes

import (
	"github.com/DerwinRustanly/Tubes2_JuBender/backend/controller"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.Engine) {
	router.POST("/bfs", controller.BfsController)
	router.POST("/ids", controller.IdsController)
}
