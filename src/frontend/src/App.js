import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";

import Navbar from './component/navbar';
import Finder from './pages/finder';
import About from './pages/about';

function App() {
  return (
    <Router>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Finder/>}>
        </Route>
        <Route path='/about' element={<About/>}></Route>
      </Routes>
    </Router>

  );
}

export default App;
