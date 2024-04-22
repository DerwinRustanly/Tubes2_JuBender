import { Link, useLocation} from "react-router-dom"
import logo from "../assets/logo.svg"
import { useState, useEffect} from "react"

export default function Navbar(){
    const location = useLocation();
    const [page, setPage] = useState(location.pathname);

    // Update state if the location changes
    useEffect(() => {
        setPage(location.pathname);
    }, [location]);
    return(
        <div className="w-full fixed flex justify-between text-white font-inter py-4 px-8 font-bold text-xl bg-1 z-50"> 
            <div className="flex justify-center text-3 px-2 items-center gap-12">
                <img alt="" src={logo} width={40}></img>
                <Link to={"/"}><span className={`hover:text-white ${page === "/"? "text-white": "text-3"}`} onClick={()=>setPage('/')}>Finder</span></Link>
                <Link to={"/about"}><span className={`hover:text-white ${page === "/about"? "text-white": "text-3"}`} onClick={()=>setPage('/about')}>About</span></Link>
            </div>
            <div className="flex items-center"> Wikipedia Pathfinder</div>
        </div>
    )
}