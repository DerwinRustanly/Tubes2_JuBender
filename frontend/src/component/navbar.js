import logo from "../assets/logo.svg"

export default function Navbar(){
    return(
        <div className="w-full fixed flex justify-between text-white font-inter p-4 font-bold text-xl"> 
            <div className="flex justify-center text-3 px-2 items-center gap-12">
                <img alt="" src={logo} width={50}></img>
                <span className="text-white">Finder</span>
                <span className="hover:text-white">About</span>
            </div>
            <div className="flex items-center"> Wikipedia Pathfinder</div>
        </div>
    )
}