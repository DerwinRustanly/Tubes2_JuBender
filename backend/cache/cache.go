package cache

import (
	"log"
	"os"

	"github.com/mailru/easyjson"
)

var GlobalCache *Cache

func InitGlobalCache(read bool) {
	GlobalCache = NewCache()
	if read {
		if err := GlobalCache.LoadFromFile("cache/cache.json"); err != nil {
			log.Fatalf("Failed to load cache from file: %v", err)
		}
	}
}

type Cache struct {
	Data map[string][]string `json:"data"`
}

func (c *Cache) LoadFromFile(filename string) error {
	fileContents, err := os.ReadFile(filename)
	if err != nil {
		return err
	}
	return easyjson.Unmarshal(fileContents, c)
}

func NewCache() *Cache {
	return &Cache{
		Data: make(map[string][]string),
	}
}
