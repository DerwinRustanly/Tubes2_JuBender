package cache

import (
	"log"
	"os"

	"github.com/mailru/easyjson"
)

var GlobalCache *Cache
var writeCache bool

func InitGlobalCache(read bool, write bool) {
	GlobalCache = NewCache()
	if read {
		if err := GlobalCache.LoadFromFile("cache/cache.json"); err != nil {
			log.Fatalf("Failed to load cache from file: %v", err)
		}
	}
	writeCache = write
}

func IsWriteCache() bool {
	return writeCache
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

func (c *Cache) SaveToFile(filename string) error {
	fileContents, err := easyjson.Marshal(c)
	if err != nil {
		return err
	}
	return os.WriteFile(filename, fileContents, 0644)
}

func NewCache() *Cache {
	return &Cache{
		Data: make(map[string][]string),
	}
}

func SaveCache() {
	if err := GlobalCache.SaveToFile("cache/cache.json"); err != nil {
		log.Fatalf("Failed to save cache to file: %v", err)
	}
}
