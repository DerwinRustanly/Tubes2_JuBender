import React, { useState, useEffect, useRef , useCallback } from "react";
import LoadingPopup from "../component/loading";
import swtch from "../assets/switch.svg";

import ForceGraph from "./graph";


function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export default function Finder() {
  const [algo, setAlgo] = useState("BFS");
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [isSrcTyping, setIsSrcTyping] = useState(false);
  const [isDestTyping, setIsDestTyping] = useState(false);
  const [noExactMatchSrc, setNoExactMatchSrc] = useState(false);
  const [noExactMatchDest, setNoExactMatchDest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [NotFound, setNotFound] = useState('');
  const [resultData, setResultData] = useState({});
  const [graphData,setGraphData] = useState({});
  const [pageDetail, setPageDetail] = useState([]);
  const [doneFetchImage,setDoneFetchImage] = useState(false);
  const graphContainerRef = useRef(null);
  useEffect(() => {
    if (isLoading) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
    } else {
      // Enable scrolling
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to ensure scrolling is enabled when the component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLoading]);

  const handleSwitch = () => {
    let temp = source;
    setSource(dest);
    setDest(temp);
  };

  const selectSourceSuggest = (value) => {
    setSource(value);
    setIsSrcTyping(false);
  };

  const selectDestSuggest = (value) => {
    setDest(value);
    setIsDestTyping(false);
  };

  // Function to update destination and its suggestions

  const handleSourceChange = (e) => {
    const value = e.target.value;
    setSource(value);

    if (value.length === 0) {
      setIsSrcTyping(false); // Immediately indicate that typing has stopped
      setSourceSuggestions([]); // Clear suggestions immediately
    } else {
      setIsSrcTyping(true); // Indicate that user is typing
      fetchSourceSuggestions(value); // Fetch suggestions with debouncing
    }
  };



// Example usage:


  const fetchSourceSuggestions = useCallback(debounce((value) => {
    // Update state to indicate typing has stopped
    if (value.length > 0) {
      fetch("http://localhost:8080/api/search?query=" + encodeURI(value))
        .then((response) => response.json())
        .then((data) => {
          if (data.recommendations) {
            const filteredRecommendations = data.recommendations.filter((rec) =>
              rec.toLowerCase().includes(value.toLowerCase())
            );
            setSourceSuggestions(filteredRecommendations);
            setNoExactMatchSrc(!filteredRecommendations.includes(value));
          } else {
            setSourceSuggestions([]);
            setNoExactMatchSrc(true);
          }
        })
        .catch((error) =>
          console.error("Error fetching source recommendations:", error)
        );
    } else {
      setSourceSuggestions([]);
    }
  }, 200),[]);

  const fetchDestSuggestions = useCallback(debounce((value) => {
    // Update state to indicate typing has stopped
    if (value.length > 0) {
      fetch("http://localhost:8080/api/search?query=" + encodeURI(value))
        .then((response) => response.json())
        .then((data) => {
          if (data.recommendations) {
            const filteredRecommendations = data.recommendations.filter((rec) =>
              rec.toLowerCase().includes(value.toLowerCase())
            );
            setDestSuggestions(filteredRecommendations);
            setNoExactMatchDest(!filteredRecommendations.includes(value));
          } else {
            setDestSuggestions([]);
            setNoExactMatchDest(true);
          }
        })
        .catch((error) =>
          console.error("Error fetching Dest recommendations:", error)
        );
    } else {
      setDestSuggestions([]);
    }
  }, 200), []);

  const handleDestChange = (e) => {
    const value = e.target.value;
    setDest(value);

    if (value.length === 0) {
      setIsDestTyping(false); // Immediately indicate that typing has stopped
      setDestSuggestions([]); // Clear suggestions immediately
    } else {
      setIsDestTyping(true); // Indicate that user is typing
      fetchDestSuggestions(value); // Fetch suggestions with debouncing
    }
  };



  const fetchWikipediaSummaryAndThumbnails = (titles) => {
    setDoneFetchImage(false);
    setPageDetail([]);
    const requests = titles.map(innerArray => {
      return Promise.all(innerArray.map(title => {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        return fetch(url)
          .then(response => response.json())
          .then(data => {
            return {
              title: title,
              imageUrl: data.thumbnail ? data.thumbnail.source : null,
              description: data.description,
              pageUrl: data.content_urls ? data.content_urls.desktop.page : null
            };
          })
          .catch(error => {
            console.error("Error fetching page summary and thumbnail for:", title, error);
            return {
              title: title,
              imageUrl: null,
              description: 'No description available.',
              pageUrl: null
            };
          });
      }));
    });
  
    Promise.all(requests.flat()).then(pageDetails => {
      console.log(pageDetails);
      setPageDetail(pageDetails);
      setDoneFetchImage(true);
    });

    
    console.log("halo");
  };
  
  
  const handleSearchBFS = async (multiple) => {
    console.log(multiple);
    setNotFound('');
    setResultData({});

    if (!source.trim()) {
      alert("Source cannot be empty.");
      return;
    }

    if (!dest.trim()){
      alert("Destination cannot be empty.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/bfs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: source.replace(/ /g, "_"),
          destination: dest.replace(/ /g, "_"),
          multiple: multiple
        }),
      });

      
      const data = await response.json();
      if (response.status == 404) {
        setIsLoading(false)
        setNotFound(data.error);
        return;
      } 
      
      // Handle the response data here, e.g., setting state to display the results
      setResultData(data);
      console.log(data);
      fetchWikipediaSummaryAndThumbnails(data.path);
      setGraphData(transformResultDataToGraphFormat(data));
      console.log(data);
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSearchIDS = async (multiple) => {
    setIsLoading(true);
    setNotFound('');
    setResultData({});
    try {
      const response = await fetch(`http://localhost:8080/ids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: source.replace(/ /g, "_"),
          destination: dest.replace(/ /g, "_"),
          multiple: multiple
        }),
      });
      const data = await response.json();

      if (response.status == 404) {
        setIsLoading(false)
        setNotFound(data.error);
        return;
      } 
      // Handle the response data here, e.g., setting state to display the results
      setResultData(data);
      fetchWikipediaSummaryAndThumbnails(data.path);
      setGraphData(transformResultDataToGraphFormat(data));
      console.log(data);
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setIsLoading(false);
    }
  };



  const transformResultDataToGraphFormat = (resultData) => {
    let nodesMap = new Map(); // Use a Map to easily update node information
    const links = [];
  
    // Iterate over the path to populate nodes and links
    resultData.path.forEach((elmt, depth) => {
      elmt.forEach((nodeId, idx) => {
        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, { id: nodeId, group: idx, depth: idx });
        } else {
          // Update depth if node already exists
          const node = nodesMap.get(nodeId);
          node.depth = Math.min(node.depth, idx);
          nodesMap.set(nodeId, node);
        }
  
        // Create a link to the next node if there is one
        if (idx < elmt.length - 1) {
          links.push({
            source: nodeId,
            target: elmt[idx + 1],
            value: 1, // Assign any value as needed
          });
        }
      });
    });
  
    // Convert the map of unique nodes into an array format
    const nodes = Array.from(nodesMap.values());
  
    console.log(nodes);
    return { nodes, links };
  };
  
  
  return (
    <div className="w-full min-h-screen flex flex-col  text-white items-center">
      {isLoading && <LoadingPopup />}
      <div className="w-[650px] font-inter my-60">
        <div className="flex justify-between items-center gap-8">
          <span className="font-bold text-2xl">Search Algorithm</span>
          <div className="flex gap-2">
            <button
              onClick={() => setAlgo("BFS")}
              className={`hover:bg-2 rounded-xl px-4 py-1 focus:bg-2 font-bold ${
                algo === "BFS" ? "bg-2" : "bg-1 text-3"
              }`}
            >
              BFS
            </button>
            <button
              onClick={() => setAlgo("IDS")}
              className={`hover:bg-2 rounded-xl px-4 py-1 focus:bg-2 font-bold ${
                algo === "IDS" ? "bg-2" : "bg-1 text-3"
              }`}
            >
              IDS
            </button>
          </div>
        </div>
        <div className="relative">
          <img
            alt=""
            width={40}
            onClick={handleSwitch}
            src={swtch}
            className="hover:scale-105 cursor-pointer border-1 border-[6px] rounded-xl bg-2 absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          ></img>
          <div className="relative flex flex-col justify-center text-3 mt-4 mb-2 py-4 px-8 bg-2 rounded-xl gap-2">
            <span>From</span>
            <form action="">
              <input
                type="text"
                className="text-2xl text-white font-bold border-none outline-none bg-transparent placeholder-3"
                value={source}
                onChange={handleSourceChange}
                placeholder={"Source"}
              />
              {isSrcTyping && sourceSuggestions.length > 0 && (
                <div className="hide-scrollbar absolute flex flex-col text-3 mb-2 py-4 bg-2 rounded-b-xl left-0 right-0 mt-2 z-20 border-t-2 border-white border-solid overflow-y-auto max-h-80">
                  <span className="px-8 mb-3">Recommendation</span>
                  {noExactMatchSrc && (
                    <div className="hover:bg-6 px-8 py-1">
                      <div
                        className="cursor-pointer text-2xl font-bold border-none outline-none bg-transparent text-white"
                        onClick={() => selectSourceSuggest(source)}
                      >
                        {source}
                      </div>
                      <span className="text-sm break-words">
                        en.wikipedia.org/wiki/{source.replace(/ /g, "_")}
                      </span>
                    </div>
                  )}
                  {sourceSuggestions.map((suggestion, index) => (
                    <div className="hover:bg-6 px-8 py-1">
                      <div
                        key={index}
                        className="cursor-pointer text-2xl font-bold border-none outline-none bg-transparent text-white"
                        onClick={() => selectSourceSuggest(suggestion)}
                      >
                        {suggestion}
                      </div>
                      <span className="text-sm break-words">
                        en.wikipedia.org/wiki/{suggestion.replace(/ /g, "_")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </form>
            <span className="text-sm ">
              en.wikipedia.org/wiki/{source.replace(/ /g, "_")}
            </span>
          </div>
          <div className="relative flex flex-col justify-center text-3 mb-2 py-4 px-8 bg-2 rounded-xl gap-2">
            <span>To</span>
            <form action="">
              <input
                type="text"
                className="text-2xl text-white font-bold border-none outline-none bg-transparent placeholder-3"
                value={dest}
                onChange={handleDestChange}
                placeholder={"Destination"}
              />
              {isDestTyping && destSuggestions.length > 0 && (
                <div className="hide-scrollbar absolute flex flex-col text-3 mb-2 py-4 bg-2 rounded-b-xl left-0 right-0 mt-2 z-20 border-t-2 border-white border-solid overflow-y-auto max-h-80">
                  <span className="px-8 mb-3">Recommendation</span>
                  {noExactMatchDest && (
                    <div className="hover:bg-6 px-8 py-1">
                      <div
                        className="cursor-pointer text-2xl font-bold border-none outline-none bg-transparent text-white"
                        onClick={() => selectDestSuggest(dest)}
                      >
                        {dest}
                      </div>
                      <span className="text-sm break-words">
                        en.wikipedia.org/wiki/{source.replace(/ /g, "_")}
                      </span>
                    </div>
                  )}
                  {destSuggestions.map((suggestion, index) => (
                    <div className="hover:bg-6 px-8 py-1">
                      <div
                        key={index}
                        className="cursor-pointer text-2xl font-bold border-none outline-none bg-transparent text-white"
                        onClick={() => selectDestSuggest(suggestion)}
                      >
                        {suggestion}
                      </div>
                      <span className="text-sm">
                        en.wikipedia.org/wiki/{suggestion.replace(/ /g, "_")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </form>
            <span className="text-sm">
              en.wikipedia.org/wiki/{dest.replace(/ /g, "_")}
            </span>
          </div>
        </div>
        <div className="flex gap-[5px] justify-center">
        <button
          className="bg-4 text-5  w-full flex justify-center px-4 py-2 rounded-xl font-bold"
          onClick={algo === "BFS" ? () => handleSearchBFS(false) : () => handleSearchIDS(false)}
        >
          Search Single Path
        </button>
        <button
          className="bg-4 text-5 w-full flex justify-center px-4 py-2 rounded-xl font-bold"
          onClick={algo === "BFS" ? () => handleSearchBFS(true) : () => handleSearchIDS(true)}
        >
          Search Multiple Path
        </button>
        </div>
        
        {
          resultData.path && resultData.path.length > 0 && (
            <div>
              <div className="w-full flex flex-col gap-2 text-lg font-bold text-white mt-3 px-1">
                <span>Found {resultData.path.length} paths with depth of {resultData.path[0].length - 1 }</span>
                <div className="w-full flex flex-row justify-between items-center">
                  <div className="text-3">Algorithm</div>
                  <div>{algo}</div>
                </div>
                <div className="w-full flex flex-row justify-between items-center">
                  <div className="text-3">From</div>
                  <div>{resultData.from}</div>
                </div>
                <div className="w-full flex flex-row justify-between items-center">
                  <div className="text-3">To</div>
                  <div>{resultData.to}</div>
                </div>
                <div className="w-full flex flex-row justify-between items-center">
                  <div className="text-3">Duration(ms)</div>
                  <div>{resultData.time_ms}</div>
                </div>
                <div className="w-full flex flex-row justify-between items-center">
                  <div className="text-3">Total Article Searched</div>
                  <div>{resultData.total_link_searched}</div>
                </div>
                <div className="w-full flex flex-row justify-between items-center">
                  <div className="text-3">Total Scraped Request</div>
                  <div>{resultData.total_scrap_request}</div>
                </div>
              </div>

              <div className="w-full h-[500px] rounded-xl bg-white mt-4">
                <ForceGraph nodes={graphData.nodes} links={graphData.links} />
              </div>

              {/* <div className="mt-8 w-full">
                <h2 className="text-2xl font-bold mb-4">Top Shortest Paths</h2>
                <div className="w-full pt-4 flex flex-col gap-2">
                  <div className="w-full flex flex-row items-center mb-2 gap-4">
                    <div className="flex justify-center items-center text-5 bg-4 py-4 px-6 text-center rounded-xl">
                      <span className="text-xl font-bold">1</span>
                    </div>
                    <div className="break-all text-3 font-bold text-lg">
                      {resultData.path.join(' → ')}
                    </div>
                  </div>
                </div>
              </div> */}

              <div className="w-full p-4">
                <h2 className="text-2xl font-bold mb-4">Top Shortest Paths</h2>
                <div className="w-full flex flex-row gap-4 flex-wrap items-center justify-center">
                  {doneFetchImage ? (
                    <>
                    {pageDetail.map((elmt, index) => (
                      <div key={index} className="flex flex-col rounded-lg border w-[300px]">
                        {elmt.map((page, idx) => (
                          <a href={page.pageUrl} target="_blank" rel="noopener noreferrer" className="" key={idx}>
                            <div className="p-4 border-b flex flex-row gap-4 items-center">
                              {page.imageUrl ? (
                                <img src={page.imageUrl} alt={page.title} className="w-10 h-10 object-cover" />
                              ) : (
                                <img src="not-found-image.jpeg" alt={page.title} className="w-10 h-10 object-cover" />
                              )}
                              <div className="flex flex-col justify-center gap-2">
                                <h3 className="text-lg font-bold leading-4">{page.title}</h3>
                                <p className="text-3 font-bold text-sm leading-3">{page.description}</p>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ))}
                  </>
                  
                  ):(
                    <>
                      {resultData.path.map((elmt, index) => (
                        <div key={index} className="flex flex-col rounded-lg border w-[300px]">
                          {elmt.map((page, idx) => (
                            <a href={`https://en.wikipedia.org/wiki/${page}`} target="_blank" rel="noopener noreferrer" className="" key={idx}>
                              <div className="p-4 border-b flex flex-row gap-4 items-center">
                                
                                  <img src="not-found-image.jpeg" alt={page.title} className="w-10 h-10 object-cover" />
                                
                                <div className="flex flex-col justify-center">
                                  <h3 className="text-lg font-bold leading-4">{page}</h3>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ))}
                    </>)}
                  
                </div>
              </div>
            </div>
          )
        }

        {
          NotFound.length > 0 && (
            <div className="w-full text-lg flex items-center justify-center mt-4 font-bold">
              {NotFound}
            </div>
          )
        }

</div></div>)};
