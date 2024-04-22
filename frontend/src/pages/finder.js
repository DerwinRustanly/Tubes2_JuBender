import React, { useState, useEffect, useRef } from "react";
import LoadingPopup from "../component/loading";
import swtch from "../assets/switch.svg";
import * as d3 from "d3";

function ForceGraph(
  {
    nodes, // an iterable of node objects (typically [{id}, …])
    links, // an iterable of link objects (typically [{source, target}, …])
  },
  {
    nodeId = (d) => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "#DE5D83", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 10, // node radius, in pixels
    nodeStrength,
    linkSource = ({ source }) => source, // given d in links, returns a node identifier string
    linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    invalidation, // when this promise resolves, stop the simulation
  } = {}
) {
  // Compute values.

  const spacing = width / (nodes.length + 1); // Calculate spacing based on the width and number of nodes
  nodes.forEach((node, index) => {
    node.x = spacing * (index + 1); // Space nodes evenly along the x-axis
    node.y = height / 2; // Align all nodes at the middle of the y-axis
    node.fx = node.x; // Fixing node position along x-axis
    node.fy = node.y; // Fixing node position along y-axis
  });

  const N = d3.map(nodes, nodeId).map(intern);
  const R = typeof nodeRadius !== "function" ? null : d3.map(nodes, nodeRadius);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
  const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W =
    typeof linkStrokeWidth !== "function"
      ? null
      : d3.map(links, linkStrokeWidth);
  const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (_, i) => ({ id: N[i] }));
  links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(links).id(({ index: i }) => N[i]);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", d3.forceCenter())
    .force("repel", d3.forceManyBody().strength(-500)) // Negative strength results in repulsion
    .on("tick", ticked);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const labelPadding = 20; // Adjust this value to control the gap between the node and its label
  const text = svg
    .append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y + nodeRadius + labelPadding) // Use the node's radius plus some padding
    .text((d) => d.id) // Assuming nodes have an 'id' property
    .style("font-size", "12px")
    .style("fill", "#333")
    .style("text-anchor", "middle"); // Center the text horizontally

  const link = svg
    .append("g")
    .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
    .attr("stroke-opacity", linkStrokeOpacity)
    .attr(
      "stroke-width",
      typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null
    )
    .attr("stroke-linecap", linkStrokeLinecap)
    .selectAll("line")
    .data(links)
    .join("line");

  const node = svg
    .append("g")
    .attr("fill", nodeFill)
    .attr("stroke", nodeStroke)
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("stroke-width", nodeStrokeWidth)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", nodeRadius)
    .call(drag(simulation));

  if (W) link.attr("stroke-width", ({ index: i }) => W[i]);
  if (L) link.attr("stroke", ({ index: i }) => L[i]);
  if (G) node.attr("fill", ({ index: i }) => color(G[i]));
  if (R) node.attr("r", ({ index: i }) => R[i]);
  if (T) node.append("title").text(({ index: i }) => T[i]);
  if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value) {
    return value !== null && typeof value === "object"
      ? value.valueOf()
      : value;
  }

  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    text.attr("x", (d) => d.x).attr("y", (d) => d.y + labelPadding);
  }

  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      // Optionally unfix positions to allow dragging:
      // event.subject.fx = null;
      // event.subject.fy = null;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      // event.subject.fx = null;
      // event.subject.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return Object.assign(svg.node(), { scales: { color } });
}
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
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
  const [resultData, setResultData] = useState({});
  const [graphData,setGraphData] = useState({});
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

  const fetchSourceSuggestions = debounce((value) => {
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
  }, 300);

  const fetchDestSuggestions = debounce((value) => {
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
  }, 300);

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
  const handleSearchBFS = async () => {
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
        }),
      });
      const data = await response.json();
      // Handle the response data here, e.g., setting state to display the results
      setResultData(data);
      setGraphData(transformResultDataToGraphFormat(data));
      console.log(data);
      console.log(Array.isArray(data));
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSearchIDS = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/ids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: source.replace(/ /g, "_"),
          destination: dest.replace(/ /g, "_"),
        }),
      });
      const data = await response.json();
      // Handle the response data here, e.g., setting state to display the results
      console.log(data);
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const transformResultDataToGraphFormat = (resultData) => {
    const nodes = new Set();
    const links = [];
  
    // Assuming resultData.path is an array of node names representing a single path
    resultData.path.forEach((node, index) => {
      nodes.add(node); // Add node to set of unique nodes
  
      // Create a link to the next node if there is one
      if (index < resultData.path.length - 1) {
        links.push({
          source: node,
          target: resultData.path[index + 1],
          value: 1, // or any other value you might want to assign
        });
      }
    });
  
    // Convert the set of unique nodes into the desired format
    const formattedNodes = Array.from(nodes).map((nodeId) => ({
      id: nodeId,
      group: 1, // Assign all nodes to the same group, or customize as needed
    }));
  
    return { nodes: formattedNodes, links };
  };

  useEffect(() => {
    if (!graphContainerRef.current || !graphData.nodes || !graphData.links) {
      return;
    }
  
    // Clear previous SVG content
    graphContainerRef.current.innerHTML = '';
  
    // Generate the graph with the updated data
    const forceGraph = ForceGraph({
      nodes: graphData.nodes,
      links: graphData.links,
      // other configurations as needed
    }, {
      // configuration object (if needed)
    });
  
    // Append the new graph to the container
    graphContainerRef.current.appendChild(forceGraph);
  
    // Cleanup function to stop the simulation when the component unmounts
    return () => {
      // Any cleanup logic for the force graph
    };
  }, [graphData]);

  
  return (
    <div className="w-full min-h-screen flex flex-col  text-white items-center">
      {isLoading && <LoadingPopup />}
      <div className="w-[577px] font-inter my-60">
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
        <button
          className="bg-4 w-full text-5 flex justify-center px-4 py-2 rounded-xl font-bold"
          onClick={algo === "BFS" ? handleSearchBFS : handleSearchIDS}
        >
          Search Path
        </button>
        
        {
          resultData.path && resultData.path.length > 0 && (
            <div>
              <div className="w-full flex flex-col gap-2 text-lg font-bold text-white mt-3 px-1">
                <span>Found 1 paths with depth of {resultData.path.length}</span>
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

              <div ref={graphContainerRef} className="w-full h-96 rounded-xl bg-white mt-4"></div>

              <div className="mt-8 w-full">
                <h2 className="text-2xl font-bold mb-4">Top Shortest Paths</h2>
                <div className="w-full pt-4 flex flex-col gap-2">
                  <div className="w-full flex flex-row items-center mb-2 gap-4">
                    <div className="flex justify-center items-center text-5 bg-4 py-4 px-6 text-center rounded-xl">
                      <span className="text-xl font-bold">1</span>
                    </div>
                    <div className="break-all text-3 text-lg">
                      {resultData.path.join(' → ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

</div></div>)};
