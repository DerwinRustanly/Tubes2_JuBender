package main

import (
	"runtime"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func setupRoute(router *gin.Engine) {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	config.AllowHeaders = []string{"Authorization, content-type"}
	router.Use(cors.New(config))
	router.Use(gin.Recovery())
	routes.RegisterRoutes(router)
}

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	router := gin.Default()
	setupRoute(router)
	router.Run(":8080")
}
