package main

import (
	"runtime"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/routes"
	"github.com/gin-gonic/gin"
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	router := gin.Default()
	routes.RegisterRoutes(router)
	router.Run(":8080")
}
