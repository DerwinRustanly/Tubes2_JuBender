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
	return url.QueryEscape(str)
}

func FormatToTitle(str string) string {
	str = DecodeToPercent(str)
	return strings.ReplaceAll(str, "_", " ")
}
