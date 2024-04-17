import './App.css';
import React, { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:8080/')
      .then(response => response.text())
      .then(message => {
        setMessage(message);
      });
  }, []);
  return (
    <h1 className="text-3xl font-bold underline">
      {message}
    </h1>
  );
}

export default App;
