package models

type SearchResponse struct {
	Query struct {
		Search []struct {
			Title string `json:"title"`
			Snippet string `json:"snippet"`
		} `json:"search"`
	} `json:"query"`
}

type Request struct {
	Start  string `json:"from"`
	Target string `json:"to"`
}

type Response struct {
	Time              int      `json:"time_ms"`
	Start             string   `json:"from"`
	Target            string   `json:"to"`
	Path              []string `json:"path"`
	TotalLinkSearched int      `json:"total_link_searched"`
	TotalScrapRequest int      `json:"total_scrap_request"`
}
