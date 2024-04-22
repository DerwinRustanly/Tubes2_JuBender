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
      nodeTitle, // given d in nodes, a title string // node stroke fill (if not using a group color encoding)
      nodeStroke = "#000", // node stroke color
      nodeStrokeWidth = 3, // node stroke width, in pixels
      nodeStrokeOpacity = 1, // node stroke opacity
      nodeRadius = 15, // node radius, in pixels
      nodeStrength,
      linkSource = ({ source }) => source, // given d in links, returns a node identifier string
      linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
      linkStroke = "#999", // link stroke color
      linkStrokeOpacity = 0.6, // link stroke opacity
      linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
      linkStrokeLinecap = "round", // link stroke linecap
      linkStrength,
      colors = d3.schemeTableau10, // an array of color strings, for the node groups
      width = 577, // outer width, in pixels
      height = 384, // outer height, in pixels
      invalidation, // when this promise resolves, stop the simulation
    } = {}
  ) {
    // Compute values.
  
    const depthColorMapping = [
      "#DE5D83", 
      "#5D8AA8",
      "#8A2BE2", 
      "#E6B422",
      "#2B8EAD",
      "#DE3163", 
      "#FF7F50", 
      "#40E0D0", 
      "#C71585", 
      "#6B8E23", 
      "#BDB76B", 
     
    ];
    
  
    console.log(nodes);
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
    nodes = d3.map(nodes, (node, i) => ({ id: N[i], depth:node.depth , x: node.x , y: node.y}));
    links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));
  
    // console.log(nodes);

    // const spacing = width / (nodes.length + 1); 
    // nodes.forEach((node, index) => {
    //   node.x = spacing * (index + 1); 
    //   console.log(spacing * (index + 1))
    //   node.y = height / 2; 
    //   node.fx = node.x; 
    //   node.fy = node.y;
    //   console.log(node);
    // });
  
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
  
    
    const labelPadding = 40; // Adjust this value to control the gap between the node and its label
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
      .style("font-size", "15px")
      .style("font-weight","bold")
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
  
      const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
        .attr("r", nodeRadius)
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("fill", d => depthColorMapping[d.depth] || "#999")
        .attr("stroke", nodeStroke)
        .attr("stroke-opacity", nodeStrokeOpacity)
        .attr("stroke-width", nodeStrokeWidth)
        .call(drag(simulation));
  
    if (W) link.attr("stroke-width", ({ index: i }) => W[i]);
    if (L) link.attr("stroke", ({ index: i }) => L[i]);
    // if (G) node.attr("fill", ({ index: i }) => color(G[i]));
    if (R) node.attr("r", ({ index: i }) => R[i]);
    if (T) node.append("title").text(({ index: i }) => T[i]);
    if (invalidation != null) invalidation.then(() => simulation.stop());
  
    function intern(value) {
      return value !== null && typeof value === "object"
        ? value.valueOf()
        : value;
    }
  
    function ticked() {
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
        text
          .attr("x", d => d.x)
          .attr("y", d => d.y + labelPadding);
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

export default ForceGraph