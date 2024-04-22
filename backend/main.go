package main

import (
	"net/http"
	"runtime"

	"github.com/DerwinRustanly/Tubes2_JuBender/backend/routes"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "OPTIONS" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
			c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length")
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.AbortWithStatus(http.StatusOK)
		} else {
			c.Next()
		}
	}
}

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	router := gin.Default()
	router.Use(CORSMiddleware())
	routes.RegisterRoutes(router)
	router.Run(":8080")
}
