import React, { Component } from 'react';
import { select, zoom as d3Zoom,zoomIdentity, drag as d3Drag, scaleOrdinal, schemeCategory10, forceSimulation, forceLink, forceManyBody,forceX,forceCollide,forceY,} from 'd3';


class ForceGraph extends Component {
  constructor(props) {
    super(props);
    this.graphRef = React.createRef();
  }

  componentDidMount() {
    this.initializeGraph();
    window.addEventListener('resize', this.resetGraph);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resetGraph);
  }

  initializeGraph() {
    
    const width = 650;
    const height = 500; // Set height to match your design
    
    const svg = select(this.graphRef.current)
      .attr('width', width)
      .attr('height', height);
    const groupBy = this.props.nodes.reduce((acc, node) => {
      acc[node.group] = (acc[node.group] || 0) + 1;
      return acc;
    }, {});
    
    // Compute the starting x position for each group
    let accumulatedWidth = 0;
    const groupStartingX = Object.keys(groupBy).reduce((acc, group) => {
      acc[group] = accumulatedWidth;
      accumulatedWidth += (groupBy[group] / this.props.nodes.length) * width;
      return acc;
    }, {});

    // Define color scale
    const color = scaleOrdinal(schemeCategory10); // You can define more specific groups if needed

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)  // Adjust this value to the sum of the node radius plus a small buffer
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
    .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#000');

        

    this.zoom = d3Zoom().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

    const g = svg.call(this.zoom).append('g');

    const links = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(this.props.links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('marker-end', 'url(#arrow)');

      const nodeGroups = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.props.nodes)
      .enter()
      .append('g');

    const nodes = nodeGroups.append('circle')
      .attr('r', 8)
      .attr('fill', d => color(d.group))
      .attr("stroke","#000")
      .attr("stroke-opacity", 100)
      .attr("stroke-width", 1)
      .on("click", (event, d) => { // Adding click event listener
        const url = `https://en.wikipedia.org/wiki/${d.id.replace(/ /g, "_")}`; // Create URL and replace spaces
        window.open(url, '_blank'); // Open the URL in a new tab
      })
      .call(d3Drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Append text to the node group
    nodeGroups.append('text')
      .attr('dx', -5)  // Offset position from the circle
      .attr('dy',15)  // Vertical alignment
      .style('fill', 'black')  // Set text color to black
      .style("font-size", "8px")
      .style("font-weight","bold")
      .text(d => d.id);  // Set text to node.id

      let legendData = {};
      this.props.nodes.forEach(node => {
          legendData[node.group] = color(node.group);
      });
  
      // Legend
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 120}, 20)`); // Position the legend
  
        Object.entries(legendData).forEach(([group, color], index, array) => {
          legend.append('rect')
            .attr('x', 0)
            .attr('y', index * 20)
            .attr('width', 10)
            .attr('height', 10)
            .style('fill', color);
      
          let labelText;
          if (index === 0) {
              labelText = ' Start Page';  // Text for the first element
          } else if (index === array.length - 1) {
              labelText = ' End Page';  // Text for the last element
          } else {
              labelText = ` ${group} degree away`;  // Text for all other elements
          }
      
          legend.append('text')
            .attr('x', 10)
            .attr('y', index * 20 + 9)
            .text(labelText)
            .style('font-size', '10px')
            .style('font-family', 'Arial, sans-serif');
      });

      
    
    const simulation = forceSimulation(this.props.nodes)
      .force('link', forceLink(this.props.links).id(d => d.id).distance(200)) // Keep distance short if you want a tighter graph
      .force('charge', forceManyBody().strength(-50)) // Play with strength for repulsion
      .force('x', forceX().x(d => {
        // Distribute nodes within the group range
        const startX = groupStartingX[d.group];
        const groupWidth = (groupBy[d.group] / this.props.nodes.length) * width;
        return startX + (groupWidth * Math.random()); // Randomly position within group bounds
      }).strength(1))
      .force('y', forceY(height / 2).strength(0.05))
      .force('collision', forceCollide().radius(20).iterations(4)) // Adjust radius and iterations as needed
      .on('tick', ticked)
      .on('end', () => {
        // After the simulation has run for a bit, fit the graph to the SVG viewport
        const bounds = this.calculateBounds(this.props.nodes);
        const dx = bounds.maxX - bounds.minX;
        const dy = bounds.maxY - bounds.minY;
        const x = (bounds.maxX + bounds.minX) / 2;
        const y = (bounds.maxY + bounds.minY) / 2;
        const scale = 0.9 / Math.max(dx / width, dy / height); // Add some padding
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        svg.transition()
        .duration(750)
        .call(this.zoom.transform, zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      });

    function ticked() {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

        nodeGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);
    }

    

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  calculateBounds(nodes) {
    // Calculate the bounds of the nodes array
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    return { minX, maxX, minY, maxY };
  }

  resetGraph = () => {
    select(this.graphRef.current).selectAll('*').remove();
    this.initializeGraph();
  }

  render() {
    return (
      <svg ref={this.graphRef} className="w-full h-full" />
    );
  }
}

export default ForceGraph;
