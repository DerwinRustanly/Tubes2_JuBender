import { useState } from "react";
import swtch from "../assets/switch.svg";

export default function Finder() {
  const [algo, setAlgo] = useState("BFS")
  const [source, setSource] = useState("")
  const [dest, setDest] = useState("")
  const handleSwitch = () => {
    let temp = source;
    setSource(dest);
    setDest(temp);
  }
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
                className="text-2xl font-bold border-none outline-none bg-transparent placeholder-3"
                value={source}
                onChange={(e)=>setSource(e.target.value)}
                placeholder={"Source"}
              />
            </form>
            <span className="text-sm">en.wikipedia.org/wiki/{source.replace(/ /g, "_")}</span>
          </div>
          <div className="flex flex-col justify-center text-3 mb-2 py-4 px-8 bg-2 rounded-xl">
            <span>To</span>
            <form action="">
              <input
                type="text"
                className="text-2xl font-bold border-none outline-none bg-transparent placeholder-3"
                value = {dest}
                onChange={(e)=>setDest(e.target.value)}
                placeholder={"Destination"}
              />
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
