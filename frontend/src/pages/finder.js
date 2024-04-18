import { useState } from "react";
import swtch from "../assets/switch.svg";

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

  
  const [algo, setAlgo] = useState("BFS")
  const [source, setSource] = useState("")
  const [dest, setDest] = useState("")
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [isSrcTyping, setIsSrcTyping] = useState(false);
  const [isDestTyping, setIsDestTyping] = useState(false);
  const handleSwitch = () => {
    let temp = source;
    setSource(dest);
    setDest(temp);
  }

  const selectSourceSuggest = (value) => {
    setSource(value);
    setIsSrcTyping(false);
  }

  const selectDestSuggest = (value) => {
    setDest(value);
    setIsDestTyping(false);
  }

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
      fetch('http://localhost:8080/api/search?query=' + encodeURI(value))
        .then(response => response.json())
        .then(data => {
          if (data.recommendations) {
            setSourceSuggestions(data.recommendations);
          }
        })
        .catch(error => console.error('Error fetching source recommendations:', error));
    } else {
      setSourceSuggestions([]);
    }
  }, 300); 

  const fetchDestSuggestions = debounce((value) => {
    // Update state to indicate typing has stopped
   if (value.length > 0) {
     fetch('http://localhost:8080/api/search?query=' + encodeURI(value))
       .then(response => response.json())
       .then(data => {
         if (data.recommendations) {
           setDestSuggestions(data.recommendations);
         }
       })
       .catch(error => console.error('Error fetching Dest recommendations:', error));
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

  
  return (
    <div className="w-full min-h-screen flex flex-col justify-center text-white items-center">
      <div>
        <div className="flex justify-between items-center gap-8">
          <span className="font-bold text-lg">Search Algorithm</span>
          <div className="flex gap-2">
            <button onClick={()=>setAlgo("BFS")} className={`hover:bg-2 rounded-xl px-4 py-1 focus:bg-2 font-bold ${algo === "BFS"? "bg-2":"bg-1 text-3"}`}>
              BFS
            </button>
            <button onClick={()=>setAlgo("IDS")} className={`hover:bg-2 rounded-xl px-4 py-1 focus:bg-2 font-bold ${algo === "IDS"? "bg-2":"bg-1 text-3"}`}>
              IDS
            </button>
          </div>
        </div>
        <div>
          <img alt="" width={40} onClick={handleSwitch} src={swtch} className="hover:scale-105 cursor-pointer border-1 border-[6px] rounded-xl bg-2 absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></img>
          <div className="relative flex flex-col justify-center text-3 mt-4 mb-2 py-4 px-8 bg-2 rounded-xl">
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
                <div className="absolute flex flex-col text-3 mb-2 py-4 bg-2 rounded-xl left-0 right-0 mt-5 z-20 border-t-2 border-white border-solid overflow-y-auto max-h-60">
                  <span className="px-8 mb-3">Recommendation</span>
                  {sourceSuggestions.map((suggestion, index) => (
                    <div className="hover:bg-6 px-8 py-1">
                      <div key={index} className="cursor-pointer text-2xl font-bold border-none outline-none bg-transparent text-white" onClick={() => selectSourceSuggest(suggestion)}>
                        {suggestion}
                      </div>
                      <span className="text-sm break-words">en.wikipedia.org/wiki/{suggestion.replace(/ /g, "_")}</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
            <span className="text-sm ">en.wikipedia.org/wiki/{source.replace(/ /g, "_")}</span>
          </div>
          <div className="relative flex flex-col justify-center text-3 mb-2 py-4 px-8 bg-2 rounded-xl">
            <span>To</span>
            <form action="">
              <input
                type="text"
                className="text-2xl text-white font-bold border-none outline-none bg-transparent placeholder-3"
                value = {dest}
                onChange={handleDestChange}
                placeholder={"Destination"}
              />
              {isDestTyping && destSuggestions.length > 0 && (
                <div className="absolute flex flex-col text-3 mb-2 py-4 bg-2 rounded-xl left-0 right-0 mt-5 z-20 border-t-2 border-white border-solid overflow-y-auto max-h-60">
                  <span className="px-8 mb-3">Recommendation</span>
                  {destSuggestions.map((suggestion, index) => (
                    <div className="hover:bg-6 px-8 py-1">
                      <div key={index} className="cursor-pointer text-2xl font-bold border-none outline-none bg-transparent text-white" onClick={() => selectDestSuggest(suggestion)}>
                        {suggestion}
                      </div>
                      <span className="text-sm">en.wikipedia.org/wiki/{suggestion.replace(/ /g, "_")}</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
            <span className="text-sm">en.wikipedia.org/wiki/{dest.replace(/ /g, "_")}</span>
          </div>
        </div>
        <button className="bg-4 w-full text-5 flex justify-center px-4 py-2 rounded-xl font-bold">
          Search Path
        </button>
      </div>
    </div>
  );
}
