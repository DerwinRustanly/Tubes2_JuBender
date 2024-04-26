package models

type Request struct {
	Start    string `json:"source"`
	Target   string `json:"destination"`
	Multiple bool   `json:"multiple"`
}

type Response struct {
	Time              int        `json:"time_ms"`
	Start             string     `json:"from"`
	Target            string     `json:"to"`
	Path              [][]string `json:"path"`
	TotalLinkSearched int        `json:"total_link_searched"`
	TotalScrapRequest int        `json:"total_scrap_request"`
}

type Article struct {
	Url   string
	Depth int
}
