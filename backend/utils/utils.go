package utils

import (
	"fmt"
	"net/url"
	"strings"
)

func DecodePercent(str string) string {
	decodedString, err := url.QueryUnescape(str)
	if err != nil {
		fmt.Println("Error decoding string:", err)
		return ""
	}
	return decodedString
}

func FormatToTitle(str string) string {
	str = DecodePercent(str)
	return strings.ReplaceAll(str, "_", " ")
}
