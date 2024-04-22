package utils

import (
	"fmt"
	"net/url"
	"strings"
)

func DecodeToPercent(str string) string {
	decodedString, err := url.QueryUnescape(str)
	if err != nil {
		fmt.Println("Error decoding string:", err)
		return ""
	}
	return decodedString
}

func EncodeToPercent(str string) string {
	return url.QueryEscape(DecodeToPercent(str))
}

func FormatToTitle(str string) string {
	str = DecodeToPercent(str)
	return strings.ReplaceAll(str, "_", " ")
}

func WikipediaUrlDecode(url string) string {
	return "https://en.wikipedia.org/wiki/" + DecodeToPercent(strings.TrimPrefix(url, "https://en.wikipedia.org/wiki/"))
}

func WikipediaUrlEncode(url string) string {
	return "https://en.wikipedia.org/wiki/" + EncodeToPercent(strings.TrimPrefix(url, "https://en.wikipedia.org/wiki/"))
}
