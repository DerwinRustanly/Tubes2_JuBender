package utils

import (
	"strings"
)

func FormatFromPercent(str string) string {
	str = strings.ReplaceAll(str, "_", " ")
	str = strings.ReplaceAll(str, "%26", "&")
	str = strings.ReplaceAll(str, "%27", "'")
	return str
}
