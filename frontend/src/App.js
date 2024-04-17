import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";

import Navbar from './component/navbar';
import Finder from './pages/finder';

function App() {
  return (
    <Router>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Finder/>}>

        </Route>
      </Routes>
    </Router>

  );
}

export default App;
