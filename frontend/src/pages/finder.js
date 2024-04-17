import swtch from "../assets/switch.svg"

export default function Finder() {
  return (
    <div className="w-full min-h-screen flex flex-col justify-center text-white items-center">
      <div>
        <div className="flex justify-between items-center gap-8">
          <span className="font-bold text-lg">Search Algorithm</span>
          <div className="flex gap-2">
            <button className="hover:bg-2 rounded-xl px-4 py-1 font-bold">
              BFS
            </button>
            <button className="hover:bg-2 rounded-xl px-4 py-1  font-bold">
              IDS
            </button>
          </div>
        </div>
        <div className="flex flex-col justify-center text-3 mt-4 mb-2 py-4 px-8 bg-2 rounded-xl">
          <span>From</span>
          <form action="">
            <input
              type="text"
              className="text-2xl font-bold border-none outline-none bg-transparent"
              defaultValue={"Source"}
            />
          </form>
          <span className="text-sm">en.wikipedia.org</span>
        </div>
        <div className="flex flex-col justify-center text-3 mb-4 py-4 px-8 bg-2 rounded-xl">
          <span>To</span>
          <form action="">
            <input
              type="text"
              className="text-2xl font-bold border-none outline-none bg-transparent"
              defaultValue={"Destination"}
            />
          </form>
          <span className="text-sm">en.wikipedia.org</span>
        </div>
      </div>
    </div>
  );
}
